"""Refresh Book of Magic device descriptions in visual column order."""

import glob
import json
import re
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
BOOK = next(Path(path) for path in glob.glob(str(ROOT / "*.pdf")) if "Magic" in path)
CATALOG = ROOT / "src/pages/tw-device-browser/data/tw-devices.json"

SECTIONS = [(318, 323), (324, 325), (326, 327), (328, 328), (329, 331), (331, 332), (332, 333), (333, 334), (335, 337)]
STAT_HEADING = re.compile(r"^(?:Cost|Range|Damage|Mega-Damage|M\.D\.C|P\.P\.E|Duration|Payload|Weight|Rate of Fire|Effective Range|Requirements|Spells|Physical|Bonuses?|Penalt|Note|Construction|Market|Maximum|Initial|To Recharge|Device Level)", re.I)


def normalize_name(value: str) -> str:
    value = value.lower().replace("startire", "starfire").replace("iooo", "1000").replace("i050", "1050")
    value = re.sub(r"\([^)]*(?:by |new|rifts)[^)]*\)", "", value)
    return re.sub(r"[^a-z0-9]+", "", value)


def display_name(value: str) -> str:
    """Remove author/source citations while retaining meaningful qualifiers."""
    value = re.sub(r"\s*\([^)]*(?:\bby\b|rifts(?:®)?\s*(?:rpg|book|ultimate|edition|sourcebook))[^)]*\)", "", value, flags=re.I)
    return re.sub(r"\s{2,}", " ", value).strip()


def clean(value: str) -> str:
    value = re.sub(r"\u00ad\s*", "", value)
    value = re.sub(r"Zach Westendorf \(Order #\d+\)", "", value)
    value = re.sub(r"\s+", " ", value)
    value = re.sub(r"(?<=\d)\s*,\s*(?=\d)", ",", value)
    value = re.sub(r"(?<=\d)\.\s+(?=\d)", ".", value)
    value = re.sub(r"\b([1-9])0([468])(?=\b|\+)", r"\1D\2", value)
    value = re.sub(r"\b[IiLl]D(?=\d)", "1D", value)
    value = re.sub(r"x(?:1|I|l|J)[Oo0]", "x10", value)
    value = re.sub(r"\b[Ll]S\.P\.", "I.S.P.", value)
    while re.search(r"\b(\d)\s+(?=\d{1,2}\b)", value):
        value = re.sub(r"\b(\d)\s+(?=\d{1,2}\b)", r"\1", value)
    while re.search(r"\b(\d{1,3})\s+(\d{1,3})\b", value):
        value = re.sub(r"\b(\d{1,3})\s+(\d{1,3})\b", r"\1\2", value)
    value = re.sub(r"\b(feet|foot)l(?=\d)", r"\1/", value, flags=re.I)
    value = re.sub(r"\(\s+", "(", value)
    value = re.sub(r"\s+([,.;!?])", r"\1", value)
    value = value.replace("S.D.C.lHit", "S.D.C./Hit").replace("S.D.C.IH", "S.D.C./H")
    for broken, joined in {
        "re load": "reload", "op ponent": "opponent", "op ponents": "opponents",
        "in flict": "inflict", "in flicts": "inflicts", "acti vate": "activate",
        "cre ation": "creation", "re quirements": "requirements", "Re quirements": "Requirements",
        "avail ability": "availability", "tempo rarily": "temporarily", "ordi nary": "ordinary",
        "vam pire": "vampire", "vam pires": "vampires", "wea pon": "weapon",
        "tar get": "target", "char acter": "character", "pro tective": "protective",
        "con struction": "construction", "min utes": "minutes", "me lee": "melee",
        "mor tal": "mortal", "ac cordingly": "accordingly", "stab bing": "stabbing",
        "big ger": "bigger", "ar mor": "armor", "en ergy": "energy", "sin gle": "single",
        "pres sure": "pressure", "wa ter": "water", "ver sion": "version",
        "Vam pires": "Vampires", "Vam pire": "Vampire",
        "ac tivates": "activates", "ac tivated": "activated", "ac tivate": "activate",
        "DurationlPayload": "Duration/Payload", "DurationlPay load": "Duration/Payload",
        "Dura tion": "Duration", "Pay load": "Payload", "roundlbullet": "round/bullet",
        "abili ties": "abilities", "abil ity": "ability", "com bat": "combat",
        "super natural": "supernatural", "physi cal": "physical", "mag ical": "magical",
        "com pletely": "completely", "avail able": "available", "weap on": "weapon",
        "dam age": "damage", "effec tive": "effective", "at tack": "attack",
        "pos sible": "possible", "addi tional": "additional", "vehi cle": "vehicle",
        "ma chine": "machine", "crea tion": "creation", "crea ted": "created",
        "al ways": "always",
    }.items():
        value = value.replace(broken, joined)
    return value.strip()


catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
targets = {normalize_name(device["name"]): device for device in catalog["devices"] if device["source"] == "Rifts Book of Magic"}
catalog_keys = {normalize_name(device["name"]) for device in catalog["devices"]}
document = fitz.open(BOOK)
updated = set()

for first_page, last_page in SECTIONS:
    lines = []
    for page_number in range(first_page, last_page + 1):
        page_lines = []
        page = document[page_number - 1]
        for block in page.get_text("dict")["blocks"]:
            for line in block.get("lines", []):
                spans = line.get("spans", [])
                if not spans:
                    continue
                text = clean("".join(span["text"] for span in spans))
                if text and not re.fullmatch(r"\d{3}", text):
                    page_lines.append({"text": text, "bold": "2101905" in spans[0]["font"], "x": line["bbox"][0], "y": line["bbox"][1], "page": page_number})
        page_lines.sort(key=lambda line: (0 if line["x"] < page.rect.width / 2 else 1, line["y"]))
        lines.extend(page_lines)

    boundaries = []
    pending = ""
    pending_start = None
    for index, line in enumerate(lines):
        if pending_start is None and not line["bold"]:
            continue
        if pending_start is None:
            pending_start = index
        pending = clean(f"{pending} {line['text']}")
        if "." not in pending:
            continue
        title = clean(pending.split(".", 1)[0])
        pending = ""
        start = pending_start
        pending_start = None
        if len(title) > 115 or STAT_HEADING.match(title):
            continue
        key = normalize_name(title)
        is_catalog_boundary = key in catalog_keys
        is_section_boundary = title.lower().startswith(("england:", "japan:", "australia:", "x rifts", "xiticix", "techno-wizard"))
        if is_catalog_boundary or is_section_boundary:
            boundaries.append({"index": start, "title": title, "key": key, "page": lines[start]["page"], "catalog": key in targets})

    for position, boundary in enumerate(boundaries):
        if not boundary["catalog"]:
            continue
        end = boundaries[position + 1]["index"] if position + 1 < len(boundaries) else len(lines)
        description = clean(" ".join(line["text"] for line in lines[boundary["index"]:end]))
        title = boundary["title"]
        if description.lower().startswith(title.lower()):
            description = description[len(title):].lstrip(" .-")
        if len(description) < 35:
            continue
        device = targets[boundary["key"]]
        device["description"] = description
        device["page"] = boundary["page"] - 1
        updated.add(device["id"])

# Several later catalog entries are short cross-references to full entries in
# earlier sections. Replace those references with the actual source text.
manual_entries = {
    "mega-blades-splugorth-tw-item": (315, 316, "Mega-Blades (TW).", "Mental Incapacitator (TW)."),
    "tw-steam-grenade": (330, 330, 'Grenade: "Vampire Chaser" Steam Grenade', "Naut'VII TW Grenades."),
    "tw-storm-flare": (329, 329, "Flare: Storm.", "Goblin Bombs."),
}
by_id = {device["id"]: device for device in catalog["devices"]}
for device_id, (first_page, last_page, start_heading, end_heading) in manual_entries.items():
    source_text = clean(" ".join(document[page - 1].get_text("text") for page in range(first_page, last_page + 1)))
    start = source_text.index(start_heading)
    end = source_text.index(end_heading, start)
    by_id[device_id]["description"] = source_text[start + len(start_heading):end].strip(" .-")
    by_id[device_id]["page"] = first_page - 1
    updated.add(device_id)

# This entry is protective equipment, not a firearm.
by_id["tw-nuhr-talisman-of-armor"]["category"] = "Tools & Equipment"

# The PDF has no device heading between this entry and the following vehicle
# section, so stop the catalog description at the printed section title.
thought_projector = by_id["thought-projector"]
thought_projector["description"] = thought_projector["description"].split("Techno-Wizard Vehicles", 1)[0].strip()
thought_projector["description"] = thought_projector["description"].replace(
    "(yes, in this case it requires less I.S.P. than P.P.E. Cost:",
    "(this device requires less I.S.P. than P.P.E.). Cost:",
)

# Apply the same cleanup to retained short references and entries whose source
# heading could not be rematched, so old extraction artifacts cannot survive.
for device in catalog["devices"]:
    device["name"] = display_name(device["name"])
    device["description"] = clean(device["description"])
    device["description"] = re.sub(r"(?<!page )\b(?:31[4-9]|32\d|33[0-7])\b", "", device["description"], flags=re.I)
    device["description"] = clean(device["description"])

CATALOG.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"Refreshed {len(updated)} Book of Magic descriptions in visual column order.")
