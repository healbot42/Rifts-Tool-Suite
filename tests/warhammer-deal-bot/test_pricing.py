from decimal import Decimal
from pathlib import Path

import pytest
from warhammer_deal_bot.config import load_config
from warhammer_deal_bot.models import Condition, Listing
from warhammer_deal_bot.pricing import discount_percent, evaluate_deal


def listing(price="60", shipping="8"):
    return Listing(
        source="ebay",
        source_listing_id="v1|123|0",
        title="Gal Vorbak NOS",
        product_match="gal-vorbak",
        url="https://www.ebay.com/itm/123",
        item_price=Decimal(price),
        shipping_price=Decimal(shipping),
        condition=Condition.NEW_ON_SPRUE,
    )


def test_shipping_is_included_in_discount(gal_vorbak):
    deal = evaluate_deal(listing(), gal_vorbak)
    assert deal is not None
    assert deal.listing.delivered_price == Decimal("68")
    assert deal.discount_vs_msrp == Decimal("35.2")


def test_median_rule_and_non_deal(gal_vorbak):
    gal_vorbak.hard_threshold = None
    gal_vorbak.percent_off_threshold = None
    assert (
        evaluate_deal(listing("72", "8"), gal_vorbak, Decimal("105"))
        is not None
    )
    assert evaluate_deal(listing("95", "8"), gal_vorbak, Decimal("105")) is None
    assert discount_percent(Decimal("80"), Decimal("100")) == Decimal("20.0")


@pytest.mark.parametrize(
    "product_id,item_limit,delivered_limit",
    [
        ("maximus-battle-group", "165", "187"),
        ("legiones-astartes-battle-group-2023", "157.50", "178.50"),
    ],
)
def test_box_discounts_require_item_and_shipping_limits(
    product_id, item_limit, delivered_limit
):
    config = load_config(
        Path(__file__).parents[2] / "warhammer-deal-bot" / "config.example.yaml"
    )
    product = next(p for p in config.products if p.id == product_id)
    assert product.quantity_wanted == 2
    item = Decimal(item_limit)
    shipping = Decimal(delivered_limit) - item
    assert evaluate_deal(listing(str(item), str(shipping)), product)
    assert (
        evaluate_deal(listing(str(item + Decimal("0.01")), "0"), product)
        is None
    )
    assert (
        evaluate_deal(
            listing(str(item), str(shipping + Decimal("0.01"))), product
        )
        is None
    )
    assert evaluate_deal(listing(str(item - 10), str(shipping + 10)), product)
    # Another permissive rule must not bypass either mandatory box discount.
    product.hard_threshold = Decimal("999")
    assert evaluate_deal(listing(str(item + 1), "0"), product) is None
    assert evaluate_deal(listing(str(item), str(shipping + 1)), product) is None
