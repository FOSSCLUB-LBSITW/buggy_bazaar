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

  return { addToCart, initTheme, formatPrice, getCart, getCoupon, getTotals, makeProductCard, saveCart, setCoupon, showToast };
})();
