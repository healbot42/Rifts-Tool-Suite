# Spell description data

`spell-descriptions.json` is a versioned, currently unimported data store for
future document exports. Keeping it unimported prevents the description text
from increasing the calculator's JavaScript bundle today.

Each record is keyed as `level-{two-digit-level}-{normalized-spell-name}` and
contains:

- `name`: canonical catalog name.
- `level`: invocation level.
- `source`: source book and inclusive printed page numbers.
- `description`: the complete extracted stat block and description body.

The `_meta` object describes the schema and records whether the store is loaded
at runtime. Text was extracted from the user-provided `Rifts Book of Magic` PDF;
minor spacing artifacts inherent to the PDF's embedded text layer may remain.
