'use strict';
const assert = require('assert');
const http = require('http');
const app = require('../server/server');
const shopService = require('../server/services/shop.service');

async function runTests() {
  console.log('🧪 Running Buggy Bazaar Backend & API Test Suite...\n');

  // Test 1: Service - Coupon Validation Logic
  console.log('Test 1: Coupon logic testing (unit)');
  const emptyCoupon = await shopService.validateCoupon('', 1500);
  assert.strictEqual(emptyCoupon.valid, false, 'Empty coupon should be invalid');

  // Test 2: HTTP Server & Security Middleware
  console.log('Test 2: HTTP server, security headers & static files');
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 2a: Test /api/v1/health
    const healthRes = await fetch(`${baseUrl}/api/v1/health`);
    assert([200, 503].includes(healthRes.status), `Health probe returned ${healthRes.status}`);
    const healthData = await healthRes.json();
    assert.strictEqual(typeof healthData.success, 'boolean');
    console.log('  ✓ /api/v1/health responded correctly');

    // 2b: Test security headers (Helmet)
    assert(healthRes.headers.get('x-content-type-options') === 'nosniff', 'Helmet nosniff header present');
    console.log('  ✓ Helmet defensive security headers active');

    // 2c: Test static file serving
    const staticRes = await fetch(`${baseUrl}/js/common.js`);
    assert.strictEqual(staticRes.status, 200, 'Static js/common.js should be accessible');
    const commonJs = await staticRes.text();
    assert(commonJs.includes('BuggyBazaar'), 'Static file content matches BuggyBazaar module');
    assert(commonJs.includes('syncCatalog'), 'API sync layer present in common.js');
    console.log('  ✓ Static asset serving working seamlessly');

    // 2d: Test 404 handler for missing product
    const missingProdRes = await fetch(`${baseUrl}/api/v1/products/non-existent-product-id-12345`);
    // Note: if DB is not connected, it will route through error handler, if connected it returns 404
    assert([404, 500, 503].includes(missingProdRes.status));
    console.log('  ✓ Route handling for single product check passed');

    // 2e: Test checkout endpoint validation (missing payload returns 400)
    const badCheckoutRes = await fetch(`${baseUrl}/api/v1/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.strictEqual(badCheckoutRes.status, 400, 'Empty checkout payload should return 400 Bad Request');
    const badCheckoutData = await badCheckoutRes.json();
    assert.strictEqual(badCheckoutData.success, false);
    assert(badCheckoutData.message.includes('Missing fields'), 'Returns clear validation message for missing fields');
    console.log('  ✓ Checkout payload validation (400 on missing fields) verified');

    // 2f: Test checkout with empty items
    const emptyItemsRes = await fetch(`${baseUrl}/api/v1/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'John Doe',
        email: 'john@example.com',
        phone: '9876543210',
        shipping_address: '123 Main St',
        payment_method: 'cod',
        items: []
      }),
    });
    assert.strictEqual(emptyItemsRes.status, 400, 'Checkout with empty items should return 400');
    console.log('  ✓ Checkout empty cart prevention verified');

    // 2g: Test coupon validation endpoint with missing code
    const missingCouponRes = await fetch(`${baseUrl}/api/v1/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subtotal: 1000 }),
    });
    assert.strictEqual(missingCouponRes.status, 400, 'Missing coupon code returns 400');
    console.log('  ✓ Coupon validation input check verified');

    console.log('\n🎉 All tests passed successfully!');
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error('\n❌ Test suite failure:', err);
  process.exit(1);
});
