# Agent Instructions

## Purpose

Use this file to make safe, consistent updates to Rifts Tool Suite v0.0.1, a static Vue 3 and Vite application. Preserve the separation between suite-wide code and individual tool pages.

The reusable maintainer-agent brief and starter prompt are documented in `docs/MAINTAINER_AGENT.md`.

## Required verification

Run both commands after implementation changes:

```bash
npm test
npm run build
```

Tests live only under `tests/`; do not place new test files inside `src/`. Put suite-wide tests in `tests/general/` and page-specific tests in `tests/pages/<page-name>/`.

## Architecture

- `src/main.js`: mounts the application.
- `src/App.vue`: suite-level ribbon, hash navigation, lazy page loading, and release footer.
- `src/style.css`: site-wide dark blue/orange theme and shared UI rules.
- `src/lib/navigation.js`: valid page IDs and hash parsing.
- `src/pages/<page-name>/`: isolated feature modules. Other pages should import only a feature's `index.js`.
- `tests/`: centralized test suite organized into `general/` and `pages/`.
- `scripts/`: sourcebook extraction, catalog generation, and image optimization.
- `public/assets/tw-devices/`: runtime device images.
- `dist/`: tracked production build output; rebuild it when application code or data changes.

## Page modules

- `tw-calculator`: stable `TwCalculatorPage.vue` wrapper, `components/TwCalculatorApp.vue` implementation, runtime catalogs in `data/`, and calculation/export helpers in `lib/`.
- `tw-device-browser`: searchable device catalog, standardized statistics, and device art.
- `initiative-tracker`: isolated placeholder.
- `character-sheet`: isolated placeholder.

Keep page-specific components, data, helpers, and styles inside that page directory. Keep shared navigation and theme code at suite level. Pages are lazy-loaded for mobile performance.

## TW Calculator rules

- Saved devices use localStorage key `rifts-tw-device`; preserve backward compatibility when changing state.
- Pure formulas belong in `src/pages/tw-calculator/lib/calculations.js`.
- Spell search belongs in `lib/spellSearch.js` and must support substring matches.
- `data/spells.js` contains runtime spell and gem metadata; `data/spell-descriptions.json` stores full descriptions used by PDF export.
- PDF generation belongs in `lib/pdfReport.js`; construction modifier catalogs belong in `data/constructionModifiers.js`.
- Round only final displayed totals upward unless a rule explicitly says otherwise. Preserve intermediate precision.
- Keep themed and printer-friendly PDF outputs working.

## TW device catalog rules

- `data/tw-devices.json` is canonical runtime catalog data.
- Statistics cards use the fixed order tested in `tests/pages/tw-device-browser/deviceSearch.test.js`.
- Keep `Price` (credits), `Activation / Reload Cost` (P.P.E./I.S.P.), and `Construction Cost` separate.
- Reload energy belongs in `Activation / Reload Cost` and should be identified as reload energy.
- Device display names omit author and sourcebook parentheticals; meaningful qualifiers such as `(new)` and `(TK)` remain.
- Do not restore the removed statistics length cutoff. Concise summaries must retain all relevant mechanics.

After sourcebook-data changes, run the relevant refresh scripts followed by:

```bash
node scripts/extract-device-statistics.mjs
```

Never commit the local sourcebook PDFs or full-resolution PNG generations. The `.gitignore` excludes them.

## Versioning

The visible version appears in the `src/App.vue` footer and must match `package.json` and the root package entry in `package-lock.json`. Update documentation when releasing a new version.

## Git safety

Preserve unrelated user changes. Do not reset or discard a dirty worktree. Commit generated `dist` changes together with the source changes that produced them.
