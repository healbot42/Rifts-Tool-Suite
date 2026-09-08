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
    "rulebook",
    "transfer sheet",
    "shoulder pad",
    "shoulder pads",
    "helmet",
    "heads",
    "iconography",
    "legions imperialis",
    "epic scale",
    "paint set",
)


def normalize(text: str) -> str:
    text = text.casefold().replace("mkiv", "mark 4").replace("mk iv", "mark 4")
    text = re.sub(r"\bmk\s*4\b", "mark 4", text)
    return " ".join(re.findall(r"[a-z0-9]+", text))


def contains_phrase(text: str, phrase: str) -> bool:
    return normalize(phrase) in normalize(text)


def reject_reason(title: str, product: Product, allow_3d_prints: bool = False) -> str | None:
    normalized = normalize(title)
    rejected = (
        GLOBAL_REJECTIONS
        if not allow_3d_prints
        else tuple(term for term in GLOBAL_REJECTIONS if term != "3d print")
    )
    for term in (*rejected, *product.excluded_terms):
        if normalize(term) in normalized:
            return term
    if any(term in normalized for term in ("bits", "single arm", "single weapon")):
        return "loose bits"
    return None


def matches_product(title: str, product: Product, allow_3d_prints: bool = False) -> bool:
    if reject_reason(title, product, allow_3d_prints):
        return False
    normalized = normalize(title)
    candidates: Iterable[str] = (product.name, *product.aliases)
    if not any(normalize(candidate) in normalized for candidate in candidates):
        return False
    return all(normalize(term) in normalized for term in product.required_terms)


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
    for pattern in (r"\blot of (\d+)\b", r"\b(\d+) models?\b", r"\bx(\d+)\b"):
        if match := re.search(pattern, text):
            value = int(match.group(1))
            return value if 0 < value <= 200 else None
    return None
