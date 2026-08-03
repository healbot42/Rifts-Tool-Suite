# Techno-Wizard Calculator feature

This directory is the complete Techno-Wizard Calculator feature module.

- `TwCalculatorPage.vue`: stable page wrapper used by suite navigation
- `components/TwCalculatorApp.vue`: calculator UI and feature orchestration
- `tw-calculator.css`: component-scoped calculator styling
- `data/spells.js`: runtime spell and gem catalog
- `data/constructionModifiers.js`: construction modifiers and bonuses
- `data/spell-descriptions.json`: full descriptions loaded for PDF reports
- `lib/pdfReport.js`: device PDF generation
- `lib/`: calculation, search, export, and runtime-compatibility helpers
- `index.js`: stable lazy-loading entry point used by the suite

Code outside this directory should import only the feature's `index.js`. The wrapper imports the implementation from `components/`; internal files use relative imports so the module remains self-contained and movable.

Tests are centralized in `tests/pages/tw-calculator/`. The calculator supports variable spell costs, fixed-order final summaries, construction modifiers, responsive price/activation graphs, JSON persistence/export, and themed or printer-friendly PDF reports containing spell descriptions.
