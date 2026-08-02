# Domain Helpers Skill

Purpose
- Help AI agents refactor the domain logic in `src/App.vue` into a small reusable helper module.
- Enable future unit testing and easier maintenance of the Rifts Techno-Wizard calculator.

When to use
- Use this skill when working on refactors, bug fixes, or feature work that touches device construction/P.P.E. calculations.
- Prefer extracting pure calculation functions from the Vue component into `src/lib/domain-helpers.js`.

What to include
- Calculation functions for chain base P.P.E., activation, storage modifier, construction cost, construction hours, gem totals, and summary values.
- Input and output shapes that match the reactive state shape used in `src/App.vue`.
- Unit tests for the extracted helpers if tests are added later.

How to behave
- Keep the Vue component focused on UI and state management.
- Avoid duplicating formula logic between the component and helpers.
- Preserve existing saved state keys and localStorage behavior.
