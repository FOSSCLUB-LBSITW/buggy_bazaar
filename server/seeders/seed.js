'use strict';
/* ──────────────────────────────────────────────────
   Seeder: reads products.js and inserts into MySQL
   Run via:  npm run db:seed
────────────────────────────────────────────────── */
require('dotenv').config();
const pool = require('../config/db');

/* ---- raw product data (mirrors js/products.js) ---- */
const CATEGORIES = [
  { name: 'Electronics', slug: 'electronics', icon: '💻' },
  { name: 'Fashion',     slug: 'fashion',     icon: '👗' },
  { name: 'Books',       slug: 'books',       icon: '📚' },
  { name: 'Accessories', slug: 'accessories', icon: '👜' },
  { name: 'Home',        slug: 'home',        icon: '🏠' },
];

const PRODUCTS = [
  { id:'soundcore-headphones', category:'Electronics', name:'Soundcore Wireless Headphones',  price:3499, originalPrice:4999, rating:4.8, reviews:124, badge:'Bestseller',        stock:18, image:'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85', description:'Enjoy immersive sound wherever the day takes you. These comfortable wireless headphones deliver rich audio, reliable Bluetooth connectivity and a long-lasting battery.' },
  { id:'everyday-sneakers',    category:'Fashion',     name:'Everyday Canvas Sneakers',        price:1899, originalPrice:2499, rating:4.6, reviews:86,  badge:'Popular',            stock:24, image:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85', description:'A lightweight everyday sneaker with a clean, versatile silhouette. Made for comfortable commutes, weekend plans and everything in between.' },
  { id:'mindful-mornings',     category:'Books',       name:'The Art of Mindful Mornings',     price:499,  originalPrice:699,  rating:4.7, reviews:52,  badge:"Editor's pick",     stock:32, image:'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=900&q=85', description:'A thoughtful guide to building calmer routines and making space for the things that matter. A lovely addition to your reading shelf or a considered gift.' },
  { id:'everyday-backpack',    category:'Accessories', name:'Metro Everyday Backpack',          price:1299, originalPrice:1799, rating:4.5, reviews:73,  badge:'Customer favorite',  stock:15, image:'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85', description:'Keep your day organized with a practical, roomy backpack designed for daily essentials. Its understated look works just as well for work as it does for a day out.' },
  { id:'ceramic-coffee-set',   category:'Home',        name:'Minimal Ceramic Coffee Set',       price:899,  originalPrice:1199, rating:4.4, reviews:41,  badge:null,                 stock:20, image:'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=85', description:'Bring a little ritual to your coffee break with a simple ceramic set in a timeless finish. Designed to feel right at home on your kitchen table.' },
  { id:'studio-speaker',       category:'Electronics', name:'Studio Bluetooth Speaker',         price:2299, originalPrice:2999, rating:4.6, reviews:67,  badge:null,                 stock:12, image:'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=85', description:'Fill your room with clear, balanced sound from a compact wireless speaker. Easy to pair and simple to bring along from one room to another.' },
  { id:'classic-cotton-shirt', category:'Fashion',     name:'Classic Cotton Shirt',             price:1099, originalPrice:1499, rating:4.3, reviews:38,  badge:null,                 stock:28, image:'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85', description:'An easy-to-style cotton essential with a comfortable feel and an everyday fit. Wear it on its own or layer it through the seasons.' },
  { id:'creative-notebook',    category:'Books',       name:'Ideas & Notes Journal',            price:349,  originalPrice:499,  rating:4.8, reviews:95,  badge:null,                 stock:44, image:'https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=900&q=85', description:'A dependable notebook for plans, sketches, lists and the ideas you do not want to forget. A clean, simple companion for your desk or bag.' },
  { id:'insulated-bottle',     category:'Accessories', name:'Trail Insulated Bottle',           price:749,  originalPrice:999,  rating:4.5, reviews:58,  badge:null,                 stock:36, image:'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=85', description:'A reusable bottle that is ready for busy mornings and weekend adventures. Its sturdy design makes it an easy everyday hydration companion.' },
  { id:'soft-throw',           category:'Home',        name:'Woven Cotton Throw',               price:1599, originalPrice:1999, rating:4.7, reviews:29,  badge:null,                 stock:10, image:'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=85', description:'Add warmth and texture to your favorite corner with a soft woven throw. A versatile finishing touch for a sofa, reading chair or bedroom.' },
];

const COUPONS = [
  { code: 'SAVE10',    discount_percent: 10, min_subtotal: 0,   max_discount: null, is_active: true, expires_at: null },
  { code: 'BAZAAR10',  discount_percent: 10, min_subtotal: 0,   max_discount: null, is_active: true, expires_at: null },
  { code: 'MEGA20',    discount_percent: 20, min_subtotal: 999, max_discount: 500,  is_active: true, expires_at: null },
];

async function seed() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    /* categories */
    const catMap = new Map();
    for (const c of CATEGORIES) {
      const [rows] = await conn.execute(
        `INSERT INTO categories (name, slug, icon) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
        [c.name, c.slug, c.icon]
      );
      const [row] = await conn.execute('SELECT id FROM categories WHERE name=?', [c.name]);
      catMap.set(c.name, row[0].id);
      console.log(`  ✓ category: ${c.name}`);
    }

    /* products */
    for (const p of PRODUCTS) {
      await conn.execute(
        `INSERT INTO products (id, category_id, name, price, original_price, stock, rating, reviews_count, badge, image_url, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE stock=VALUES(stock), price=VALUES(price)`,
        [p.id, catMap.get(p.category), p.name, p.price, p.originalPrice,
         p.stock, p.rating, p.reviews, p.badge || null, p.image, p.description]
      );
      console.log(`  ✓ product: ${p.id}`);
    }

    /* coupons */
    for (const c of COUPONS) {
      await conn.execute(
        `INSERT INTO coupons (code, discount_percent, min_subtotal, max_discount, is_active, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE discount_percent=VALUES(discount_percent)`,
        [c.code, c.discount_percent, c.min_subtotal, c.max_discount, c.is_active, c.expires_at]
      );
      console.log(`  ✓ coupon: ${c.code}`);
    }

    await conn.commit();
    console.log('\n✅  Seeding complete.\n');
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
    await pool.end();
  }
}

seed().catch(err => { console.error('Seeding failed:', err.message); process.exit(1); });
