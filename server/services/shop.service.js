'use strict';
const repo = require('../repositories/db.repo');
const pool = require('../config/db');
const crypto = require('crypto');

/* ── Products ─────────────────────────────────── */
async function listProducts(query) {
  return repo.findProducts(query);
}

async function getProduct(id) {
  return repo.findProductById(id);
}

/* ── Categories ───────────────────────────────── */
async function listCategories() {
  return repo.findCategories();
}

/* ── Coupons ──────────────────────────────────── */
async function validateCoupon(code, subtotal) {
  if (!code) return { valid: false, message: 'No coupon code provided.' };
  const coupon = await repo.findCoupon(code);
  if (!coupon)              return { valid: false, message: "That coupon code isn't valid." };
  if (subtotal < coupon.min_subtotal)
    return { valid: false, message: `Minimum order of ₹${coupon.min_subtotal} required.` };

  let discount = Math.round(subtotal * coupon.discount_percent / 100);
  if (coupon.max_discount) discount = Math.min(discount, coupon.max_discount);

  return { valid: true, discount_percent: coupon.discount_percent, discount, message: `${coupon.discount_percent}% discount applied.` };
}

/* ── Checkout (ACID transaction) ──────────────── */
async function processCheckout(body) {
  const { customer_name, email, phone, shipping_address, payment_method, coupon_code, items } = body;

  if (!Array.isArray(items) || items.length === 0) throw Object.assign(new Error('Cart is empty.'), { status: 400 });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    /* 1. lock rows for the ordered products */
    const productIds = [...new Set(items.map(i => i.product_id))];
    const dbProducts = await repo.lockAndGetStock(conn, productIds);
    const productMap = new Map(dbProducts.map(p => [p.id, p]));

    /* 2. validate stock and build order items */
    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      const product = productMap.get(item.product_id);
      if (!product) throw Object.assign(new Error(`Product "${item.product_id}" not found.`), { status: 400 });
      const qty = Math.max(1, Math.trunc(Number(item.quantity) || 1));
      if (product.stock < qty) throw Object.assign(new Error(`"${item.product_id}" has insufficient stock (available: ${product.stock}).`), { status: 409 });
      subtotal += product.price * qty;
      orderItems.push({ product_id: item.product_id, quantity: qty, price_at_purchase: product.price });
    }

    /* 3. server-side coupon validation */
    let discount = 0;
    if (coupon_code) {
      const result = await validateCoupon(coupon_code, subtotal);
      if (result.valid) discount = result.discount;
    }

    const delivery_fee = subtotal === 0 || subtotal >= 999 ? 0 : 79;
    const total_amount = subtotal - discount + delivery_fee;

    /* 4. insert order */
    const orderId = `BB-${new Date().getFullYear()}-${crypto.randomInt(10000, 99999)}`;
    await repo.createOrder(conn, {
      id: orderId, customer_name, email, phone, shipping_address,
      subtotal, discount, delivery_fee, total_amount, payment_method,
    });

    /* 5. insert order items */
    const enrichedItems = orderItems.map(i => ({ ...i, order_id: orderId }));
    await repo.createOrderItems(conn, enrichedItems);

    /* 6. decrement stock */
    for (const item of orderItems) {
      await repo.decrementStock(conn, item.product_id, item.quantity);
    }

    await conn.commit();
    return { order_id: orderId, total_amount, subtotal, discount, delivery_fee };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/* ── Order receipt ────────────────────────────── */
async function getOrder(id) {
  return repo.findOrderById(id);
}

module.exports = { listProducts, getProduct, listCategories, validateCoupon, processCheckout, getOrder };
