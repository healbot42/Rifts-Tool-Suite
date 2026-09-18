CREATE TABLE IF NOT EXISTS deal_observations (
  source TEXT NOT NULL,
  source_listing_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  delivered_price TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  image_url TEXT,
  ends_at TEXT,
  available INTEGER NOT NULL,
  PRIMARY KEY (source, source_listing_id, observed_at)
);

CREATE INDEX IF NOT EXISTS deal_observations_product_time
ON deal_observations(product_id, observed_at);

CREATE TABLE IF NOT EXISTS purchases (
  product_id TEXT PRIMARY KEY,
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS watchlist_products (
  owner_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  config_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (owner_id, product_id)
);

CREATE INDEX IF NOT EXISTS watchlist_products_owner
ON watchlist_products(owner_id, updated_at);

CREATE TABLE IF NOT EXISTS chair_settings (
  owner_id TEXT PRIMARY KEY,
  config_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
