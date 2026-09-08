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
