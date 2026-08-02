# Test suite

All automated tests live in this directory so they can be found and maintained without searching through production code.

## Layout

- `general/`: suite-wide behavior such as navigation and shared utilities.
- `pages/tw-calculator/`: calculator formulas, spell search, and PDF export.
- `pages/tw-device-browser/`: device catalog, search, statistics, and data-integrity checks.
- Add future page tests under `pages/<page-name>/`.

## Commands

```bash
npm test
npm test -- --watch
npx vitest run tests/pages/tw-calculator
```

Test files import the production module they exercise from `src/`. Keep data-integrity assertions with the page that owns the data. Use descriptive test names that state the rule being protected, and update the applicable page test whenever a schema, calculation, navigation route, or export format changes.
