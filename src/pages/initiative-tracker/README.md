# Initiative Tracker feature

`InitiativeTrackerPage.vue` is the stable page wrapper used by the suite.
`components/InitiativeTrackerApp.vue` provides the interactive roster, rolling,
manual initiative, and action-pass controls.

The live-order column is always present. Before a round starts it previews one
initiative pass in roster-addition order; starting the round replaces that
preview with the complete rolled action sequence.

Combat state supports undo, next-round action debt, data-driven timed
conditions, two-action moves, initiative loss, temporarily leaving combat,
shared initiative rolls for named groups, and encounter roster presets. The Add
Combatant dialog can create numbered groups in one operation, and the current
locally saved Character Sheet character can be imported as a PC.

Rifts conditions and multi-action moves are declared beside the system rules in
`lib/initiativeEngine.js`. Each condition owns its concise source-rule tooltip,
default duration, action penalty or cap, and initiative effect. Add future game
systems by supplying equivalent data rather than branching in the component.

Keep feature-specific supporting code inside this directory:

- UI components: `components/`
- Calculation and sorting helpers: `lib/`
- Shared static game data: `src/data/<domain>/`
- Tests: `tests/pages/initiative-tracker/`

`lib/initiativeEngine.js` is intentionally independent of Vue. Game-specific
configuration supplies the die, labels, round duration, and tie policy. The UI
currently fixes that configuration to Rifts Ultimate Edition and hides the game
selector until another supported system is added.

Rifts Ultimate Edition behavior follows the combat sequence on printed pages 339
and 341: initiative is rolled once per 15-second melee round, ties reroll, and
turns continue in initiative order until every combatant has spent all
attacks/actions. Successful sneak and long-range attacks can be represented by
entering the appropriate initiative result manually.

The component does not need to manage navigation or create its own `<main>`
element. The wrapper already provides both. Styles can be scoped inside the
component to prevent collisions with other tools.
