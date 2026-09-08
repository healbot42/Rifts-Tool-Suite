from decimal import Decimal

import pytest
from warhammer_deal_bot.models import Condition, Product


@pytest.fixture
def gal_vorbak() -> Product:
    return Product(
        id="gal-vorbak",
        name="Gal Vorbak",
        aliases=["Gal Vorbak Dark Brethren", "Dark Brethren"],
        queries=["Gal Vorbak"],
        quantity_wanted=2,
        msrp=Decimal("105"),
        hard_threshold=Decimal("75"),
        percent_off_threshold=Decimal("25"),
        median_percent_off=Decimal("20"),
        minimum_savings=Decimal("15"),
        enabled_conditions=set(Condition),
        expected_models=5,
    )
