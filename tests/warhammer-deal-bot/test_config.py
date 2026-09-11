from pathlib import Path

from warhammer_deal_bot.config import load_config


def test_example_config_loads():
    config = load_config(
        Path(__file__).parents[2] / "warhammer-deal-bot" / "config.example.yaml"
    )
    assert len(config.products) == 23
    assert config.sources["ebay"]["enabled"] is True
    assert config.sources["warpfire"]["enabled"] is True
    assert config.sources["gamersguild"]["enabled"] is True
    assert config.sources["herrick"]["flat_shipping"] == 0
    assert config.sources["miniature_market"]["enabled"] is True
    assert config.sources["valhalla"]["enabled"] is True
    assert config.sources["flipside"]["enabled"] is True
    assert config.sources["lazarus"]["enabled"] is True
    assert config.sources["little_big_wars"]["flat_shipping"] == 0
    assert config.products[1].quantity_wanted == 2
    assert config.products[1].minimum_models == 5
    assert config.email.max_deals_per_product == 3
    assert config.email.suspicious_discount_percent == 60
    assert config.products[0].purchased_quantity == 0
    ids = {product.id for product in config.products}
    assert {
        "mkiv-assault",
        "contemptor-dreadnought",
        "heavy-weapons",
        "deimos-rhino",
        "land-raider-proteus",
        "zardu-layak",
        "spartan-assault-tank",
        "deredeo-dreadnought",
        "cataphractii-terminators",
        "deimos-whirlwind",
        "space-marine-land-raider",
    } <= ids
