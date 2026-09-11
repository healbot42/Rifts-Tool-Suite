"""Build the browser catalog from WarHub's versioned public product partitions."""

from __future__ import annotations

import json
import re
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "src/data/warhammer-product-catalog.json"
BASE = "https://warhub.github.io/warhub-catalog/products/by-system"
SYSTEMS = {"warhammer-40k": "Warhammer 40,000", "horus-heresy": "Horus Heresy"}
RESIN_CODE_PREFIXES = ("995", "998")
SINGLE_MODEL_TERMS = re.compile(
    r"\b(captain|lieutenant|chaplain|librarian|commander|canoness|palatine|"
    r"farseer|autarch|warboss|techmarine|apothecary|primarch)\b",
    re.IGNORECASE,
)


def slug(value: str) -> str:
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", value.casefold()))


def normalize(
    record: dict[str, object], system: str
) -> dict[str, object] | None:
    if record.get("manufacturer") != "games-workshop":
        return None
    if (
        record.get("status") != "current"
        or record.get("category") != "miniatures"
    ):
        return None
    url = str(record.get("url", ""))
    if not url.startswith("https://www.warhammer.com/"):
        return None
    code = str(record.get("productCode", ""))
    name = str(record.get("name", "")).strip()
    return {
        "id": slug(name),
        "name": name,
        "system": SYSTEMS[system],
        "faction": str(record.get("faction", "Uncategorized")),
        "product_code": code,
        "url": url.replace("/en-GB/", "/en-US/"),
        "image_url": record.get("imageUrl"),
        "msrp": record.get("priceUsd"),
        "price_gbp": record.get("priceGbp"),
        "suspected_resin": code.startswith(RESIN_CODE_PREFIXES),
        "suspected_single": record.get("faction") == "Characters"
        or bool(SINGLE_MODEL_TERMS.search(name)),
    }


def download(system: str) -> dict[str, object]:
    request = urllib.request.Request(
        f"{BASE}/{system}.json", headers={"User-Agent": "RiftsToolSuite/0.2"}
    )
    with urllib.request.urlopen(request, timeout=30) as response:  # noqa: S310
        return json.load(response)


def build() -> None:
    products: dict[str, dict[str, object]] = {}
    versions: set[str] = set()
    for system in SYSTEMS:
        payload = download(system)
        versions.add(str(payload["version"]))
        for source in payload["products"]:  # type: ignore[index]
            product = normalize(source, system)
            if product:
                key = str(source.get("productCode") or source["id"])
                products.setdefault(key, product)
    normalized = list(products.values())
    duplicate_ids = {
        product_id
        for product_id, count in Counter(
            item["id"] for item in normalized
        ).items()
        if count > 1
    }
    occurrences: defaultdict[str, int] = defaultdict(int)
    for product in normalized:
        if product["id"] in duplicate_ids:
            original_id = str(product["id"])
            occurrences[original_id] += 1
            code = str(product["product_code"])[-5:] or "variant"
            product["id"] = f"{original_id}-{code}-{occurrences[original_id]}"
    output = {
        "source": "WarHub Catalog",
        "source_url": "https://github.com/WarHub/warhub-catalog",
        "version": ", ".join(sorted(versions)),
        "products": sorted(normalized, key=lambda item: str(item["name"])),
    }
    OUTPUT.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(products)} products to {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    build()
