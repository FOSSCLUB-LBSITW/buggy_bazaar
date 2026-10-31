document.addEventListener("DOMContentLoaded", () => {
  const emptyState = document.getElementById("cart-empty-state");
  const cartLayout = document.getElementById("cart-layout");
  const cartItems = document.getElementById("cart-items");
  const couponForm = document.getElementById("coupon-form");
  const couponInput = document.getElementById("coupon-input");
  const couponMessage = document.getElementById("coupon-message");

  function renderCart() {
    const cart = BuggyBazaar.getCart().filter((item) => PRODUCTS.some((product) => product.id === item.id));
    if (cart.length === 0) {
      emptyState.hidden = false;
      cartLayout.hidden = true;
      return;
    }

    emptyState.hidden = true;
    cartLayout.hidden = false;
    cartItems.replaceChildren(...cart.map((item) => {
      const product = PRODUCTS.find((entry) => entry.id === item.id);
      const row = document.createElement("article");
      row.className = "cart-item";
      row.innerHTML = `
        <img class="cart-item-image" src="${product.image}" alt="${product.name}" />
        <div class="cart-item-info">
          <span class="cart-item-category">${product.category}</span>
          <a class="cart-item-name" href="product.html?id=${encodeURIComponent(product.id)}">${product.name}</a>
          <span class="cart-item-price">${BuggyBazaar.formatPrice(product.price)} each</span>
          <div class="cart-item-controls">
            <div class="quantity-stepper" aria-label="Quantity for ${product.name}">
              <button class="quantity-btn" type="button" data-quantity-change="-1" data-id="${product.id}" aria-label="Decrease ${product.name} quantity">−</button>
              <input type="number" value="${item.quantity}" min="1" max="${product.stock}" step="1" aria-label="Quantity" data-cart-quantity="${product.id}" />
              <button class="quantity-btn" type="button" data-quantity-change="1" data-id="${product.id}" aria-label="Increase ${product.name} quantity">+</button>
            </div>
            <button type="button" class="remove-item" data-remove-item="${product.id}">Remove</button>
          </div>
        </div>
        <strong class="cart-item-total">${BuggyBazaar.formatPrice(product.price * item.quantity)}</strong>`;
      return row;
    }));

    const totals = BuggyBazaar.getTotals(cart);
    document.getElementById("summary-subtotal").textContent = BuggyBazaar.formatPrice(totals.subtotal);
    document.getElementById("summary-discount").textContent = `− ${BuggyBazaar.formatPrice(totals.discount)}`;
    document.getElementById("summary-delivery").textContent = totals.delivery ? BuggyBazaar.formatPrice(totals.delivery) : "Free";
    document.getElementById("summary-total").textContent = BuggyBazaar.formatPrice(totals.total);
    couponInput.value = BuggyBazaar.getCoupon();
  }

  function updateQuantity(productId, quantity) {
    const product = PRODUCTS.find((item) => item.id === productId);
    if (!product) return;
    const cart = BuggyBazaar.getCart();
    const item = cart.find((entry) => entry.id === productId);
    if (!item) return;
    item.quantity = Math.min(product.stock, Math.max(1, Math.trunc(quantity) || 1));
    BuggyBazaar.saveCart(cart);
    renderCart();
  }

  cartItems.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.quantityChange) {
      const item = BuggyBazaar.getCart().find((entry) => entry.id === button.dataset.id);
      if (item) updateQuantity(button.dataset.id, item.quantity + Number(button.dataset.quantityChange));
    } else if (button.dataset.removeItem) {
      BuggyBazaar.saveCart(BuggyBazaar.getCart().filter((item) => item.id !== button.dataset.removeItem));
      renderCart();
    }
  });
  cartItems.addEventListener("change", (event) => {
    const input = event.target.closest("[data-cart-quantity]");
    if (input) updateQuantity(input.dataset.cartQuantity, Number(input.value) || 1);
  });

  couponForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const code = couponInput.value.trim().toUpperCase();
    const totals = BuggyBazaar.getTotals();
    try {
      const res = await BuggyBazaar.api.validateCoupon(code, totals.subtotal);
      if (res.valid) {
        BuggyBazaar.setCoupon(code);
        couponMessage.textContent = res.message;
        couponMessage.style.color = "var(--success)";
      } else {
        BuggyBazaar.setCoupon("");
        couponMessage.textContent = res.message;
        couponMessage.style.color = "var(--danger)";
      }
    } catch {
      if (code === "SAVE10" || code === "BAZAAR10") {
        BuggyBazaar.setCoupon(code);
        couponMessage.textContent = "10% discount applied.";
        couponMessage.style.color = "var(--success)";
      } else {
        BuggyBazaar.setCoupon("");
        couponMessage.textContent = "That coupon code isn't valid.";
        couponMessage.style.color = "var(--danger)";
      }
    }
    renderCart();
  });

  renderCart();
});
