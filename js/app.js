document.addEventListener("DOMContentLoaded", () => {
  const featuredGrid = document.getElementById("featured-products");
  const productGrid = document.getElementById("product-grid");
  const searchInput = document.getElementById("search-input");
  const sortSelect = document.getElementById("sort-select");
  const emptyState = document.getElementById("empty-state");
  let activeCategory = "All";

  PRODUCTS.filter((product) => product.featured).forEach((product) => {
    featuredGrid.append(BuggyBazaar.makeProductCard(product));
  });

  document.querySelectorAll("[data-category-count]").forEach((count) => {
    const category = count.dataset.categoryCount;
    const amount = PRODUCTS.filter((product) => product.category === category).length;
    count.textContent = `${amount} items`;
  });

  function renderProducts() {
    const query = searchInput.value.trim().toLowerCase();
    const products = PRODUCTS.filter((product) => {
      const matchesCategory = activeCategory === "All" || product.category === activeCategory;
      const matchesQuery = `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });

    switch (sortSelect.value) {
      case "price-asc": products.sort((a, b) => a.price - b.price); break;
      case "price-desc": products.sort((a, b) => b.price - a.price); break;
      case "rating": products.sort((a, b) => b.rating - a.rating); break;
      case "name": products.sort((a, b) => a.name.localeCompare(b.name)); break;
      default: products.sort((a, b) => Number(b.featured) - Number(a.featured));
    }

    productGrid.replaceChildren(...products.map(BuggyBazaar.makeProductCard));
    emptyState.hidden = products.length > 0;
  }

  function setCategory(category) {
    activeCategory = category;
    document.querySelectorAll(".filter-pill").forEach((pill) => {
      const active = pill.dataset.category === category;
      pill.classList.toggle("filter-pill-active", active);
      pill.setAttribute("aria-pressed", String(active));
    });
    renderProducts();
  }

  document.querySelectorAll(".filter-pill").forEach((pill) => {
    pill.addEventListener("click", () => setCategory(pill.dataset.category));
  });
  document.querySelectorAll(".category-card").forEach((card) => {
    card.addEventListener("click", () => {
      setCategory(card.dataset.category);
      document.getElementById("shop").scrollIntoView({ behavior: "smooth" });
    });
  });
  searchInput.addEventListener("input", renderProducts);
  sortSelect.addEventListener("change", renderProducts);
  document.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add-product]");
    if (!addButton) return;
    if (BuggyBazaar.addToCart(addButton.dataset.addProduct)) {
      BuggyBazaar.showToast("Added to your cart");
    }
  });

  renderProducts();
});
