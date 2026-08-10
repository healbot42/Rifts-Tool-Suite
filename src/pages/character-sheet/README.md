# Character Sheet feature

`CharacterSheetPage.vue` is the stable page wrapper used by the suite. The
implementation in `components/CharacterSheetApp.vue` is an auto-saving, fillable
sheet modeled after the supplied two-page Palladium form and the Rifts Ultimate
Edition character-building rules.

Keep feature-specific supporting code inside this directory:

- UI components: `components/`
- Character calculations and validation: `lib/`
- Shared static game data: `src/data/character/`
- Tests: `tests/pages/character-sheet/`

Percentage skills are canonical records in `src/data/character/skills.js`.
Category lists reference those records by ID so cross-listed skills always share
selection, bonus, and level values. Calculations live in `lib/calculations.js`;
skill totals expose base, O.C.C., other, I.Q., and level contributions and are
capped at 98%. Unchecked skills have a total of 0; base proficiency and bonuses
apply only after the skill is selected as trained.

Skill names expose keyboard-accessible hover/focus descriptions. Repeatable
spoken-language and literacy records use the book's language list from
`src/data/character/languages.js`; speaking and literacy remain separate skill
selections with independent totals.

Always-on trained-skill effects are defined in
`src/data/character/skillEffects.js` and feed effective attributes, S.D.C.,
attacks, combat bonuses, perception, movement, and skill-to-skill bonuses.
Dice-based bonuses are entered once after rolling. Weapon-specific,
movement-specific, and other conditional effects are displayed separately as
situational bonuses instead of being added globally.

O.C.C./R.C.C. packages live in `src/data/character/occs.js`. All eight
Men-at-Arms classes from the Rifts Ultimate Edition are available, with
source-page provenance, automatic skills, required skill choices, and
level-aware O.C.C. Related and Secondary Skill allowances. Merc Soldier and
Robot Pilot MOS bundles are fully data-driven: selecting an MOS applies its
automatic skills and exposes its required skill, equipment, and
elite-combat-type selections. Skill records track whether training is automatic,
an O.C.C. choice, O.C.C. Related, Secondary, or custom.

To add a complex bundle to another class, add one or more records to its
`specializations` array. Each record has a stable `id`, display `name`,
`automaticSkills` tuples, reusable `choices`, free-text `selections`, and
optional `requirements` and `notes`. The character UI renders this schema
generically; do not add class-ID branches. Existing saved characters without
specialization state migrate to an empty MOS selection and keep all other
character data.

Starting equipment packages live in `src/data/character/startingEquipment.js`.
They use stable class/MOS and entry IDs, equipment section types, quantities,
choice-oriented names, notes, and source-page provenance. Applying a class or
MOS reconciles missing package entries by stable ID and never overwrites an
existing generated entry or a user-created item, so imported and older saved
characters remain editable. Add future equipment through this shared schema; do
not add class-ID branches to the character UI.

No Men-at-Arms starting item in the Ultimate Edition is a confirmed identical
record in the canonical Techno-Wizard device catalog. Do not attach a catalog
image based only on a similar generic weapon or item name.

Stat-bearing owned assets use the canonical records in
`src/data/character/assetCatalog.js` and the saved reference/snapshot/current
state helpers in `lib/ownedAssets.js`. The catalog ID identifies the rules
record, the snapshot preserves older characters when a catalog record changes or
is retired, and `current` holds mutable play values such as remaining main
M.D.C. and ammunition. Class and MOS requirements use the same typed dropdowns
as the manual Add Asset flow; play cards render only assets the character
actually owns. Extend the catalog and requirement maps instead of branching on
class IDs in the UI.

The Equipment page catalog is intentionally populated one sourcebook category at
a time. `src/data/character/rangedWeapons.js` currently provides the twelve
ranged weapons from the Ultimate Edition equipment section. `tools.js` adds the
three Wilk's cutting and surgical tools as individual Tools entries, and
`equipmentCatalog.js` adapts both catalogs for the shared picker. Each added
entry stores its complete statistics snapshot so modal, edit, and play views
stay useful even if the canonical data changes later. Class-granted starting
equipment and owned assets remain separate systems; they are not bulk-listed in
the picker. Manual Add controls remain available and catalog additions append.

The UI has two modes. Create/Edit mode uses a left-side section navigator;
orange tabs indicate incomplete or available choices and red tabs indicate
invalid selections. Play mode renders build-time values as static references
while preserving editable current-value trackers for H.P., S.D.C., M.D.C., armor
M.D.C., I.S.P., P.P.E., and Chi.

The component does not need to manage navigation or create its own `<main>`
element. The wrapper already provides both. Styles can be scoped inside the
component to prevent collisions with other tools.
