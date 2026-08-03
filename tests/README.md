# Test suite

All automated tests live in this directory so they can be found and maintained without searching through production code.

## Layout

- `general/`: suite-wide behavior such as navigation, release metadata, and repository-structure invariants.
- `pages/tw-calculator/`: calculator formulas, spell search, and PDF export.
- `pages/tw-device-browser/`: device catalog, search, statistics, and data-integrity checks.
- Add future page tests under `pages/<page-name>/`.

## Commands

```bash
npm test
npm run test:watch
npm run test:general
npm run test:tw-calculator
npm run test:tw-devices
npm run check
```

Test files import the production module they exercise from `src/`. Keep data-integrity assertions with the page that owns the data. Use descriptive test names that state the rule being protected, and update the applicable page test whenever a schema, calculation, navigation route, or export format changes.

Vitest is configured to discover tests only under `tests/`. `npm run check` is the preferred final verification because it runs the complete suite and production build.

`general/projectStructure.test.js` protects the centralized-test layout, page wrapper/component convention, synchronized release versions, and required maintenance-agent fields. Update it deliberately when changing those architectural conventions.
