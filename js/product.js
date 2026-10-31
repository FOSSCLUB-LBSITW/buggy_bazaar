document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const product = PRODUCTS.find((item) => item.id === params.get("id")) || PRODUCTS[0];
  const productMain = document.getElementById("product-main");
  if (!params.has("id") || !PRODUCTS.some((item) => item.id === params.get("id"))) {
    const message = document.createElement("p");
    message.className = "empty-state";
    message.textContent = "We couldn't find that product. Explore our latest picks below.";
    productMain.prepend(message);
  } else {
    BuggyBazaar.recordProductView(product.id);
  }

  const image = document.getElementById("product-image");
  image.src = product.image;
  image.alt = product.name;
  document.getElementById("product-category").textContent = product.category;
  document.getElementById("product-name").textContent = product.name;
  document.getElementById("product-rating").textContent = `★ ${product.rating}`;
  document.getElementById("product-reviews").textContent = `(${product.reviews} reviews)`;
  document.getElementById("product-price").textContent = BuggyBazaar.formatPrice(product.price);
  document.getElementById("product-description").textContent = product.description;
  document.getElementById("product-stock").textContent = `${product.stock} in stock`;

  if (product.originalPrice > product.price) {
    const discount = Math.round((1 - product.price / product.originalPrice) * 100);
    document.getElementById("product-original-price").textContent = BuggyBazaar.formatPrice(product.originalPrice);
    document.getElementById("product-original-price").hidden = false;
    document.getElementById("product-discount").textContent = `${discount}% off`;
    document.getElementById("product-discount").hidden = false;
  }

  const quantityInput = document.getElementById("quantity-input");
  quantityInput.max = String(product.stock);
  document.getElementById("quantity-decrease").addEventListener("click", () => {
    quantityInput.value = String(Math.max(1, Number(quantityInput.value) - 1));
  });
  document.getElementById("quantity-increase").addEventListener("click", () => {
    quantityInput.value = String(Math.min(product.stock, Number(quantityInput.value) + 1));
  });
  quantityInput.addEventListener("change", () => {
    quantityInput.value = String(Math.min(product.stock, Math.max(1, Math.trunc(Number(quantityInput.value) || 1))));
  });
  document.getElementById("add-to-cart-btn").addEventListener("click", () => {
    if (BuggyBazaar.addToCart(product.id, Number(quantityInput.value))) {
      BuggyBazaar.showToast("Added to your cart");
    }
  });
  document.getElementById("buy-now-btn").addEventListener("click", () => {
    if (BuggyBazaar.addToCart(product.id, Number(quantityInput.value))) {
      window.location.href = "checkout.html";
    }
  });

  document.getElementById("related-products").replaceChildren(
    ...BuggyBazaar.getRecommendations(product.id).map(BuggyBazaar.makeProductCard)
  );

  if (product && product.id) {
    BuggyBazaar.api.getProduct(product.id).then((live) => {
      if (live) {
        document.getElementById("product-stock").textContent = `${live.stock} in stock`;
        quantityInput.max = String(live.stock);
      }
    }).catch(() => {});
  }
});
