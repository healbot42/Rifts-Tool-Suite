import sqlite3
from pathlib import Path


def test_user_account_migration_preserves_legacy_deal_bot_data():
    connection = sqlite3.connect(":memory:")
    connection.executescript(
        """
        CREATE TABLE watchlist_products (
          owner_id TEXT NOT NULL, product_id TEXT NOT NULL, config_json TEXT NOT NULL,
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
          PRIMARY KEY (owner_id, product_id));
        CREATE INDEX watchlist_products_owner
          ON watchlist_products(owner_id, updated_at);
        CREATE TABLE chair_settings (
          owner_id TEXT PRIMARY KEY, config_json TEXT NOT NULL, updated_at TEXT NOT NULL);
        CREATE TABLE purchases (
          product_id TEXT PRIMARY KEY, quantity INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL);
        INSERT INTO watchlist_products VALUES
          ('Owner@Example.com', 'possessed', '{}', 'created', 'updated');
        INSERT INTO chair_settings VALUES
          ('Owner@Example.com', '{"enabled":true}', 'updated');
        INSERT INTO purchases VALUES ('possessed', 2, 'updated');
        """
    )
    migration = (
        Path(__file__).parents[2]
        / "cloudflare"
        / "rifts-data-api"
        / "migrations"
        / "0002-user-accounts.sql"
    ).read_text(encoding="utf-8")
    connection.executescript(migration)

    user = connection.execute("SELECT id, email FROM users").fetchone()
    assert user is not None
    assert user[1] == "owner@example.com"
    assert connection.execute(
        "SELECT product_id FROM watchlist_products WHERE user_id=?", (user[0],)
    ).fetchone() == ("possessed",)
    assert connection.execute(
        "SELECT config_json FROM chair_settings WHERE user_id=?", (user[0],)
    ).fetchone() == ('{"enabled":true}',)
    assert connection.execute(
        "SELECT quantity FROM purchases WHERE user_id=?", (user[0],)
    ).fetchone() == (2,)
    assert connection.execute(
        "SELECT version FROM schema_migrations WHERE version=2"
    ).fetchone() == (2,)


def test_observation_retention_migration_adds_timestamp_index():
    connection = sqlite3.connect(":memory:")
    connection.executescript(
        """
        CREATE TABLE schema_migrations (
          version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
        CREATE TABLE deal_observations (
          observed_at TEXT NOT NULL);
        """
    )
    migration = (
        Path(__file__).parents[2]
        / "cloudflare"
        / "rifts-data-api"
        / "migrations"
        / "0003-observation-retention-index.sql"
    ).read_text(encoding="utf-8")
    connection.executescript(migration)

    query_plan = connection.execute(
        """EXPLAIN QUERY PLAN DELETE FROM deal_observations
        WHERE julianday(observed_at) < julianday(?)""",
        ("2026-08-16T12:00:00.000Z",),
    ).fetchall()
    assert any(
        "deal_observations_observed_at_jd" in detail
        for *_, detail in query_plan
    )
    assert connection.execute(
        "SELECT version FROM schema_migrations WHERE version=3"
    ).fetchone() == (3,)
