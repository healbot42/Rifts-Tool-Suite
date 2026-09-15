from decimal import Decimal

from warhammer_deal_bot.alerts import format_chair_digest
from warhammer_deal_bot.chairs import qualifies
from warhammer_deal_bot.models import ChairDeal, Listing


def listing(
    title: str, price: str = "40", distance: str | None = "5"
) -> Listing:
    return Listing(
        source="ebay",
        source_listing_id=title,
        title=title,
        product_match="chair-office",
        url="https://www.ebay.com/itm/123",
        item_price=Decimal(price),
        shipping_price=Decimal("0"),
        distance_miles=Decimal(distance) if distance else None,
        local_pickup=True,
    )


def test_chair_title_filter_rejects_parts_and_non_chairs():
    assert qualifies("Ergonomic mesh office chair")
    assert not qualifies("Office chair gas cylinder replacement")
    assert not qualifies("Dollhouse miniature chair set")
    assert not qualifies("Chairman Mao poster")


def test_chair_digest_has_exact_sections_and_empty_messages():
    deal = ChairDeal("office", "OFFICE CHAIRS", listing("Office chair"))
    subject, text, html = format_chair_digest([deal])
    assert subject.startswith("Local Chair Deals – ")
    assert text.count("OFFICE CHAIRS") == 1
    assert text.count("UPHOLSTERED / LOUNGE CHAIRS") == 1
    assert text.count("PAPASAN / CASUAL CHAIRS") == 1
    assert text.count("No qualifying deals found.") == 2
    assert "total: $40" in text
    assert "Local pickup: yes" in text
    assert html.count("No qualifying deals found.") == 2
