# Buggy Bazaar 🛒

**Shop smart.**

Buggy Bazaar is a responsive, browser-based demo storefront built with HTML, CSS, and vanilla JavaScript.

## Run locally

No package installation or build step is required. From the project directory, start a static web server:

```sh
python -m http.server 8000
```

Then open `http://localhost:8000` in a browser. The product catalog is in `js/products.js`; cart, coupon, and browsing history use browser LocalStorage, and the most recent order ID uses SessionStorage. Product views, category selections, and search results inform recommendations on the homepage and product pages. Recommendations fall back to featured and highly rated products when browsing history is unavailable. The demo coupon codes `SAVE10` and `BAZAAR10` apply a 10% discount.

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Browser LocalStorage / SessionStorage




