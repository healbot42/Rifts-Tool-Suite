# Test suite

All automated tests live in this directory so they can be found and maintained
without searching through production code.

## Layout

- `general/`: suite-wide behavior such as navigation, release metadata,
  shared-data integrity, persistence repositories, and structure invariants.
- `pages/tw-calculator/`: calculator formulas, spell search, and PDF export.
- `pages/tw-device-browser/`: device catalog, search, statistics, and
  data-integrity checks.
- `pages/character-sheet/`: character calculations, skill data, and O.C.C.
  package integrity.
- `pages/initiative-tracker/`: initiative ordering, ties, and action-pass
  sequencing.
- `warhammer-deal-bot/`: Python deal matching, pricing, persistence, eBay
  parsing, and email behavior for the isolated bot subproject.
- Add future page tests under `pages/<page-name>/`.

## Commands

```bash
npm test
npm run lint
npm run format:check
npm run test:watch
npm run test:general
npm run test:tw-calculator
npm run test:tw-devices
npm run test:character-sheet
npm run test:initiative-tracker
npm run test:deal-bot
npm run assets:check
npm run check
```

Test files import the production module they exercise from `src/`. Put
cross-page shared-data integrity assertions in `tests/general/`; keep
page-specific behavior assertions with the consuming page. Use descriptive test
names that state the rule being protected, and update the applicable test
whenever a schema, calculation, navigation route, or export format changes.

Vitest is configured to discover tests only under `tests/`. `npm run check` is
the preferred final verification because it runs ESLint, Ruff, formatting
checks, the complete suite, and the production build.

`general/projectStructure.test.js` protects the centralized-test layout, page
wrapper/component convention, synchronized release versions, shared-data layout,
and required custom-agent fields. Update it deliberately when changing those
architectural conventions.

`npm run assets:check` verifies that every referenced RUE Armory image exists
and reports unexpected unused images. Its small explicit allowlist preserves
known unmatched source art without silently accepting future orphaned assets.
