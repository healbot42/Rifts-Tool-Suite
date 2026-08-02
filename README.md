# Rifts Tool Suite

Rifts Tool Suite v0.0.1 is a dark-mode Vue 3 application containing tools for Rifts gameplay and Techno-Wizard device creation. It is an unofficial fan utility.

## Available pages

- **TW Calculator:** builds multi-function Techno-Wizard devices, calculates construction P.P.E., activation P.P.E., construction time, skill modifiers, gem requirements, and credit totals, and exports themed or printer-friendly PDF reports.
- **TW Devices:** searches a categorized catalog of devices from the supplied sourcebooks. Each entry includes a themed line-art image, standardized quick-reference statistics, and the cleaned sourcebook entry.
- **Initiative Tracker:** isolated placeholder ready for a future implementation.
- **Character Sheet:** isolated placeholder ready for a future implementation.

The top ribbon uses URL hashes to switch between lazy-loaded page modules. Site-wide colors live in `src/style.css`; page-specific code lives in `src/pages/<page-name>/`.

## Setup and commands

```bash
npm install
npm run dev
npm test
npm run build
npm run preview
```

Automated tests are centralized under `tests/`. See `tests/README.md` for organization and maintenance instructions.

For future automated maintenance, see `docs/MAINTAINER_AGENT.md`. Repository-specific coding-agent rules are in `AGENTS.md`.

## TW Calculator capabilities

- Fixed and variable spell P.P.E. modes.
- Standard, ley-line-only, ley-line hybrid, and single-use devices.
- Multiple functions and spell chains.
- Gem assignment and price-per-carat calculations.
- Construction modifiers applied to skill, time, or cost as directed by the rules.
- Separate totals for construction cost before gems and gem-inclusive cost.
- Responsive price and activation graphs with tooltips.
- Local save data under `rifts-tw-device` and JSON export.
- Full-color and printer-friendly PDF reports containing calculations, gems, and spell descriptions.

## TW device catalog maintenance

Canonical catalog data is in `src/pages/tw-device-browser/data/tw-devices.json`. After refreshing source descriptions, run:

```bash
python scripts/refresh-book-magic-entries.py
python scripts/refresh-rue-device-entries.py
node scripts/extract-device-statistics.mjs
```

The statistics extractor uses a fixed card order and separates purchase price, activation/reload cost, and construction cost. Author and sourcebook parentheticals are removed from display names. Optimized device images live in `public/assets/tw-devices/`.

## Troubleshooting

If Vite cannot parse `.vue` files, confirm `vite.config.js` includes the Vue plugin. Reinstall dependencies only after checking that configuration. Full-resolution source images, PDFs, caches, local environments, and signing keys are excluded by `.gitignore`.

Rifts and related terms are trademarks of Palladium Books. This project is not affiliated with or endorsed by Palladium Books.
