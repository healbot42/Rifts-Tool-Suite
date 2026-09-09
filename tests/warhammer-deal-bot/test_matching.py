from warhammer_deal_bot.matching import (
    classify_condition,
    infer_quantity,
    matches_product,
)
from warhammer_deal_bot.models import Condition


def test_alias_and_condition_matching(gal_vorbak):
    title = "Warhammer 30K Gal Vorbak Dark Brethren x5 New on Sprue"
    assert matches_product(title, gal_vorbak)
    assert classify_condition(title) is Condition.NEW_ON_SPRUE
    assert infer_quantity(title) == 5


def test_false_positive_rejections(gal_vorbak):
    rejected = [
        "Gal Vorbak STL digital file",
        "Gal Vorbak 3D print",
        "Gal Vorbak recast",
        "Gal Vorbak empty box only",
        "Gal Vorbak shoulder pads bits",
        "Gal Vorbak Legions Imperialis epic scale",
    ]
    assert all(not matches_product(title, gal_vorbak) for title in rejected)


def test_mkiv_variants_normalize(gal_vorbak):
    gal_vorbak.name = "MKIV Tactical Squad"
    gal_vorbak.aliases = ["Mark IV Tactical Squad"]
    assert matches_product("Horus Heresy Mk 4 Tactical Squad NIB", gal_vorbak)


def test_battle_groups_reject_wrong_editions_and_split_listings():
    from pathlib import Path

    from warhammer_deal_bot.config import load_config

    config = load_config(
        Path(__file__).parents[2] / "warhammer-deal-bot" / "config.example.yaml"
    )
    products = {product.id: product for product in config.products}
    maximus = products["maximus-battle-group"]
    original = products["legiones-astartes-battle-group-2023"]
    assert matches_product("Horus Heresy Maximus Battle Group sealed", maximus)
    assert matches_product("Maximus Battlegroup NIB", maximus)
    assert matches_product("2023 Legiones Astartes Battle Group NIB", original)
    assert matches_product(
        "Legiones Astartes Battlegroup 2023 sealed", original
    )
    for title in (
        "Legiones Astartes Battle Group sealed",
        "Legiones Astartes Battle Group 2023 Maximus",
        "Legiones Astartes Battle Group 2023 Siege Assault",
        "Legiones Astartes Battle Group 2023 Legions Imperialis",
        "Legiones Astartes Battle Group 2023 incomplete",
        "Deredeo from Legiones Astartes Battle Group 2023",
    ):
        assert not matches_product(title, original)
    for title in (
        "Maximus Battle Group empty box",
        "Maximus Battle Group split",
        "Sicaran only from Maximus Battle Group",
    ):
        assert not matches_product(title, maximus)


def test_added_watchlist_items_match_complete_kits_and_separate_land_raiders():
    from pathlib import Path

    from warhammer_deal_bot.config import load_config

    config = load_config(
        Path(__file__).parents[2] / "warhammer-deal-bot" / "config.example.yaml"
    )
    products = {product.id: product for product in config.products}

    assert matches_product(
        "Horus Heresy MKIV Assault Squad 10 Marines NIB",
        products["mkiv-assault"],
    )
    assert matches_product(
        "Legiones Astartes Deredeo Dreadnought sealed",
        products["deredeo-dreadnought"],
    )
    assert matches_product(
        "Horus Heresy Land Raider Proteus Explorator NIB",
        products["land-raider-proteus"],
    )
    assert matches_product(
        "Warhammer 40K Space Marine Land Raider new sealed",
        products["space-marine-land-raider"],
    )
    assert not matches_product(
        "Land Raider Proteus NIB",
        products["space-marine-land-raider"],
    )
    assert not matches_product(
        "Land Raider Redeemer Crusader NIB",
        products["space-marine-land-raider"],
    )
    assert not matches_product(
        "Deredeo Dreadnought weapon arm upgrade",
        products["deredeo-dreadnought"],
    )
    assert not matches_product(
        "Horus Heresy Heavy Weapons Upgrade Set Lascannons",
        products["heavy-weapons"],
    )
