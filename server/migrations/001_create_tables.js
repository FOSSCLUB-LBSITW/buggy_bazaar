'use strict';
/* ──────────────────────────────────────────────────
   Migration: create tables, indexes, and constraints
   Run via:  npm run db:migrate
────────────────────────────────────────────────── */
require('dotenv').config();
const pool = require('../config/db');

const TABLES = [
  /* 1. categories */
  `CREATE TABLE IF NOT EXISTS categories (
     id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
     name       VARCHAR(100) NOT NULL UNIQUE,
     slug       VARCHAR(100) NOT NULL UNIQUE,
     icon       VARCHAR(50)  NOT NULL,
     created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
     INDEX idx_slug (slug)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  /* 2. products */
  `CREATE TABLE IF NOT EXISTS products (
     id             VARCHAR(64)     PRIMARY KEY,
     category_id    INT UNSIGNED    NOT NULL,
     name           VARCHAR(255)    NOT NULL,
     price          INT UNSIGNED    NOT NULL,
     original_price INT UNSIGNED    NOT NULL DEFAULT 0,
     stock          INT UNSIGNED    NOT NULL DEFAULT 0,
     rating         DECIMAL(2,1)    NOT NULL DEFAULT 0.0,
     reviews_count  INT UNSIGNED    NOT NULL DEFAULT 0,
     badge          VARCHAR(50)         NULL,
     image_url      VARCHAR(500)    NOT NULL,
     description    TEXT,
     created_at     TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
     updated_at     TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE CASCADE,
     INDEX idx_category_price (category_id, price)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  /* 3. coupons */
  `CREATE TABLE IF NOT EXISTS coupons (
     id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
     code             VARCHAR(30)   NOT NULL UNIQUE,
     discount_percent TINYINT UNSIGNED NOT NULL,
     min_subtotal     INT UNSIGNED  NOT NULL DEFAULT 0,
     max_discount     INT UNSIGNED      NULL,
     is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
     expires_at       TIMESTAMP         NULL,
     INDEX idx_code (code)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  /* 4. orders */
  `CREATE TABLE IF NOT EXISTS orders (
     id               VARCHAR(64)   PRIMARY KEY,
     customer_name    VARCHAR(255)  NOT NULL,
     email            VARCHAR(255)  NOT NULL,
     phone            VARCHAR(30)   NOT NULL,
     shipping_address TEXT          NOT NULL,
     subtotal         INT UNSIGNED  NOT NULL,
     discount         INT UNSIGNED  NOT NULL DEFAULT 0,
     delivery_fee     INT UNSIGNED  NOT NULL DEFAULT 0,
     total_amount     INT UNSIGNED  NOT NULL,
     payment_method   VARCHAR(50)   NOT NULL,
     order_status     ENUM('pending','confirmed','shipped','cancelled') DEFAULT 'confirmed',
     created_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
     INDEX idx_email (email),
     INDEX idx_created (created_at)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  /* 5. order_items */
  `CREATE TABLE IF NOT EXISTS order_items (
     id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
     order_id          VARCHAR(64)  NOT NULL,
     product_id        VARCHAR(64)  NOT NULL,
     quantity          INT UNSIGNED NOT NULL,
     price_at_purchase INT UNSIGNED NOT NULL,
     CONSTRAINT fk_items_order   FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
     CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products(id)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

async function migrate() {
  const conn = await pool.getConnection();
  try {
    for (const sql of TABLES) {
      await conn.execute(sql);
      const tableName = (sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/) || [])[1];
      console.log(`  ✓ ${tableName}`);
    }
    console.log('\n✅  Migration complete.\n');
  } finally {
    conn.release();
    await pool.end();
  }
}

migrate().catch(err => { console.error('Migration failed:', err.message); process.exit(1); });
