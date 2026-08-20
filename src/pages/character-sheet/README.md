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
- Local autosave/import: the character repository in `src/lib/persistence/`

Percentage skills are canonical records in `src/data/character/skills.js`.
Category lists reference those records by ID so cross-listed skills always share
selection, bonus, and level values. Calculations live in `lib/calculations.js`;
skill totals expose base, O.C.C., other, I.Q., and level contributions and are
capped at 98%. Unchecked skills have a total of 0; base proficiency and bonuses
apply only after the skill is selected as trained.

Skill names expose keyboard-accessible hover/focus descriptions. Repeatable
spoken-language and literacy records use the book's language list from
`src/data/character/languages.js`; speaking and literacy remain separate skill
selections with independent totals. Class language packages declare
`languages.otherCount` and `languages.literacyOtherCount` instead of repeating
the same generic skill ID in ordinary class choices. `literacyOtherBonus`
records the class bonus separately from spoken-language `otherBonus`.

Always-on trained-skill effects are defined in
`src/data/character/skillEffects.js` and feed effective attributes, S.D.C.,
attacks, combat bonuses, perception, movement, and skill-to-skill bonuses.
Dice-based bonuses are entered once after rolling. Weapon-specific,
movement-specific, and other conditional effects are displayed separately as
situational bonuses instead of being added globally.

Attribute generation is defined in `src/data/character/attributeRules.js`. Human
characters use the Rifts Ultimate Edition 3D6 method, its bounded
exceptional-attribute dice, and its player- assigned low-attribute compensation.
The sheet records every die, applies the two low-attribute bonuses only to
distinct legal attributes, and leaves all resulting fields editable. Structured
O.C.C. requirements highlight unmet minimums; recommended values are labeled
without being treated as invalid. Crazy, Headhunter, and Juicer class attribute,
H.P., and S.D.C. dice are rolled through the same auditable operation format.
Each class declares a `generationStrategy`; unsupported future R.C.C. strategies
fail explicitly until their own source-backed generator is implemented instead
of silently using the human rules.

O.C.C./R.C.C. packages live in `src/data/character/occs.js`. All eight
Men-at-Arms classes and all eight Adventurers & Scholars classes from the Rifts
Ultimate Edition are available, with source-page provenance, automatic skills,
required skill choices, and level-aware O.C.C. Related and Secondary Skill
allowances. Merc Soldier and Robot Pilot MOS bundles are fully data-driven:
selecting an MOS applies its automatic skills and exposes its required skill,
equipment, and elite-combat-type selections. Skill records track whether
training is automatic, an O.C.C. choice, O.C.C. Related, Secondary, or custom.

To add a complex bundle to another class, add one or more records to its
`specializations` array. Each record has a stable `id`, display `name`,
`automaticSkills` tuples, reusable `choices`, free-text `selections`, and
optional `requirements` and `notes`. The character UI renders this schema
generically; do not add class-ID branches. Existing saved characters without
specialization state migrate to an empty MOS selection and keep all other
character data.

Starting equipment packages live in `src/data/character/startingEquipment.js`.
They use stable class/MOS and entry IDs, equipment section types, quantities,
explicit choice metadata, notes, and source-page provenance. Source-listed kits
are decomposed into distinct inventory records instead of comma-delimited
summary records. Applying a class or MOS reconciles package entries by stable
ID, removes superseded generated bundle records, and preserves user-created or
customized records so imported and older saved characters remain editable. Add
future equipment through this shared schema; do not add class-ID branches to the
character UI.

Choice-bearing starting records use `choice.prompt`. The Equipment tab collects
them in its Required starting equipment choices section while keeping each
selected record in the normal inventory section. Each choice button opens the
shared Armory modal with the legal subset defined by
`legalStartingEquipmentEntries`; confirming a record fills the existing managed
starting item instead of adding a duplicate inventory entry. Choice controls are
grouped at the top of their matching Weapons, Armor, Vehicles, or Items section;
the managed choice record is not rendered again as an editable equipment card.
Choices that grant multiple items expand into distinct selection records. The
one-weapon-per-W.P. grant expands from the character's trained proficiencies and
filters each slot for that proficiency. When the audited Armory has no legal
named record, the modal offers one explicit custom-entry form instead of an
empty or misleading result set. Fixed class equipment is matched conservatively
to exact or explicitly aliased Armory records during reconciliation, which
supplies its statistics and catalog identity without guessing for generic
entries.

No Men-at-Arms starting item in the Ultimate Edition is a confirmed identical
record in the canonical Techno-Wizard device catalog. Do not attach a catalog
image based only on a similar generic weapon or item name.

Power armor, robots, and vehicles use the same Armory-backed equipment records
and current-value trackers as other equipment. On load, the one-time
compatibility migration converts records from the former `ownedAssets` system
and clears that legacy state without creating a duplicate class-granted item.

The Equipment page catalog uses the complete shared Armory exported by
`src/data/items/armory.js`, including Rifts Ultimate Edition equipment and
Techno-Wizard devices. `equipmentCatalog.js` classifies each canonical record
for the character inventory and adds character-only quantity and notes options.
The modal uses the Armory's category tree, search metadata, artwork, rules, and
sourcebook text. Armory-linked equipment refreshes its immutable rules fields
from the canonical catalog during hydration and before Play mode; character
notes and current ammunition or durability remain saved character state. Manual
Add controls remain available and catalog additions append.

Weapons use the same compact roster in Create/Edit and Play modes. Each
collapsed row provides the weapon name and family, damage, range, and
current/maximum ammunition. Expanding a row reveals its complete Armory record,
character notes, and current-value controls.

The Magic tab stores known invocations by the stable IDs exported from
`src/data/magic/invocations.js`. Its picker searches and filters the complete
invocation catalog by level, prevents duplicate additions, and previews the full
source-backed rules. Edit mode can add and remove spells; both Edit and Play
group them by level and alphabetize within each level, show only name, P.P.E.
cost, and level in the roster, and open full details on selection. Play mode is
intentionally read-only.

The UI has two modes. Create/Edit mode uses a left-side section navigator;
orange tabs indicate incomplete or available choices and red tabs indicate
invalid selections. Play mode renders build-time values as static references
while preserving editable current-value trackers for H.P., S.D.C., M.D.C., armor
M.D.C., I.S.P., P.P.E., and Chi.

The component does not need to manage navigation or create its own `<main>`
element. The wrapper already provides both. Styles can be scoped inside the
component to prevent collisions with other tools.
