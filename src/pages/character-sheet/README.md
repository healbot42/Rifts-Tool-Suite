# Character Sheet feature

`CharacterSheetPage.vue` is the stable page wrapper used by the suite. Add or paste the generated character-sheet implementation into `components/CharacterSheetApp.vue`.

Keep feature-specific supporting code inside this directory:

- UI components: `components/`
- Character calculations and validation: `lib/`
- Static game data: `data/`
- Tests: `tests/pages/character-sheet/`

The component does not need to manage navigation or create its own `<main>` element. The wrapper already provides both. Styles can be scoped inside the component to prevent collisions with other tools.
