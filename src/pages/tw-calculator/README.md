# Techno-Wizard Calculator feature

This directory is the complete Techno-Wizard Calculator feature module.

- `TwCalculatorPage.vue`: stable page wrapper used by suite navigation
- `components/TwCalculatorApp.vue`: calculator UI and feature orchestration
- `tw-calculator.css`: component-scoped calculator styling
- `../../data/magic/spells.js`: shared runtime spell and gem catalog
- `../../data/magic/constructionModifiers.js`: shared construction modifiers and
  bonuses
- `../../data/magic/spell-descriptions.json`: shared full descriptions loaded
  lazily for PDF reports
- `lib/pdfReport.js`: device PDF generation
- `lib/`: calculation, search, export, and runtime-compatibility helpers
- `../../lib/persistence/`: async saved-device repository with IndexedDB-first
  persistence and legacy localStorage compatibility
- `index.js`: stable lazy-loading entry point used by the suite

Code outside this directory should import only the feature's `index.js`. The
feature consumes canonical catalogs from `src/data/magic/`; it does not own
those shared records.

Tests are centralized in `tests/pages/tw-calculator/`. The calculator supports
variable spell costs, fixed-order final summaries, construction modifiers,
responsive price/activation graphs, JSON persistence/export, and themed or
printer-friendly PDF reports containing spell descriptions.
