-- Recovery-only rollback. Export the database before use.
-- This restores legacy email ownership while preserving current account rows.
PRAGMA foreign_keys = OFF;

CREATE TABLE watchlist_products_legacy (
  owner_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  config_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (owner_id, product_id)
);
INSERT INTO watchlist_products_legacy
SELECT users.email, products.product_id, products.config_json,
       products.created_at, products.updated_at
FROM watchlist_products AS products JOIN users ON users.id = products.user_id;
DROP TABLE watchlist_products;
ALTER TABLE watchlist_products_legacy RENAME TO watchlist_products;
CREATE INDEX watchlist_products_owner ON watchlist_products(owner_id, updated_at);

CREATE TABLE chair_settings_legacy (
  owner_id TEXT PRIMARY KEY,
  config_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
INSERT INTO chair_settings_legacy
SELECT users.email, settings.config_json, settings.updated_at
FROM chair_settings AS settings JOIN users ON users.id = settings.user_id;
DROP TABLE chair_settings;
ALTER TABLE chair_settings_legacy RENAME TO chair_settings;

CREATE TABLE purchases_legacy (
  product_id TEXT PRIMARY KEY,
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
INSERT OR REPLACE INTO purchases_legacy
SELECT product_id, quantity, updated_at FROM purchases ORDER BY updated_at;
DROP TABLE purchases;
ALTER TABLE purchases_legacy RENAME TO purchases;

DROP TABLE IF EXISTS initiative_session_state;
DROP TABLE IF EXISTS session_members;
DROP TABLE IF EXISTS sessions;
DELETE FROM schema_migrations WHERE version = 2;

PRAGMA foreign_keys = ON;
