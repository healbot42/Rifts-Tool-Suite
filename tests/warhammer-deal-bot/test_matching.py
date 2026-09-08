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
