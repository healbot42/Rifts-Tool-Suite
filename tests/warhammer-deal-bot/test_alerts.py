from decimal import Decimal

import pytest
from warhammer_deal_bot.alerts import _safe_url, format_digest
from warhammer_deal_bot.models import Condition, Deal, Listing, Product


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


def test_digest_groups_duplicates_caps_products_and_separates_suspicious_deals():
    product = Product(
        id="squad",
        name="Test Squad",
        aliases=[],
        queries=[],
        quantity_wanted=1,
        msrp=Decimal("100"),
    )

    def deal(listing_id, title, price, discount):
        return Deal(
            Listing(
                source="ebay",
                source_listing_id=listing_id,
                title=title,
                product_match=product.id,
                url=f"https://www.ebay.com/itm/{listing_id}",
                item_price=Decimal(price),
            ),
            product,
            [f"{discount}% below MSRP"],
            Decimal(discount),
        )

    deals = [
        deal("1", "Test Squad complete", "75", "25"),
        deal("2", "Test Squad sealed", "65", "35"),
        deal("3", "Test Squad NOS", "55", "45"),
        deal("4", "TEST SQUAD!!! suspicious", "30", "70"),
        deal("5", "test squad suspicious", "30", "70"),
        deal("6", "Test Squad alternate suspicious", "35", "65"),
    ]
    subject, text, html_body = format_digest(deals, max_per_product=4)

    assert subject == "Warhammer deals — 4 shown"
    assert "Best matches" in text
    assert "Review carefully (60%+ below MSRP)" in text
    assert "Similar listings grouped: 2" in text
    assert "1 lower-ranked listings omitted by digest limits." in text
    assert text.count("Test Squad\n") == 4
    assert "Review carefully" in html_body
