# Armory items

`rifts-ultimate-edition.reviewed.json` is the reviewed, source-backed input and
`rifts-ultimate-edition.json` is its generated runtime catalog for the Armory.
They cover 203 physical forms from the supplied _Rifts Ultimate Edition_
equipment sections on printed pages 240-274, plus the Glitter Boy rules block on
printed pages 71-73. Records retain stable prefixed IDs, category/subcategory
hierarchy, printed-page provenance, an explicit heading/table-row/rules-block
locator, descriptions, normalized statistics, and base-path-safe public artwork
paths when an accepted asset exists.

`category` and `subcategory` are the canonical Armory navigation taxonomy, not
sourcebook section headings. `scripts/build-rue-armory-catalog.mjs` owns the
deterministic classification and rejects unclassified weapon families. Preserve
the direct functional categories and keep sourcebook identity in `source`,
`page`, and `sourceLocator`.

Generate, validate, reclassify, and refresh runtime artwork paths with
`node scripts/build-rue-armory-catalog.mjs`. To inspect a candidate without
replacing runtime data, use
`node scripts/build-rue-armory-catalog.mjs --output tmp/rue-armory-review.json`.
The output path must resolve inside the repository. The generator validates the
complete catalog before atomically replacing its destination. Make audited
publication corrections in the reviewed input or the generator's explicit
ID-keyed corrections; never edit generated runtime JSON directly.

The script deliberately does not perform fuzzy OCR matching: publication records
are updated directly after checking their explicit source locator against the
designated printed page. Local PDFs and ignored extraction/image manifests
remain read-only source inputs and must not be committed.
