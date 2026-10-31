'use strict';
const svc = require('../services/shop.service');
const pool = require('../config/db');

/* ── GET /api/v1/products ─────────────────────── */
async function getProducts(req, res, next) {
  try {
    const products = await svc.listProducts(req.query);
    res.json({ success: true, data: products });
  } catch (err) { next(err); }
}

/* ── GET /api/v1/products/:id ─────────────────── */
async function getProduct(req, res, next) {
  try {
    const product = await svc.getProduct(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
}

/* ── GET /api/v1/categories ──────────────────── */
async function getCategories(req, res, next) {
  try {
    const categories = await svc.listCategories();
    res.json({ success: true, data: categories });
  } catch (err) { next(err); }
}

/* ── POST /api/v1/coupons/validate ───────────── */
async function validateCoupon(req, res, next) {
  try {
    const { code, subtotal = 0 } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'code is required.' });
    const result = await svc.validateCoupon(code, Number(subtotal));
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

/* ── POST /api/v1/orders/checkout ────────────── */
async function checkout(req, res, next) {
  try {
    const required = ['customer_name', 'email', 'phone', 'shipping_address', 'payment_method', 'items'];
    const missing = required.filter(k => !req.body[k]);
    if (missing.length) return res.status(400).json({ success: false, message: `Missing fields: ${missing.join(', ')}` });
    const result = await svc.processCheckout(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
}

/* ── GET /api/v1/orders/:id ──────────────────── */
async function getOrder(req, res, next) {
  try {
    const order = await svc.getOrder(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
}

/* ── GET /api/v1/health ──────────────────────── */
async function health(req, res, next) {
  try {
    await pool.execute('SELECT 1');
    res.json({ success: true, status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(503).json({ success: false, status: 'error', db: 'disconnected' });
  }
}

module.exports = { getProducts, getProduct, getCategories, validateCoupon, checkout, getOrder, health };
