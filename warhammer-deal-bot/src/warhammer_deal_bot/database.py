"""SQLite persistence, deduplication, observations, alerts, and reports."""

import json
import os
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from pathlib import Path

from .models import Condition, Listing
from .security import sanitize_raw_metadata

SCHEMA_VERSION = 1


class Database:
    def __init__(self, path: Path):
        self.path = path
        if path.is_symlink():
            raise ValueError("Database path cannot be a symbolic link")
        path.parent.mkdir(parents=True, exist_ok=True)
        self._restrict_permissions(path.parent, 0o700)
        self.migrate()
        self._restrict_permissions(path, 0o600)

    @staticmethod
    def _restrict_permissions(path: Path, mode: int) -> None:
        try:
            os.chmod(path, mode)
        except OSError as error:
            raise PermissionError(f"Could not restrict permissions on {path}") from error

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        try:
            yield connection
            connection.commit()
        finally:
            connection.close()

    def migrate(self) -> None:
        with self.connect() as db:
            db.executescript(
                """
                CREATE TABLE IF NOT EXISTS schema_version(version INTEGER NOT NULL);
                INSERT INTO schema_version(version)
                  SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM schema_version);
                CREATE TABLE IF NOT EXISTS listings(
                  id INTEGER PRIMARY KEY,
                  source TEXT NOT NULL,
                  source_listing_id TEXT NOT NULL,
                  product_id TEXT NOT NULL,
                  title TEXT NOT NULL,
                  url TEXT NOT NULL,
                  condition TEXT NOT NULL,
                  currency TEXT NOT NULL,
                  first_seen TEXT NOT NULL,
                  last_seen TEXT NOT NULL,
                  available INTEGER NOT NULL DEFAULT 1,
                  last_item_price TEXT NOT NULL,
                  last_shipping_price TEXT NOT NULL,
                  raw_json TEXT NOT NULL,
                  UNIQUE(source, source_listing_id)
                );
                CREATE TABLE IF NOT EXISTS price_observations(
                  id INTEGER PRIMARY KEY,
                  listing_id INTEGER NOT NULL REFERENCES listings(id),
                  observed_at TEXT NOT NULL,
                  delivered_price TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS observations_listing_time
                  ON price_observations(listing_id, observed_at);
                CREATE TABLE IF NOT EXISTS alert_history(
                  id INTEGER PRIMARY KEY,
                  listing_id INTEGER NOT NULL REFERENCES listings(id),
                  alerted_at TEXT NOT NULL,
                  delivered_price TEXT NOT NULL,
                  reason TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS source_runs(
                  id INTEGER PRIMARY KEY,
                  source TEXT NOT NULL,
                  started_at TEXT NOT NULL,
                  finished_at TEXT,
                  returned_count INTEGER NOT NULL DEFAULT 0,
                  accepted_count INTEGER NOT NULL DEFAULT 0,
                  error TEXT
                );
                CREATE TABLE IF NOT EXISTS products(
                  product_id TEXT PRIMARY KEY,
                  name TEXT NOT NULL,
                  config_json TEXT NOT NULL,
                  updated_at TEXT NOT NULL
                );
                """
            )
            rows = db.execute("SELECT id, raw_json FROM listings WHERE source='ebay'").fetchall()
            for row in rows:
                try:
                    raw = json.loads(row["raw_json"])
                except (json.JSONDecodeError, TypeError):
                    raw = {}
                db.execute(
                    "UPDATE listings SET raw_json=? WHERE id=?",
                    (json.dumps(sanitize_raw_metadata(raw), default=str), row["id"]),
                )

    def sync_product(self, product_id: str, name: str, config: dict[str, object]) -> None:
        now = datetime.now(UTC).isoformat()
        with self.connect() as db:
            db.execute(
                """INSERT INTO products(product_id, name, config_json, updated_at)
                VALUES (?, ?, ?, ?) ON CONFLICT(product_id) DO UPDATE SET
                name=excluded.name, config_json=excluded.config_json,
                updated_at=excluded.updated_at""",
                (product_id, name, json.dumps(config, default=str), now),
            )

    def observe(self, listing: Listing) -> tuple[int, bool, Decimal | None, bool]:
        now = listing.last_seen.isoformat()
        with self.connect() as db:
            prior = db.execute(
                "SELECT * FROM listings WHERE source=? AND source_listing_id=?",
                (listing.source, listing.source_listing_id),
            ).fetchone()
            was_unavailable = bool(prior and not prior["available"])
            previous_price = (
                Decimal(prior["last_item_price"]) + Decimal(prior["last_shipping_price"])
                if prior
                else None
            )
            db.execute(
                """INSERT INTO listings(source, source_listing_id, product_id, title, url,
                condition, currency, first_seen, last_seen, available, last_item_price,
                last_shipping_price, raw_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
                ON CONFLICT(source, source_listing_id) DO UPDATE SET product_id=excluded.product_id,
                title=excluded.title, url=excluded.url, condition=excluded.condition,
                last_seen=excluded.last_seen, available=1, last_item_price=excluded.last_item_price,
                last_shipping_price=excluded.last_shipping_price, raw_json=excluded.raw_json""",
                (
                    listing.source,
                    listing.source_listing_id,
                    listing.product_match,
                    listing.title,
                    listing.url,
                    listing.condition.value,
                    listing.currency,
                    listing.first_seen.isoformat(),
                    now,
                    str(listing.item_price),
                    str(listing.shipping_price),
                    json.dumps(sanitize_raw_metadata(listing.raw), default=str),
                ),
            )
            row = db.execute(
                "SELECT id FROM listings WHERE source=? AND source_listing_id=?",
                (listing.source, listing.source_listing_id),
            ).fetchone()
            listing_id = int(row["id"])
            db.execute(
                """INSERT INTO price_observations(
                listing_id, observed_at, delivered_price) VALUES (?, ?, ?)""",
                (listing_id, now, str(listing.delivered_price)),
            )
            return listing_id, prior is None, previous_price, was_unavailable

    def should_alert(
        self,
        listing_id: int,
        delivered: Decimal,
        price_drop: Decimal,
        was_unavailable: bool,
        reappeared_realert: bool,
    ) -> bool:
        with self.connect() as db:
            row = db.execute(
                """SELECT delivered_price FROM alert_history
                WHERE listing_id=? ORDER BY id DESC LIMIT 1""",
                (listing_id,),
            ).fetchone()
        if row is None:
            return True
        return Decimal(row["delivered_price"]) - delivered >= price_drop or (
            was_unavailable and reappeared_realert
        )

    def record_alert(self, listing_id: int, delivered: Decimal, reason: str) -> None:
        with self.connect() as db:
            db.execute(
                """INSERT INTO alert_history(
                listing_id, alerted_at, delivered_price, reason) VALUES (?, ?, ?, ?)""",
                (listing_id, datetime.now(UTC).isoformat(), str(delivered), reason),
            )

    def start_source_run(self, source: str) -> int:
        with self.connect() as db:
            cursor = db.execute(
                "INSERT INTO source_runs(source, started_at) VALUES (?, ?)",
                (source, datetime.now(UTC).isoformat()),
            )
            return int(cursor.lastrowid)

    def finish_source_run(
        self, run_id: int, returned: int, accepted: int, error: str | None = None
    ) -> None:
        with self.connect() as db:
            db.execute(
                """UPDATE source_runs SET finished_at=?, returned_count=?,
                accepted_count=?, error=? WHERE id=?""",
                (datetime.now(UTC).isoformat(), returned, accepted, error, run_id),
            )

    def mark_missing_unavailable(self, source: str, seen_ids: set[str]) -> None:
        with self.connect() as db:
            if seen_ids:
                placeholders = ",".join("?" for _ in seen_ids)
                db.execute(
                    f"""UPDATE listings SET available=0 WHERE source=?
                    AND source_listing_id NOT IN ({placeholders})""",  # noqa: S608
                    (source, *sorted(seen_ids)),
                )
            else:
                db.execute("UPDATE listings SET available=0 WHERE source=?", (source,))

    def rolling_median(self, product_id: str, days: int = 30) -> Decimal | None:
        cutoff = (datetime.now(UTC) - timedelta(days=days)).isoformat()
        with self.connect() as db:
            rows = db.execute(
                """SELECT CAST(o.delivered_price AS REAL) price FROM price_observations o
                JOIN listings l ON l.id=o.listing_id
                WHERE l.product_id=? AND o.observed_at>=? ORDER BY price""",
                (product_id, cutoff),
            ).fetchall()
        if len(rows) < 5:
            return None
        values = [Decimal(str(row["price"])) for row in rows]
        middle = len(values) // 2
        return values[middle] if len(values) % 2 else (values[middle - 1] + values[middle]) / 2

    def import_observations(self, rows: list[dict[str, object]]) -> None:
        with self.connect() as db:
            for row in rows:
                db.execute(
                    """INSERT INTO listings(source, source_listing_id, product_id, title, url,
                    condition, currency, first_seen, last_seen, available, last_item_price,
                    last_shipping_price, raw_json) VALUES (?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?, ?,
                    '0', '{}') ON CONFLICT(source, source_listing_id) DO UPDATE SET
                    last_seen=MAX(last_seen, excluded.last_seen)""",
                    (
                        row["source"],
                        row["source_listing_id"],
                        row["product_id"],
                        row["title"],
                        row["url"],
                        Condition.UNKNOWN.value,
                        row["observed_at"],
                        row["observed_at"],
                        int(bool(row["available"])),
                        row["delivered_price"],
                    ),
                )
                listing_id = db.execute(
                    "SELECT id FROM listings WHERE source=? AND source_listing_id=?",
                    (row["source"], row["source_listing_id"]),
                ).fetchone()["id"]
                exists = db.execute(
                    "SELECT 1 FROM price_observations WHERE listing_id=? AND observed_at=?",
                    (listing_id, row["observed_at"]),
                ).fetchone()
                if not exists:
                    db.execute(
                        """INSERT INTO price_observations(
                        listing_id, observed_at, delivered_price) VALUES (?, ?, ?)""",
                        (listing_id, row["observed_at"], row["delivered_price"]),
                    )

    def report_rows(self, days: int = 30) -> list[sqlite3.Row]:
        cutoff = (datetime.now(UTC) - timedelta(days=days)).isoformat()
        with self.connect() as db:
            return db.execute(
                """SELECT p.name, COUNT(DISTINCT l.id) listings,
                ROUND(AVG(CAST(o.delivered_price AS REAL)), 2) average_price,
                MIN(CAST(o.delivered_price AS REAL)) lowest_price,
                (SELECT COUNT(*) FROM alert_history a JOIN listings la ON la.id=a.listing_id
                  WHERE la.product_id=p.product_id AND a.alerted_at>=?) alerts
                FROM products p LEFT JOIN listings l ON l.product_id=p.product_id
                LEFT JOIN price_observations o ON o.listing_id=l.id AND o.observed_at>=?
                GROUP BY p.product_id ORDER BY p.name""",
                (cutoff, cutoff),
            ).fetchall()
