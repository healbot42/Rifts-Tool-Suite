# Agent Instructions (AGENTS.md)

Purpose
- Help AI coding agents quickly understand how to run, build, and navigate this small Vue 3 + Vite app.

Quick commands
- Install dependencies: `npm install`
- Run dev server: `npm run dev` (starts Vite)
- Build for production: `npm run build`
- Preview production build: `npm run preview`

Project overview
- Framework: Vue 3 (Composition API, `<script setup>`)
- Bundler/dev server: Vite (see `vite.config.js`)
- No backend: static SPA

Key files
- Entry: `src/main.js` — mounts `App.vue`.
- UI + domain logic: `src/App.vue` — main single-file component implementing the calculator.
- Canonical spell data and domain constants: `src/spells.js`.
- Styling: `src/style.css`.
- Build config: `vite.config.js`, `package.json` scripts.

Conventions & notes for agents
- Use `npm run dev` to run the app locally; tests are not present.
- The app persists a saved device under localStorage key `rifts-tw-device`.
- Domain logic (calculations for P.P.E., activation, hours, credits, gems) lives in `src/App.vue` and uses pure JS functions and computed properties. Prefer extracting logic to small, testable modules if adding tests.
- If Vite cannot parse `.vue` files, check `vite.config.js` (Vue plugin) and follow the Troubleshooting section in `README.md`.

Suggested next agent customizations
- `create-skill: domian-helpers` — expose small functions from `App.vue` into `src/lib/` so agents can run unit tests and validate calculations.
- `create-instruction` to document release/build steps and recommended Node/npm versions.

Links
- README: see [README.md](README.md)
