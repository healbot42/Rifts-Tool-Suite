# Copilot Instructions

Purpose
- Provide AI agents a concise top-level guide for working on this repo.

What to do first
- Run `npm install` in the repo root.
- Start the app locally with `npm run dev` to verify UI behavior.
- Review `src/App.vue` for the main app logic and `src/spells.js` for the spell list.

Build and preview
- `npm run build` to build production assets.
- `npm run preview` to serve the built app locally for verification.

Special notes
- This is a static Vue 3 + Vite SPA.
- The key reactive logic is currently implemented in `src/App.vue`.
- State is persisted in browser localStorage under `rifts-tw-device`.
- There are no tests in the repo yet.

See also
- Root `AGENTS.md` for agent-specific guidance.
