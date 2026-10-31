const BuggyBazaar = (() => {
  document.documentElement.setAttribute("data-theme", localStorage.getItem("theme") || (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

  function initTheme() {
    const btn = document.querySelector("#theme-toggle") || (() => {
      const b = document.createElement("button");
      b.id = "theme-toggle"; b.className = "theme-toggle"; b.type = "button";
      document.querySelector(".navbar-actions")?.prepend(b);
      return b;
    })();
    const setTheme = (t) => {
      document.documentElement.setAttribute("data-theme", t);
      localStorage.setItem("theme", t);
      btn.textContent = t === "dark" ? "☀️" : "🌙";
      btn.setAttribute("aria-label", `Switch to ${t === "dark" ? "light" : "dark"} mode`);
    };
    btn.onclick = () => setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
    setTheme(localStorage.getItem("theme") || (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  }
  const CART_KEY = "buggyBazaarCart";
  const COUPON_KEY = "buggyBazaarCoupon";
  const BROWSING_HISTORY_KEY = "buggyBazaarBrowsingHistory";
  const BROWSING_HISTORY_LIMIT = 20;
  const CATEGORY_HISTORY_LIMIT = 12;

  function readStorage(key, fallback) {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    try {
      return JSON.parse(saved);
    } catch (error) {
      console.error(`Unable to read ${key} from local storage.`, error);
      return fallback;
    }
  }

  function getCart() {
    const cart = readStorage(CART_KEY, []);
    return Array.isArray(cart)
      ? cart.filter((item) => item && typeof item.id === "string" && Number.isInteger(item.quantity) && item.quantity > 0)
      : [];
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCount();
  }

  function addToCart(productId, quantity = 1) {
    const product = PRODUCTS.find((item) => item.id === productId);
    if (!product) {
      console.error(`Cannot add unknown product "${productId}" to cart.`);
      return false;
    }
    const requestedQuantity = Number.isFinite(quantity) ? Math.max(1, Math.trunc(quantity)) : 1;
    const cart = getCart();
    const item = cart.find((entry) => entry.id === productId);
    if (item) item.quantity = Math.min(product.stock, item.quantity + requestedQuantity);
    else cart.push({ id: productId, quantity: Math.min(product.stock, requestedQuantity) });
    saveCart(cart);
    return true;
  }

  function updateCartCount() {
    const count = getCart().reduce((total, item) => total + item.quantity, 0);
    document.querySelectorAll("[data-cart-count]").forEach((badge) => {
      badge.textContent = String(count);
      badge.setAttribute("aria-label", `${count} ${count === 1 ? "item" : "items"} in cart`);
    });
  }

  function getCoupon() {
    return localStorage.getItem(COUPON_KEY) || "";
  }

  function setCoupon(code) {
    if (code) localStorage.setItem(COUPON_KEY, code);
    else localStorage.removeItem(COUPON_KEY);
  }

  function getBrowsingHistory() {
    const savedValue = readStorage(BROWSING_HISTORY_KEY, {});
    const saved = savedValue && typeof savedValue === "object" ? savedValue : {};
    const validProductIds = new Set(PRODUCTS.map((product) => product.id));
    const validCategories = new Set(PRODUCTS.map((product) => product.category));
    const views = Array.isArray(saved.views)
      ? saved.views.filter((id) => typeof id === "string" && validProductIds.has(id)).slice(0, BROWSING_HISTORY_LIMIT)
      : [];
    const categories = Array.isArray(saved.categories)
      ? saved.categories.filter((category) => typeof category === "string" && validCategories.has(category)).slice(0, CATEGORY_HISTORY_LIMIT)
      : [];
    return { views, categories };
  }

  function saveBrowsingHistory(history) {
    localStorage.setItem(BROWSING_HISTORY_KEY, JSON.stringify({
      views: history.views.slice(0, BROWSING_HISTORY_LIMIT),
      categories: history.categories.slice(0, CATEGORY_HISTORY_LIMIT)
    }));
  }

  function recordCategoryInterest(category) {
    if (!PRODUCTS.some((product) => product.category === category)) return;
    const history = getBrowsingHistory();
    history.categories = [category, ...history.categories.filter((item) => item !== category)];
    saveBrowsingHistory(history);
  }

  function recordBrowsingActivity(products) {
    const categories = [...new Set(products.map((product) => product.category))];
    if (categories.length === 0) return;
    const history = getBrowsingHistory();
    history.categories = [...categories, ...history.categories.filter((category) => !categories.includes(category))];
    saveBrowsingHistory(history);
  }

  function recordProductView(productId) {
    const product = PRODUCTS.find((item) => item.id === productId);
    if (!product) {
      console.error(`Cannot record view for unknown product "${productId}".`);
      return;
    }
    const history = getBrowsingHistory();
    history.views = [productId, ...history.views.filter((id) => id !== productId)];
    history.categories = [product.category, ...history.categories.filter((category) => category !== product.category)];
    saveBrowsingHistory(history);
  }

  function getRecommendations(excludedProductId = "", limit = 4) {
    const count = Number.isInteger(limit) ? Math.max(0, limit) : 4;
    if (count === 0) return [];

    const { views, categories } = getBrowsingHistory();
    const excludedIds = new Set(views);
    if (excludedProductId) excludedIds.add(excludedProductId);

    const candidates = PRODUCTS.filter((product) => product.id !== excludedProductId);
    const unseen = candidates.filter((product) => !excludedIds.has(product.id));
    const pool = unseen.length >= count ? unseen : candidates;
    const categoryRank = new Map(categories.map((category, index) => [category, categories.length - index]));

    return pool
      .sort((a, b) => {
        const viewedDifference = Number(excludedIds.has(a.id)) - Number(excludedIds.has(b.id));
        if (viewedDifference !== 0) return viewedDifference;
        const categoryDifference = (categoryRank.get(b.category) || 0) - (categoryRank.get(a.category) || 0);
        if (categoryDifference !== 0) return categoryDifference;
        const featuredDifference = Number(b.featured) - Number(a.featured);
        if (featuredDifference !== 0) return featuredDifference;
        return b.rating - a.rating;
      })
      .slice(0, count);
  }

  function getTotals(cart = getCart()) {
    const subtotal = cart.reduce((total, item) => {
      const product = PRODUCTS.find((entry) => entry.id === item.id);
      return total + (product ? product.price * item.quantity : 0);
    }, 0);
    const discount = getCoupon() ? Math.round(subtotal * 0.1) : 0;
    const delivery = subtotal === 0 || subtotal >= 999 ? 0 : 79;
    return { subtotal, discount, delivery, total: subtotal - discount + delivery };
  }

  function formatPrice(amount) {
    return `₹${Number(amount).toLocaleString("en-IN")}`;
  }

  function showToast(message) {
    const previous = document.querySelector(".toast");
    if (previous) previous.remove();
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.textContent = message;
    document.body.append(toast);
    window.setTimeout(() => toast.remove(), 2600);
  }

  function makeProductCard(product) {
    const card = document.createElement("article");
    card.className = "product-card";
    const badge = product.badge ? `<span class="product-card-badge">${product.badge}</span>` : "";
    card.innerHTML = `
      <a class="product-card-image-link" href="product.html?id=${encodeURIComponent(product.id)}" aria-label="View ${product.name}">
        <img class="product-card-image" src="${product.image}" alt="${product.name}" loading="lazy" />
        ${badge}
      </a>
      <div class="product-card-body">
        <span class="product-card-category">${product.category}</span>
        <a class="product-card-name" href="product.html?id=${encodeURIComponent(product.id)}">${product.name}</a>
        <div class="product-card-rating" aria-label="${product.rating} out of 5 stars">★ ${product.rating} <span class="product-card-reviews">(${product.reviews})</span></div>
        <div class="product-card-bottom">
          <span class="product-card-price">${formatPrice(product.price)}</span>
          <button class="product-card-add" type="button" data-add-product="${product.id}" aria-label="Add ${product.name} to cart">+</button>
        </div>
      </div>`;
    return card;
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    updateCartCount();
    const toggle = document.querySelector(".navbar-toggle");
    const menu = document.querySelector(".navbar-menu");
    if (toggle && menu) {
      toggle.addEventListener("click", () => {
        const isOpen = menu.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(isOpen));
      });
      menu.addEventListener("click", (event) => {
        if (event.target.closest("a")) {
          menu.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
        }
      });
    }
  });

  const API_BASE = (window.location.protocol.startsWith("http") ? "" : "http://localhost:3001") + "/api/v1";

  const api = {
    async getProducts(params = {}) {
      const q = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE}/products${q ? `?${q}` : ""}`);
      if (!res.ok) throw new Error("Failed to fetch products");
      const json = await res.json();
      return json.data;
    },
    async getProduct(id) {
      const res = await fetch(`${API_BASE}/products/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error("Product not found");
      const json = await res.json();
      return json.data;
    },
    async getCategories() {
      const res = await fetch(`${API_BASE}/categories`);
      if (!res.ok) throw new Error("Failed to fetch categories");
      const json = await res.json();
      return json.data;
    },
    async validateCoupon(code, subtotal) {
      const res = await fetch(`${API_BASE}/coupons/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal }),
      });
      const json = await res.json();
      return json.data || json;
    },
    async checkout(orderData) {
      const res = await fetch(`${API_BASE}/orders/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Checkout failed");
      return json.data;
    },
    async getOrder(id) {
      const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error("Order not found");
      const json = await res.json();
      return json.data;
    },
    async syncCatalog() {
      try {
        const items = await api.getProducts({ limit: 100 });
        if (Array.isArray(items) && items.length > 0 && typeof PRODUCTS !== "undefined") {
          PRODUCTS.splice(0, PRODUCTS.length, ...items);
          return items;
        }
      } catch (e) {
        console.warn("API sync skipped, falling back to static catalog:", e.message);
      }
      return typeof PRODUCTS !== "undefined" ? PRODUCTS : [];
    }
  };

  return {
    addToCart, getBrowsingHistory, getRecommendations, initTheme, formatPrice, getCart, getCoupon,
    getTotals, makeProductCard, recordBrowsingActivity, recordCategoryInterest, recordProductView,
    saveCart, setCoupon, showToast, api
  };
})();
