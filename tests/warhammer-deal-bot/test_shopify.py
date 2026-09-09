from decimal import Decimal

import httpx
import pytest
from warhammer_deal_bot.sources.herrick import HerrickAdapter

SITEMAP_INDEX = """<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://herrickgames.com/sitemap_products_1.xml</loc></sitemap>
  <sitemap><loc>https://herrickgames.com/en-ca/sitemap_products_1.xml</loc></sitemap>
</sitemapindex>
"""

PRODUCT_SITEMAP = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://herrickgames.com/products/gal-vorbak</loc>
    <image:image><image:title>Gal Vorbak Dark Brethren</image:title></image:image>
  </url>
  <url>
    <loc>https://herrickgames.com/products/unrelated-game</loc>
    <image:image><image:title>Unrelated Game</image:title></image:image>
  </url>
</urlset>
"""


def test_shopify_sitemap_adapter_returns_available_matching_product(gal_vorbak):
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/sitemap.xml":
            return httpx.Response(200, text=SITEMAP_INDEX)
        if request.url.path == "/sitemap_products_1.xml":
            return httpx.Response(200, text=PRODUCT_SITEMAP)
        if request.url.path == "/products/gal-vorbak.js":
            return httpx.Response(
                200,
                json={
                    "id": 100,
                    "title": "Gal Vorbak Dark Brethren",
                    "variants": [
                        {"id": 101, "price": 7500, "available": True},
                        {"id": 102, "price": 7000, "available": False},
                    ],
                },
            )
        return httpx.Response(404)

    settings = {
        "flat_shipping": 10,
        "free_shipping_threshold": 100,
        "request_delay_seconds": 0,
    }
    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        listings = HerrickAdapter(settings, client).search(gal_vorbak)

    assert len(listings) == 1
    assert listings[0].item_price == Decimal("75")
    assert listings[0].shipping_price == Decimal("10")
    assert listings[0].source_listing_id == "101"


def test_shopify_adapter_skips_unknown_shipping_below_free_threshold(
    gal_vorbak,
):
    adapter = HerrickAdapter(
        {"free_shipping_threshold": 100, "request_delay_seconds": 0},
        httpx.Client(),
    )
    listing = adapter._parse_product(
        {
            "id": 100,
            "title": "Gal Vorbak Dark Brethren",
            "variants": [{"id": 101, "price": 7500, "available": True}],
        },
        "https://herrickgames.com/products/gal-vorbak",
        gal_vorbak,
    )
    assert listing is None


def test_shopify_adapter_rejects_unapproved_product_url(gal_vorbak):
    adapter = HerrickAdapter(
        {"flat_shipping": 10, "request_delay_seconds": 0},
        httpx.Client(),
    )
    data = {
        "id": 100,
        "title": "Gal Vorbak Dark Brethren",
        "variants": [{"id": 101, "price": 7500, "available": True}],
    }
    with pytest.raises(ValueError):
        adapter._parse_product(
            data,
            "https://herrickgames.example/products/gal-vorbak",
            gal_vorbak,
        )
