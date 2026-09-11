"""Build the browser catalog from WarHub's versioned public product partitions."""

from __future__ import annotations

import json
import re
import urllib.request
import zipfile
from collections import Counter, defaultdict
from datetime import date
from io import BytesIO
from pathlib import Path
from urllib.parse import quote, urlsplit, urlunsplit
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "src/data/warhammer-product-catalog.json"
BASE = "https://warhub.github.io/warhub-catalog/products/by-system"
GW_TRADE_MEDIA_URL = (
    "https://trade.games-workshop.com/wp-json/gw/v2/media"
    "?fe=1&group=560&per_page=100&page=1&lang=en&country=12"
)
SYSTEMS = {"warhammer-40k": "Warhammer 40,000", "horus-heresy": "Horus Heresy"}
RESIN_CODE_PREFIXES = ("995", "998")
SINGLE_MODEL_TERMS = re.compile(
    r"\b(captain|lieutenant|chaplain|librarian|commander|canoness|palatine|"
    r"farseer|autarch|warboss|techmarine|apothecary|primarch)\b",
    re.IGNORECASE,
)
PRICE_EFFECTIVE_DATES = {
    "US Price Adjustment 09_26": date(2026, 9, 21),
    "US DTT Price Adjustment 09_2026": date(2026, 9, 21),
}


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


def request_bytes(url: str) -> bytes:
    parts = urlsplit(url)
    encoded_url = urlunsplit(
        (
            parts.scheme,
            parts.netloc,
            quote(parts.path),
            parts.query,
            parts.fragment,
        )
    )
    request = urllib.request.Request(
        encoded_url, headers={"User-Agent": "RiftsToolSuite/0.2"}
    )
    with urllib.request.urlopen(request, timeout=30) as response:  # noqa: S310
        return response.read()


def latest_us_price_files() -> list[tuple[str, str, str, str, str]]:
    payload = json.loads(request_bytes(GW_TRADE_MEDIA_URL))
    price_files: list[tuple[str, str, str, str, str]] = []
    for asset in payload["assets"]:
        title = str(asset.get("title", ""))
        url = str(asset.get("file_url", ""))
        if not url.casefold().endswith(".xlsx"):
            continue
        if title.casefold().startswith("us price adjustment"):
            price_files.append((title, url, "E", "G", "H"))
        elif title.casefold().startswith("us dtt price adjustment"):
            price_files.append((title, url, "B", "E", "F"))
    if not any(
        title.casefold().startswith("us price adjustment")
        for title, *_ in price_files
    ):
        raise RuntimeError("Games Workshop did not publish a US price file")
    price_files.sort(
        key=lambda item: (
            item[0].casefold().startswith("us dtt price adjustment")
        )
    )
    return price_files


def _xlsx_cell_value(
    cell: ElementTree.Element, shared_strings: list[str], namespace: str
) -> str:
    cell_type = cell.attrib.get("t")
    if cell_type == "inlineStr":
        return "".join(
            text.text or "" for text in cell.iter(f"{{{namespace}}}t")
        )
    value = cell.find(f"{{{namespace}}}v")
    if value is None or value.text is None:
        return ""
    if cell_type == "s":
        return shared_strings[int(value.text)]
    return value.text


def parse_us_prices(
    workbook: bytes, code_column: str = "E", price_column: str = "H"
) -> dict[str, float]:
    namespace = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
    with zipfile.ZipFile(BytesIO(workbook)) as archive:
        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
            shared_strings = [
                "".join(
                    text.text or "" for text in item.iter(f"{{{namespace}}}t")
                )
                for item in root.iter(f"{{{namespace}}}si")
            ]
        worksheet = ElementTree.fromstring(
            archive.read("xl/worksheets/sheet1.xml")
        )
        prices: dict[str, float] = {}
        for row in worksheet.iter(f"{{{namespace}}}row"):
            cells = {
                re.match(r"[A-Z]+", cell.attrib["r"])[0]: _xlsx_cell_value(
                    cell, shared_strings, namespace
                )
                for cell in row.findall(f"{{{namespace}}}c")
            }
            code = cells.get(code_column, "").strip()
            price = cells.get(price_column, "").strip()
            if code.isdigit() and price:
                prices[code] = float(price)
        if not prices:
            raise RuntimeError(
                "Games Workshop US price file contained no prices"
            )
        return prices


def build() -> None:
    price_files = latest_us_price_files()
    us_prices: dict[str, float] = {}
    today = date.today()
    for (
        title,
        price_url,
        code_column,
        current_column,
        new_column,
    ) in price_files:
        effective_date = PRICE_EFFECTIVE_DATES.get(title)
        if effective_date is None:
            raise RuntimeError(
                f"Price effective date is not configured for {title}"
            )
        price_column = new_column if today >= effective_date else current_column
        us_prices.update(
            parse_us_prices(
                request_bytes(price_url),
                code_column=code_column,
                price_column=price_column,
            )
        )
    products: dict[str, dict[str, object]] = {}
    versions: set[str] = set()
    for system in SYSTEMS:
        payload = download(system)
        versions.add(str(payload["version"]))
        for source in payload["products"]:  # type: ignore[index]
            product = normalize(source, system)
            if product:
                key = str(source.get("productCode") or source["id"])
                if key in us_prices:
                    product["msrp"] = us_prices[key]
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
        "price_source": "; ".join(title for title, *_ in price_files),
        "price_source_url": price_files[0][1],
        "price_effective_date": max(
            PRICE_EFFECTIVE_DATES[title] for title, *_ in price_files
        ).isoformat(),
        "price_basis": "new"
        if today
        >= max(PRICE_EFFECTIVE_DATES[title] for title, *_ in price_files)
        else "current",
        "price_sources": [
            {"title": title, "url": url} for title, url, *_ in price_files
        ],
        "priced_products": sum(
            product["msrp"] is not None for product in normalized
        ),
        "products": sorted(normalized, key=lambda item: str(item["name"])),
    }
    OUTPUT.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(products)} products to {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    build()
