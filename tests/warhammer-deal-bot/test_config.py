from pathlib import Path

from warhammer_deal_bot.config import load_config


def test_example_config_loads():
    config = load_config(
        Path(__file__).parents[2] / "warhammer-deal-bot" / "config.example.yaml"
    )
    assert len(config.products) == 23
    assert config.sources["ebay"]["enabled"] is True
    assert config.products[1].quantity_wanted == 2
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
