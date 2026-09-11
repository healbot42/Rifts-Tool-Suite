from datetime import UTC, datetime
from decimal import Decimal

import httpx
import pytest
from warhammer_deal_bot.sources.ebay import EbayAdapter


def ebay_item():
    return {
        "itemId": "v1|123|0",
        "title": "Gal Vorbak Dark Brethren x5 New on Sprue",
        "itemWebUrl": "https://www.ebay.com/itm/123",
        "price": {"value": "60.00", "currency": "USD"},
        "shippingOptions": [
            {"shippingCost": {"value": "8.00", "currency": "USD"}}
        ],
        "condition": "New",
        "seller": {"username": "safe-seller", "feedbackPercentage": "99.8"},
        "itemLocation": {"country": "US"},
        "image": {"imageUrl": "https://i.ebayimg.com/images/g/test/s-l500.jpg"},
        "itemEndDate": "2099-01-01T00:00:00.000Z",
    }


def test_fixture_style_ebay_parser(monkeypatch, gal_vorbak):
    monkeypatch.setenv("EBAY_CLIENT_ID", "id")
    monkeypatch.setenv("EBAY_CLIENT_SECRET", "secret")
    adapter = EbayAdapter({}, httpx.Client())
    result = adapter.parse_item(ebay_item(), gal_vorbak)
    assert result is not None
    assert result.delivered_price == Decimal("68.00")
    assert result.seller_rating == Decimal("99.8")
    assert result.quantity == 5
    assert result.image_url == "https://i.ebayimg.com/images/g/test/s-l500.jpg"
    assert result.ends_at == datetime(2099, 1, 1, tzinfo=UTC)


def test_expired_and_out_of_stock_items_are_rejected(monkeypatch, gal_vorbak):
    monkeypatch.setenv("EBAY_CLIENT_ID", "id")
    monkeypatch.setenv("EBAY_CLIENT_SECRET", "secret")
    adapter = EbayAdapter({}, httpx.Client())
    item = ebay_item()
    item["itemEndDate"] = "2020-01-01T00:00:00.000Z"
    assert adapter.parse_item(item, gal_vorbak) is None
    item = ebay_item()
    item["estimatedAvailabilityStatus"] = "OUT_OF_STOCK"
    assert adapter.parse_item(item, gal_vorbak) is None


def test_invalid_price_and_url_are_rejected(monkeypatch, gal_vorbak):
    monkeypatch.setenv("EBAY_CLIENT_ID", "id")
    monkeypatch.setenv("EBAY_CLIENT_SECRET", "secret")
    adapter = EbayAdapter({}, httpx.Client())
    item = ebay_item()
    item["price"] = {"value": "not-money", "currency": "USD"}
    assert adapter.parse_item(item, gal_vorbak) is None
    item = ebay_item()
    item["itemWebUrl"] = "https://fake-ebay.com/itm/123"
    assert adapter.parse_item(item, gal_vorbak) is None


def test_credential_environment_names_cannot_be_redirected(monkeypatch):
    monkeypatch.setenv("EBAY_CLIENT_ID", "id")
    monkeypatch.setenv("EBAY_CLIENT_SECRET", "secret")
    with pytest.raises(ValueError):
        EbayAdapter({"client_secret_env": "UNRELATED_SECRET"}, httpx.Client())


@pytest.mark.parametrize(
    "shipping",
    [[], [{}], [{"shippingCost": {"value": "0", "currency": "EUR"}}]],
)
def test_shipping_floor_rejects_unknown_or_mismatched_quote(
    monkeypatch, gal_vorbak, shipping
):
    monkeypatch.setenv("EBAY_CLIENT_ID", "id")
    monkeypatch.setenv("EBAY_CLIENT_SECRET", "secret")
    gal_vorbak.item_percent_off_threshold = Decimal("25")
    gal_vorbak.delivered_percent_off_floor = Decimal("15")
    with httpx.Client() as client:
        adapter = EbayAdapter({}, client)
        item = ebay_item()
        item["shippingOptions"] = shipping
        assert adapter.parse_item(item, gal_vorbak) is None
        item["shippingOptions"] = [
            {"shippingCost": {"value": "0", "currency": "USD"}}
        ]
        assert adapter.parse_item(item, gal_vorbak) is not None
