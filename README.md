# Buggy Bazaar 🛒

**Shop smart.**

Buggy Bazaar is a responsive, browser-based demo storefront built with HTML, CSS, and vanilla JavaScript.

## Run locally

No package installation or build step is required. From the project directory, start a static web server:

```sh
python -m http.server 8000
```

Then open `http://localhost:8000` in a browser. The product catalog is in `js/products.js`; cart and coupon data use browser LocalStorage, and the most recent order ID uses SessionStorage. The demo coupon codes `SAVE10` and `BAZAAR10` apply a 10% discount.

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Browser LocalStorage / SessionStorage





