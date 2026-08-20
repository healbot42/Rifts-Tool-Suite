# Shared game data

This directory contains canonical game data that may be consumed by any tool
page. Page-specific UI, calculations, and saved state remain under
`src/pages/<page-name>/`.

- `magic/`: spells, gems, spell descriptions, Techno-Wizard construction
  modifiers, and the stable-ID invocation view shared by character spellbooks.
- `tw-devices/`: Techno-Wizard device catalog and canonical statistics order.
- `character/`: skills, languages, trained-skill effects, and O.C.C./R.C.C.
  definitions.
- `items/`: source-backed Armory equipment with direct functional category and
  subcategory fields; reviewed inputs are separate from generated runtime JSON,
  and sourcebooks remain provenance rather than UI parents. `items/armory.js` is
  the shared merged runtime view used by both the Armory page and character
  equipment picker.

Character classes may declare zero or more `specializations` in
`character/occs.js`. Specializations are named, stable-ID bundles of automatic
skills, skill choices, free-text selections, requirements, and notes. Consumers
should render that schema generically so future O.C.C.s can add MOS-style
packages without page-specific conditionals.

Suite-wide catalog selection UI lives in `src/components/CatalogPickerModal.vue`
with domain-neutral search, filtering, count, validation, and payload helpers in
`src/lib/catalogPicker.js`. Entries declare stable IDs, category/subcategory,
searchable fields, facets, descriptive metadata, and option records. Options
support select, multi-select, number, boolean, and text values. Domain adapters
consume the normalized confirmation payload; the shared component must never
import domain catalogs or branch on a page, class, or item type.

The picker presents categories and subcategories as collapsible navigation in
its left column. Domain catalogs should keep rules effects in metadata and file
entries under their ordinary content categories rather than creating special
effect-based categories.

`magic/spell-descriptions.json` is intentionally loaded dynamically by the PDF
exporter so its full text does not increase the initial calculator bundle.
`magic/invocations.js` joins those descriptions to canonical spell level and
P.P.E. data for lazy-loaded consumers that need complete invocation rules.

When data changes, update every consumer, extraction script, integrity test, and
relevant document together. Preserve source citations and stable IDs. Local rule
PDFs are source inputs only and remain ignored by Git; never commit the PDFs.
