# TW Device Browser

This feature is isolated from the calculator and other suite pages. Its entry
point is `index.js`.

- `components/` contains the browser UI and generated-image renderer.
- `../../data/tw-devices/tw-devices.json` contains the shared sourcebook
  catalog.
- `../../data/tw-devices/statistics.js` defines the canonical statistics-card
  order shared by catalog generation and tests.
- `lib/deviceSearch.js` contains framework-independent search and grouping
  helpers.
- Each catalog entry also contains pre-extracted `statistics` used by the
  quick-reference game-statistics panel.

Statistics follow a fixed display order. Purchase `Price`, P.P.E./I.S.P.
`Activation / Reload Cost`, and `Construction Cost` are separate fields. Power
summaries are concise but retain their mechanical effects, and display names
omit author/sourcebook parentheticals.

Every catalog entry points to an individual AI-generated line-art asset under
`public/assets/tw-devices`. Run `python scripts/optimize-device-images.py` after
adding replacement PNG generations to create mobile-friendly WebP files. Run
`node scripts/extract-device-statistics.mjs` after changing source descriptions
to refresh the precomputed rules summaries.

Add catalog fields in `src/data/tw-devices/` and presentation logic within this
directory.

Tests are maintained in `tests/pages/tw-device-browser/`.
