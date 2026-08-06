# Character Sheet feature

`CharacterSheetPage.vue` is the stable page wrapper used by the suite. The implementation in `components/CharacterSheetApp.vue` is an auto-saving, fillable sheet modeled after the supplied two-page Palladium form and the Rifts Ultimate Edition character-building rules.

Keep feature-specific supporting code inside this directory:

- UI components: `components/`
- Character calculations and validation: `lib/`
- Static game data: `data/`
- Tests: `tests/pages/character-sheet/`

Percentage skills are canonical records in `data/skills.js`. Category lists reference those records by ID so cross-listed skills always share selection, bonus, and level values. Calculations live in `lib/calculations.js`; skill totals expose base, O.C.C., other, I.Q., and level contributions and are capped at 98%.
Unchecked skills have a total of 0; base proficiency and bonuses apply only after the skill is selected as trained.

Skill names expose keyboard-accessible hover/focus descriptions. Repeatable spoken-language and literacy records use the book's language list from `data/languages.js`; speaking and literacy remain separate skill selections with independent totals.

Always-on trained-skill effects are defined in `data/skillEffects.js` and feed effective attributes, S.D.C., attacks, combat bonuses, perception, movement, and skill-to-skill bonuses. Dice-based bonuses are entered once after rolling. Weapon-specific, movement-specific, and other conditional effects are displayed separately as situational bonuses instead of being added globally.

O.C.C./R.C.C. packages live in `data/occs.js`. The initial Combat Cyborg package applies its automatic skills and bonuses, required choices, starting bionic attributes, M.D.C., saves, abilities, and level-aware O.C.C. Related and Secondary Skill allowances. Skill records track whether training is automatic, an O.C.C. choice, O.C.C. Related, Secondary, or custom.

The UI has two modes. Create/Edit mode uses a left-side section navigator; orange tabs indicate incomplete or available choices and red tabs indicate invalid selections. Play mode renders build-time values as static references while preserving editable current-value trackers for H.P., S.D.C., M.D.C., armor M.D.C., I.S.P., P.P.E., and Chi.

The component does not need to manage navigation or create its own `<main>` element. The wrapper already provides both. Styles can be scoped inside the component to prevent collisions with other tools.
