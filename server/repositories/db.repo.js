'use strict';
const pool = require('../config/db');

/* ── Products ─────────────────────────────────── */
async function findProducts({ category, search, sort, page = 1, limit = 20 }) {
  const params = [];
  let where = 'WHERE 1=1';

  if (category) {
    where += ' AND c.slug = ?';
    params.push(category);
  }
  if (search) {
    where += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const orderMap = {
    'price_asc':  'p.price ASC',
    'price_desc': 'p.price DESC',
    'rating':     'p.rating DESC',
    'name':       'p.name ASC',
  };
  const ORDER = orderMap[sort] || 'p.id ASC';

  const offset = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
  params.push(Number(limit), offset);

  const [rows] = await pool.execute(
    `SELECT p.id, p.name, p.price, p.original_price, p.stock, p.rating,
            p.reviews_count AS reviews, p.badge, p.image_url AS image,
            p.description, c.name AS category, c.slug AS category_slug
     FROM products p JOIN categories c ON c.id = p.category_id
     ${where} ORDER BY ${ORDER} LIMIT ? OFFSET ?`,
    params
  );
  return rows;
}

async function findProductById(id) {
  const [rows] = await pool.execute(
    `SELECT p.id, p.name, p.price, p.original_price, p.stock, p.rating,
            p.reviews_count AS reviews, p.badge, p.image_url AS image,
            p.description, c.name AS category, c.slug AS category_slug
     FROM products p JOIN categories c ON c.id = p.category_id
     WHERE p.id = ?`,
    [id]
  );
  return rows[0] || null;
}

/* ── Categories ───────────────────────────────── */
async function findCategories() {
  const [rows] = await pool.execute(
    `SELECT c.id, c.name, c.slug, c.icon,
            COUNT(p.id) AS item_count
     FROM categories c LEFT JOIN products p ON p.category_id = c.id
     GROUP BY c.id ORDER BY c.name`
  );
  return rows;
}

/* ── Coupons ──────────────────────────────────── */
async function findCoupon(code) {
  const [rows] = await pool.execute(
    `SELECT * FROM coupons WHERE code = ? AND is_active = TRUE
       AND (expires_at IS NULL OR expires_at > NOW())`,
    [code.toUpperCase()]
  );
  return rows[0] || null;
}

/* ── Orders ───────────────────────────────────── */
async function createOrder(conn, order) {
  await conn.execute(
    `INSERT INTO orders (id, customer_name, email, phone, shipping_address,
       subtotal, discount, delivery_fee, total_amount, payment_method, order_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
    [order.id, order.customer_name, order.email, order.phone, order.shipping_address,
     order.subtotal, order.discount, order.delivery_fee, order.total_amount, order.payment_method]
  );
}

async function createOrderItems(conn, items) {
  if (!items.length) return;
  const placeholders = items.map(() => '(?,?,?,?)').join(',');
  const values = items.flatMap(i => [i.order_id, i.product_id, i.quantity, i.price_at_purchase]);
  await conn.execute(
    `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES ${placeholders}`,
    values
  );
}

async function findOrderById(id) {
  const [[order]] = await pool.execute('SELECT * FROM orders WHERE id = ?', [id]);
  if (!order) return null;
  const [items] = await pool.execute(
    `SELECT oi.*, p.name, p.image_url AS image
     FROM order_items oi JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ?`,
    [id]
  );
  return { ...order, items };
}

/* ── Stock (called inside transaction) ─────────── */
async function lockAndGetStock(conn, productIds) {
  const placeholders = productIds.map(() => '?').join(',');
  const [rows] = await conn.execute(
    `SELECT id, price, stock FROM products WHERE id IN (${placeholders}) FOR UPDATE`,
    productIds
  );
  return rows;
}

async function decrementStock(conn, productId, qty) {
  await conn.execute(
    'UPDATE products SET stock = stock - ? WHERE id = ?',
    [qty, productId]
  );
}

module.exports = {
  findProducts, findProductById,
  findCategories,
  findCoupon,
  createOrder, createOrderItems, findOrderById,
  lockAndGetStock, decrementStock,
};
