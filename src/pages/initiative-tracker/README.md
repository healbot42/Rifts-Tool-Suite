# Initiative Tracker feature

`InitiativeTrackerPage.vue` is the stable page wrapper used by the suite. Add or paste the generated tracker implementation into `components/InitiativeTrackerApp.vue`.

Keep feature-specific supporting code inside this directory:

- UI components: `components/`
- Calculation and sorting helpers: `lib/`
- Static game data: `data/`
- Tests: `tests/pages/initiative-tracker/`

The component does not need to manage navigation or create its own `<main>` element. The wrapper already provides both. Styles can be scoped inside the component to prevent collisions with other tools.
