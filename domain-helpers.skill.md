# Domain Helpers Reference

Purpose

- Help AI agents maintain the pure calculator logic already extracted into
  `src/pages/tw-calculator/lib/calculations.js` while keeping UI orchestration
  in `components/TwCalculatorApp.vue`.
- Keep formula changes unit-tested and separate from Vue presentation code.

When to use

- Use this skill when working on refactors, bug fixes, or feature work that
  touches device construction/P.P.E. calculations.
- Prefer adding or updating pure functions in
  `src/pages/tw-calculator/lib/calculations.js`.

What to include

- Calculation functions for chain base P.P.E., activation, storage modifier,
  construction cost, construction hours, gem totals, and summary values.
- Input and output shapes that match the reactive state in
  `components/TwCalculatorApp.vue`.
- Unit tests in `tests/pages/tw-calculator/calculations.test.js`.

How to behave

- Keep `components/TwCalculatorApp.vue` focused on UI and state management.
- Avoid duplicating formula logic between the component and helpers.
- Preserve existing saved state keys and localStorage behavior.
- Round only final summary values unless the source rule requires earlier
  rounding.
