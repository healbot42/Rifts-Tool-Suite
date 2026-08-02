"""Refresh catalog entries sourced from Rifts Ultimate Edition's TW examples."""

import json
import re
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "Rifts-Main-Ultimate-Edition.pdf"
CATALOG = ROOT / "src/pages/tw-device-browser/data/tw-devices.json"


def clean_pdf_text(text: str) -> str:
    text = re.sub(r"\u00ad\s*", "", text)
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"(?<=\d)\s*,\s*(?=\d)", ",", text)
    text = re.sub(r"(?<=\d)\.\s+(?=\d)", ".", text)
    while re.search(r"\b(\d)\s+(?=\d{1,2}\b)", text):
        text = re.sub(r"\b(\d)\s+(?=\d{1,2}\b)", r"\1", text)
    text = re.sub(r"\b[IiLl]D(?=\d)", "1D", text)
    text = re.sub(r"x(?:1|I|l|J)[Oo0]", "x10", text)
    text = re.sub(r"\b[Ll]S\.P\.", "I.S.P.", text)
    text = re.sub(r"\(\s+", "(", text)
    text = re.sub(r"\s+([,.;!?])", r"\1", text)
    return text.strip()


document = fitz.open(PDF)
page_text = clean_pdf_text(document[137].get_text("text"))  # PDF page 138, printed page 137.

entry_bounds = {
    "flaming-sword-rifts-rpg": ("Flaming Sword:", "Iceblast Shotgun:"),
    "lightning-rod-rifts-rpg": ("Lightning Rod:", "TK-Machine-Gun"),
}

catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
updated = []
for device_id, (start_heading, end_heading) in entry_bounds.items():
    start = page_text.index(start_heading)
    end = page_text.index(end_heading, start)
    description = page_text[start + len(start_heading):end].strip()
    if device_id == "lightning-rod-rifts-rpg":
        # The embedded searchable font maps the visible capital D to zero here.
        description = description.replace("106 M.D. per bolt", "1D6 M.D. per bolt")
    device = next(item for item in catalog["devices"] if item["id"] == device_id)
    device["description"] = description
    device["source"] = "Rifts Ultimate Edition"
    device["page"] = 137
    updated.append(device["name"])

CATALOG.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"Refreshed {len(updated)} Ultimate Edition entries: {', '.join(updated)}")
