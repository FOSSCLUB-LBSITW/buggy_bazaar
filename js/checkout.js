document.addEventListener("DOMContentLoaded", () => {
  const cart = BuggyBazaar.getCart().filter((item) => PRODUCTS.some((product) => product.id === item.id));
  if (cart.length === 0) {
    window.location.replace("cart.html");
    return;
  }

  const form = document.getElementById("checkout-form");
  const paymentRadios = document.querySelectorAll('input[name="payment-method"]');
  const upiFields = document.getElementById("upi-fields");
  const cardFields = document.getElementById("card-fields");
  const errorFields = {
    "full-name": "error-name",
    email: "error-email",
    phone: "error-phone",
    address: "error-address",
    city: "error-city",
    state: "error-state",
    pincode: "error-pincode"
  };

  function updatePaymentFields() {
    const method = form.querySelector('input[name="payment-method"]:checked').value;
    upiFields.hidden = method !== "upi";
    cardFields.hidden = method !== "card";
  }

  paymentRadios.forEach((radio) => radio.addEventListener("change", updatePaymentFields));
  updatePaymentFields();

  document.getElementById("checkout-items").replaceChildren(...cart.map((item) => {
    const product = PRODUCTS.find((entry) => entry.id === item.id);
    const row = document.createElement("div");
    row.className = "checkout-item";
    row.innerHTML = `
      <img src="${product.image}" alt="" />
      <div><span class="checkout-item-name">${product.name}</span><span class="checkout-item-qty">Qty ${item.quantity}</span></div>
      <span class="checkout-item-price">${BuggyBazaar.formatPrice(product.price * item.quantity)}</span>`;
    return row;
  }));
  const totals = BuggyBazaar.getTotals(cart);
  document.getElementById("checkout-subtotal").textContent = BuggyBazaar.formatPrice(totals.subtotal);
  document.getElementById("checkout-discount").textContent = `− ${BuggyBazaar.formatPrice(totals.discount)}`;
  document.getElementById("checkout-delivery").textContent = totals.delivery ? BuggyBazaar.formatPrice(totals.delivery) : "Free";
  document.getElementById("checkout-total").textContent = BuggyBazaar.formatPrice(totals.total);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    let firstInvalid = null;
    Object.entries(errorFields).forEach(([inputId, errorId]) => {
      const input = document.getElementById(inputId);
      const error = document.getElementById(errorId);
      let message = "";
      if (!input.value.trim()) message = "This field is required.";
      else if (inputId === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim())) message = "Enter a valid email address.";
      else if (inputId === "phone" && input.value.replace(/\D/g, "").length !== 10) message = "Enter a 10-digit phone number.";
      else if (inputId === "pincode" && !/^\d{6}$/.test(input.value.trim())) message = "Enter a valid 6-digit PIN code.";
      error.textContent = message;
      input.setAttribute("aria-invalid", String(Boolean(message)));
      if (message && !firstInvalid) firstInvalid = input;
    });

    const method = form.querySelector('input[name="payment-method"]:checked').value;
    if (method === "upi") {
      const upi = document.getElementById("upi-id");
      if (!/^[\w.-]+@[\w.-]+$/.test(upi.value.trim())) {
        upi.setCustomValidity("Enter a valid UPI ID.");
        upi.reportValidity();
        if (!firstInvalid) firstInvalid = upi;
      } else upi.setCustomValidity("");
    } else if (method === "card") {
      const number = document.getElementById("card-number");
      const expiry = document.getElementById("card-expiry");
      const cvv = document.getElementById("card-cvv");
      const digits = number.value.replace(/\D/g, "");
      if (digits.length < 13 || digits.length > 19) {
        number.setCustomValidity("Enter a valid card number.");
        number.reportValidity();
        if (!firstInvalid) firstInvalid = number;
      } else number.setCustomValidity("");

      const match = expiry.value.trim().match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
      if (!match) {
        expiry.setCustomValidity("Enter expiry as MM/YY.");
        expiry.reportValidity();
        if (!firstInvalid) firstInvalid = expiry;
      } else {
        const month = Number(match[1]);
        const year = 2000 + Number(match[2]);
        const now = new Date();
        expiry.setCustomValidity(year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1) ? "This card has expired." : "");
        if (expiry.validationMessage) {
          expiry.reportValidity();
          if (!firstInvalid) firstInvalid = expiry;
        }
      }

      if (!/^\d{3,4}$/.test(cvv.value.trim())) {
        cvv.setCustomValidity("Enter a valid 3 or 4 digit CVV.");
        cvv.reportValidity();
        if (!firstInvalid) firstInvalid = cvv;
      } else cvv.setCustomValidity("");
    }

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    const orderId = `BB-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    sessionStorage.setItem("buggyBazaarLastOrder", orderId);
    BuggyBazaar.saveCart([]);
    BuggyBazaar.setCoupon("");
    window.location.href = "success.html";
  });
});
