"""Conservative product matching and listing condition classification."""

import re
from collections.abc import Iterable

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
    "paint set",
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
    text = re.sub(r"\bmk\s*4\b", "mark 4", text)
    return " ".join(re.findall(r"[a-z0-9]+", text))


def contains_phrase(text: str, phrase: str) -> bool:
    normalized_text = normalize(text)
    normalized_phrase = normalize(phrase)
    if not normalized_phrase:
        return False
    pattern = rf"(?:^| ){re.escape(normalized_phrase)}s?(?: |$)"
    return re.search(pattern, normalized_text) is not None


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
    if reject_reason(title, product, allow_3d_prints):
        return False
    candidates: Iterable[str] = (product.name, *product.aliases)
    if not any(contains_phrase(title, candidate) for candidate in candidates):
        return False
    return all(contains_phrase(title, term) for term in product.required_terms)


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
