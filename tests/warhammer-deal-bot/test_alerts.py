from decimal import Decimal

import pytest
from warhammer_deal_bot.alerts import _safe_url, format_digest
from warhammer_deal_bot.models import Condition, Deal, Listing


def test_email_formatting_escapes_untrusted_text(gal_vorbak):
    listing = Listing(
        source="ebay",
        source_listing_id="123",
        title="<script>alert(1)</script> Gal Vorbak",
        product_match=gal_vorbak.id,
        url="https://www.ebay.com/itm/123",
        item_price=Decimal("60"),
        shipping_price=Decimal("8"),
        condition=Condition.NEW_ON_SPRUE,
        seller_rating=Decimal("99.8"),
    )
    subject, text, html_body = format_digest(
        [
            Deal(
                listing,
                gal_vorbak,
                ["35.2% below MSRP"],
                Decimal("35.2"),
                Decimal("84"),
            )
        ]
    )
    assert "$68 shipped" in subject
    assert "Delivered: $68" in text
    assert "<script>" not in html_body
    assert "&lt;script&gt;" in html_body


@pytest.mark.parametrize(
    ("source", "url"),
    [
        ("warpfire", "https://warpfireminis.com/product"),
        ("gamersguild", "https://www.gamersguildusa.com/product"),
        ("herrick", "https://herrickgames.com/product"),
        ("miniature_market", "https://www.miniaturemarket.com/product"),
        ("valhalla", "https://www.valhallahobby.com/product"),
        ("flipside", "https://flipsidegaming.com/product"),
        ("lazarus", "https://lazarus-games.com/product"),
        ("little_big_wars", "https://littlebigwars.com/product"),
    ],
)
def test_email_links_allow_enabled_us_retailers(source, url):
    assert _safe_url(url, source) == url


def test_email_links_keep_unapproved_sources_blocked():
    with pytest.raises(ValueError, match="not approved"):
        _safe_url("https://thetrolltrader.com/product", "troll_trader")
