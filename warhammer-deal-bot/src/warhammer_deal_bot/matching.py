"""Conservative product matching and listing condition classification."""

import re
from collections.abc import Iterable
from dataclasses import dataclass

from .models import Condition, Product

GLOBAL_REJECTIONS = (
    "stl",
    "digital file",
    "3d print",
    "recast",
    "empty box",
    "box only",
    "manual only",
    "instructions only",
    "instruction only",
    "assembly instructions",
    "rulebook",
    "transfer sheet",
    "shoulder pad",
    "shoulder pads",
    "helmet",
    "heads",
    "iconography",
    "legions imperialis",
    "legion imperialis",
    "epic scale",
    "epic warhammer",
    "warhammer epic",
    "epic 40k",
    "epic 40000",
    "epic eldar",
    "epic aeldari",
    "paint set",
    "citadel shade",
    "ccg",
    "trading card",
    "single model",
    "single models",
    "individual model",
    "individual models",
    "single miniature",
    "single miniatures",
    "individual miniature",
    "individual miniatures",
    "one model",
    "one miniature",
    "battle foam",
    "army tray",
    "foam tray",
    "replacement part",
    "replacement parts",
    "spare part",
    "spare parts",
    "spares",
    "missing arm",
    "missing parts",
    "no jump packs",
    # Other miniature games can have units whose names overlap a watched GW
    # kit. Reject both the game names and well-known overlapping unit names so
    # short searches such as "Reavers" cannot produce cross-game alerts.
    "blood bowl",
    "warmachine",
    "reikland reavers",
    "reikland reivers",
    "doom reavers",
    "ironborn reavers",
    "a song of ice and fire",
    "asoiaf",
    "marvel legends",
    "x men reavers",
    "privateer press",
    "mantic games",
    "kings of war",
    "malifaux",
    "warlord games",
    "bolt action",
    "citadel base",
)

# Packaging phrases used by the current Epic-scale range even when a seller
# omits both "Legions Imperialis" and "Epic Scale" from the listing title.
LEGIONS_IMPERIALIS_TITLE_FINGERPRINTS = (
    "land raider proteus explorer squadron",
    "land raider proteus explorator squadron",
    "sicaran squadron",
    "spartan assault tanks",
)


def normalize(text: str) -> str:
    text = text.casefold().replace("×", "x").replace("mkiv", "mark 4").replace("mk iv", "mark 4")
    text = text.replace("mark iv", "mark 4")
    text = re.sub(r"\bmk\s*4\b", "mark 4", text)
    return " ".join(re.findall(r"[a-z0-9]+", text))


def _contains_padded(padded_text: str, normalized_phrase: str) -> bool:
    if not normalized_phrase:
        return False
    return f" {normalized_phrase} " in padded_text or f" {normalized_phrase}s " in padded_text


def _contains_normalized(normalized_text: str, normalized_phrase: str) -> bool:
    """Match a normalized whole phrase, allowing a plural suffix."""
    return _contains_padded(f" {normalized_text} ", normalized_phrase)


def contains_phrase(text: str, phrase: str) -> bool:
    return _contains_normalized(normalize(text), normalize(phrase))


@dataclass(frozen=True, slots=True)
class ProductMatcher:
    """Pre-normalized matching rules for one watched product."""

    product: Product
    candidates: tuple[str, ...]
    required_terms: tuple[str, ...]
    excluded_terms: tuple[str, ...]


def prepare_matchers(products: Iterable[Product]) -> tuple[ProductMatcher, ...]:
    """Prepare reusable product rules before scanning a large retailer catalog."""
    return tuple(
        ProductMatcher(
            product=product,
            candidates=tuple(normalize(value) for value in (product.name, *product.aliases)),
            required_terms=tuple(normalize(value) for value in product.required_terms),
            excluded_terms=tuple(normalize(value) for value in product.excluded_terms),
        )
        for product in products
    )


_NORMALIZED_GLOBAL_REJECTIONS = tuple(normalize(term) for term in GLOBAL_REJECTIONS)
_NORMALIZED_3D_PRINT = normalize("3d print")
_NORMALIZED_GLOBAL_REJECTIONS_ALLOWING_3D = tuple(
    term for term in _NORMALIZED_GLOBAL_REJECTIONS if term != _NORMALIZED_3D_PRINT
)
_NORMALIZED_LEGIONS_FINGERPRINTS = tuple(
    normalize(term) for term in LEGIONS_IMPERIALIS_TITLE_FINGERPRINTS
)
_NORMALIZED_LOOSE_BITS = tuple(normalize(term) for term in ("bits", "single arm", "single weapon"))


def matching_products(
    title: str,
    matchers: Iterable[ProductMatcher],
    allow_3d_prints: bool = False,
) -> list[Product]:
    """Match one title against a prepared watchlist with one normalization pass."""
    normalized_title = normalize(title)
    padded_title = f" {normalized_title} "
    candidates = [
        matcher
        for matcher in matchers
        if any(_contains_padded(padded_title, candidate) for candidate in matcher.candidates)
    ]
    if not candidates:
        return []

    rejected = (
        _NORMALIZED_GLOBAL_REJECTIONS_ALLOWING_3D
        if allow_3d_prints
        else _NORMALIZED_GLOBAL_REJECTIONS
    )
    if any(_contains_padded(padded_title, term) for term in rejected):
        return []
    if any(_contains_padded(padded_title, term) for term in _NORMALIZED_LEGIONS_FINGERPRINTS):
        return []
    if any(_contains_padded(padded_title, term) for term in _NORMALIZED_LOOSE_BITS):
        return []

    matches: list[Product] = []
    for matcher in candidates:
        if any(_contains_padded(padded_title, term) for term in matcher.excluded_terms):
            continue
        if not all(_contains_padded(padded_title, term) for term in matcher.required_terms):
            continue
        matches.append(matcher.product)
    return matches


def reject_reason(title: str, product: Product, allow_3d_prints: bool = False) -> str | None:
    rejected = (
        GLOBAL_REJECTIONS
        if not allow_3d_prints
        else tuple(term for term in GLOBAL_REJECTIONS if term != "3d print")
    )
    for term in (*rejected, *product.excluded_terms):
        if contains_phrase(title, term):
            return term
    for term in LEGIONS_IMPERIALIS_TITLE_FINGERPRINTS:
        if contains_phrase(title, term):
            return f"Legions Imperialis product: {term}"
    if any(contains_phrase(title, term) for term in ("bits", "single arm", "single weapon")):
        return "loose bits"
    return None


def matches_product(title: str, product: Product, allow_3d_prints: bool = False) -> bool:
    return bool(matching_products(title, prepare_matchers((product,)), allow_3d_prints))


def classify_condition(title: str, source_condition: str | None = None) -> Condition:
    text = normalize(f"{title} {source_condition or ''}")
    patterns = (
        (Condition.PARTIAL_BITS, ("bits", "partial", "incomplete")),
        (Condition.NEW_ON_SPRUE, ("new on sprue", "nos")),
        (Condition.NEW_WITHOUT_BOX, ("new without box", "no box", "new loose")),
        (Condition.NEW_IN_BOX, ("new in box", "nib", "brand new", "new sealed")),
        (Condition.ASSEMBLED_UNPAINTED, ("assembled unpainted", "built unpainted")),
        (Condition.PRIMED, ("primed",)),
        (Condition.PAINTED, ("painted",)),
    )
    for condition, phrases in patterns:
        if any(phrase in text for phrase in phrases):
            return condition
    return Condition.UNKNOWN


def infer_quantity(title: str) -> int | None:
    text = normalize(title)
    patterns = (
        r"\blot of (\d+)\b",
        r"\bset of (\d+)\b",
        r"\b(\d+) (?:models?|miniatures?|marines?)\b",
        r"\bx(\d+)\b",
        r"\b(\d+)x\b",
    )
    for pattern in patterns:
        if match := re.search(pattern, text):
            value = int(match.group(1))
            return value if 0 < value <= 200 else None
    if match := re.search(r"\((\d{1,3})\)", title):
        value = int(match.group(1))
        return value if 0 < value <= 200 else None
    return None
