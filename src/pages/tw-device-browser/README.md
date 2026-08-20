# Armory

This feature is the suite-wide Armory browser. Its stable page ID and module
path remain `tw-device-browser` for hash-link compatibility.

- `components/` contains the browser UI and generated-image renderer.
- `../../data/tw-devices/tw-devices.json` contains the shared sourcebook
  catalog.
- `../../data/items/rifts-ultimate-edition.reviewed.json` is the reviewed source
  artifact; `rifts-ultimate-edition.json` is its generated 203-item runtime
  catalog from printed pages 240-274, plus the Glitter Boy Power Armor rules
  block on printed pages 71-73.
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

Run `npm run assets:check` to verify RUE Armory image references and report
unmatched item assets. Known source images without a canonical catalog record
are retained through the validator's explicit allowlist rather than deleted.

Add catalog fields in `src/data/tw-devices/` and presentation logic within this
directory.

The navigation is a direct functional taxonomy; sourcebooks are provenance, not
navigation parents. `Melee Weapons` and `Ranged Weapons` are distinct, with
weapon subgroups based on what the item delivers (laser, ion, plasma, particle
beam, projectile/rail gun, missile/rocket/grenade, vibro-blade, impact/neural,
or an explicit hybrid family). Armor, Power Armor, Robots, and Vehicles are
separate top-level groups. Equipment is filed under Medical, Utility & Field
Gear, Communications, Computers & Media, Optics & Surveillance, Sensors &
Detection, or Scientific & Laboratory. Ammunition & Explosives is divided by
missile range and explosive function. The Wilk's Jet Pack is a Vehicle under
Personal Mobility because its source mechanics describe powered personal
transport rather than a carried tool.

`TW Devices` remains a direct top-level dropdown and retains its source-defined
category names as subgroups. Tests are maintained in
`tests/pages/tw-device-browser/`.
