from decimal import Decimal

import httpx
from warhammer_deal_bot.sources.catalog_pages import ValhallaCatalogAdapter
from warhammer_deal_bot.sources.flipside import FlipsideAdapter
from warhammer_deal_bot.sources.warpfire import WarpfireAdapter


def test_sitemap_product_page_metadata_parser(gal_vorbak):
    adapter = WarpfireAdapter({"request_delay_seconds": 0}, httpx.Client())
    content = """
    <meta property="og:title" content="Gal Vorbak Dark Brethren NIB">
    <meta content="75.65" property="product:price:amount">
    <meta property="product:price:currency" content="USD">
    <meta property="product:availability" content="in stock">
    """
    listing = adapter.parse_page(
        content,
        "https://warpfireminis.com/gal-vorbak-dark-brethren/",
        gal_vorbak,
    )
    assert listing is not None
    assert listing.item_price == Decimal("75.65")
    assert listing.shipping_price == 0


def test_sitemap_product_page_rejects_unavailable_product(gal_vorbak):
    adapter = WarpfireAdapter({"request_delay_seconds": 0}, httpx.Client())
    content = """
    <meta property="og:title" content="Gal Vorbak Dark Brethren NIB">
    <meta property="product:price:amount" content="75.65">
    <meta property="product:price:currency" content="USD">
    <meta property="product:availability" content="out of stock">
    """
    assert (
        adapter.parse_page(
            content,
            "https://warpfireminis.com/gal-vorbak-dark-brethren/",
            gal_vorbak,
        )
        is None
    )


def test_valhalla_inventory_record_parser(gal_vorbak):
    record = """{
      "id": 33965,
      "product": {"name": "Gal Vorbak Dark Brethren", "slug": "gal-vorbak"},
      "price": "75.00",
      "inventory": 2
    }"""
    html = (
        '<script id="AddToCartButton_test_data" type="application/json">'
        f"{record}</script>"
    )

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text=html)

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        listings = ValhallaCatalogAdapter(
            {"request_delay_seconds": 0}, client
        ).search(gal_vorbak)
    assert len(listings) == 1
    assert listings[0].item_price == Decimal("75.00")


def test_flipside_documented_search_and_product_json(gal_vorbak):
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/search":
            return httpx.Response(
                200, text='<a href="/products/gal-vorbak">item</a>'
            )
        return httpx.Response(
            200,
            json={
                "product": {
                    "title": "Gal Vorbak Dark Brethren",
                    "variants": [
                        {
                            "id": 123,
                            "price": "75.00",
                            "price_currency": "USD",
                            "inventory_quantity": 2,
                        }
                    ],
                }
            },
        )

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        listings = FlipsideAdapter({}, client).search(gal_vorbak)
    assert len(listings) == 1
    assert listings[0].item_price == Decimal("75.00")
