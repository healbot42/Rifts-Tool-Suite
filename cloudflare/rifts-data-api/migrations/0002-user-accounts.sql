PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Preserve every legacy email owner as a stable account before rebuilding the
-- owned tables. Cloudflare Access will attach future sessions to these rows.
INSERT OR IGNORE INTO users(id, email, created_at, updated_at)
SELECT lower(hex(randomblob(16))), lower(owner_id), datetime('now'), datetime('now')
FROM watchlist_products
GROUP BY lower(owner_id);

INSERT OR IGNORE INTO users(id, email, created_at, updated_at)
SELECT lower(hex(randomblob(16))), lower(owner_id), datetime('now'), datetime('now')
FROM chair_settings
GROUP BY lower(owner_id);

CREATE TABLE watchlist_products_v2 (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  config_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, product_id)
);

INSERT INTO watchlist_products_v2(user_id, product_id, config_json, created_at, updated_at)
SELECT users.id, legacy.product_id, legacy.config_json, legacy.created_at, legacy.updated_at
FROM watchlist_products AS legacy
JOIN users ON users.email = lower(legacy.owner_id);

DROP TABLE watchlist_products;
ALTER TABLE watchlist_products_v2 RENAME TO watchlist_products;
CREATE INDEX watchlist_products_user ON watchlist_products(user_id, updated_at);

CREATE TABLE chair_settings_v2 (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  config_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO chair_settings_v2(user_id, config_json, updated_at)
SELECT users.id, legacy.config_json, legacy.updated_at
FROM chair_settings AS legacy
JOIN users ON users.email = lower(legacy.owner_id);

DROP TABLE chair_settings;
ALTER TABLE chair_settings_v2 RENAME TO chair_settings;

CREATE TABLE purchases_v2 (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, product_id)
);

INSERT INTO purchases_v2(user_id, product_id, quantity, updated_at)
SELECT users.id, purchases.product_id, purchases.quantity, purchases.updated_at
FROM purchases
JOIN users ON users.id = (SELECT id FROM users ORDER BY created_at LIMIT 1);

DROP TABLE purchases;
ALTER TABLE purchases_v2 RENAME TO purchases;

-- Reserved authorization model for future collaborative initiative sessions.
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS session_members (
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('owner', 'editor', 'viewer')),
  joined_at TEXT NOT NULL,
  PRIMARY KEY (session_id, user_id)
);

CREATE TABLE IF NOT EXISTS initiative_session_state (
  session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  state_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

INSERT OR IGNORE INTO schema_migrations(version, applied_at)
VALUES (2, datetime('now'));

PRAGMA foreign_keys = ON;
