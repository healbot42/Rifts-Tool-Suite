# Techno-Wizard Calculator feature

This directory is the complete Techno-Wizard Calculator feature module.

- `TwCalculator.vue`: page UI and feature orchestration
- `tw-calculator.css`: component-scoped calculator styling
- `spells.js`: spell and gem catalog
- `constructionModifiers.js`: construction modifiers and bonuses
- `pdfReport.js`: device PDF generation
- `data/`: spell descriptions and source-data notes
- `lib/`: calculation/search helpers and their unit tests
- `index.js`: stable lazy-loading entry point used by the suite

Code outside this directory should import only the feature's `index.js`. Internal files should use relative imports so the module remains self-contained and movable.
