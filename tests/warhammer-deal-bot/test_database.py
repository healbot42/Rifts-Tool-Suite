from datetime import UTC, datetime
from decimal import Decimal

from warhammer_deal_bot.database import Database
from warhammer_deal_bot.models import Listing


def make_listing(price: str) -> Listing:
    return Listing(
        source="ebay",
        source_listing_id="123",
        title="Gal Vorbak",
        product_match="gal-vorbak",
        url="https://www.ebay.com/itm/123",
        item_price=Decimal(price),
        last_seen=datetime.now(UTC),
    )


def test_duplicate_and_price_drop_realert(tmp_path):
    database = Database(tmp_path / "deals.sqlite3")
    listing_id, is_new, _, _ = database.observe(make_listing("70"))
    assert is_new
    assert database.should_alert(
        listing_id, Decimal("70"), Decimal("5"), False, True
    )
    database.record_alert(listing_id, Decimal("70"), "test")
    same_id, is_new, previous, _ = database.observe(make_listing("68"))
    assert same_id == listing_id and not is_new and previous == Decimal("70")
    assert not database.should_alert(
        listing_id, Decimal("68"), Decimal("5"), False, True
    )
    database.observe(make_listing("64"))
    assert database.should_alert(
        listing_id, Decimal("64"), Decimal("5"), False, True
    )


def test_remote_observations_are_idempotent_and_feed_median(tmp_path):
    database = Database(tmp_path / "deals.sqlite3")
    observed_at = datetime.now(UTC).isoformat()
    rows = [
        {
            "source": "ebay",
            "source_listing_id": str(index),
            "product_id": "possessed",
            "observed_at": observed_at,
            "delivered_price": str(price),
            "title": "Possessed",
            "url": f"https://www.ebay.com/itm/{index}",
            "available": 1,
        }
        for index, price in enumerate((40, 45, 50, 55, 60), start=1)
    ]
    database.import_observations(rows)
    database.import_observations(rows)

    assert database.rolling_median("possessed") == Decimal("50.0")
    with database.connect() as connection:
        count = connection.execute(
            "SELECT COUNT(*) FROM price_observations"
        ).fetchone()[0]
    assert count == 5
