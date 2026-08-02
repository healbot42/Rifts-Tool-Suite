# Rifts Techno-Wizard Device Calculator

A small Vue 3 calculator based on the Techno-Wizard construction guidelines in *Rifts Ultimate Edition*, especially pages 129–132.

## Run

```bash
npm install
npm run dev
```

## Implemented calculations

- Spell-chain base P.P.E. construction cost.
- Standard, ley-line-only, and ley-line hybrid multipliers.
- Activation cost for applicable devices.
- Single-use device adjustments.
- Construction time for new devices or modifications to existing technology.
- Physical construction cost, gem cost, form cost, and P.P.E. storage modifiers.
- Multiple functions/spell chains.
- Browser local-storage save and JSON export.

The book leaves several decisions to the G.M., including spell-chain composition, exact effects, gem requirements and prices, limitations, prototypes, and mistakes. Those values remain editable rather than being guessed by the app.

Rifts and related terms are trademarks of Palladium Books. This unofficial fan utility contains no reproduced rulebook text or artwork and requires the rulebook to use correctly.

## Troubleshooting

If Vite reports that it cannot parse `.vue` files, confirm that `vite.config.js` exists and contains the Vue plugin configuration. Then delete `node_modules` and `package-lock.json`, run `npm install`, and restart the dev server.
