export const RIFTS_CONSTRUCTION_MODIFIERS = Object.freeze([
  { id: 'prototype-schematics', label: 'Prototype schematics', percent: 20, note: 'Rough plans and notes for a work in progress.' },
  { id: 'another-tw-schematics', label: "Working from another Techno-Wizard's schematics", percent: 10 },
  { id: 'bad-schematics', label: 'Bad schematics', percent: 50, note: 'A likely design mistake or fatal error.' },
  { id: 'unclear-schematics', label: 'Sketchy or unclear schematics', percent: 30 },
  { id: 'total-recall-schematics', label: 'Total Recall used in place of schematics', percent: 10 },
  { id: 'no-schematics', label: 'No schematics', percent: 80, note: 'A new or uncertain design concept.' },
  { id: 'miniaturization', label: 'Miniaturization', percent: 20, repeatable: true, unitLabel: '10% reductions', note: 'Apply once per 10% reduction below the base size.' },
  { id: 'missing-appropriate-skills', label: 'Adding Techno-Wizardry without the appropriate skills', percent: 20, repeatable: true, unitLabel: 'missing skills', note: 'Cumulative for each required skill the creator does not know.' },
  { id: 'rush-job', label: 'Rush job', percent: 25, note: 'Work completed in two-thirds of the normal time.' },
  { id: 'extremely-rushed', label: 'Extremely rushed', percent: 50, note: 'Work completed in one-third of the normal time.' },
  { id: 'low-magic-environment', label: 'Low magic environment', percent: 15, note: 'Applies when most construction time is spent in low magic.' },
  { id: 'alien-tw-device', label: 'Working on an alien Techno-Wizard device', percent: 40 },
  { id: 'unknown-common-primary', label: 'Unknown common primary spell', percent: 20 },
  { id: 'unknown-specialist-primary', label: 'Unknown specialist primary spell', percent: 30 },
  { id: 'unknown-common-secondary', label: 'Unknown common secondary spell', percent: 15, repeatable: true, unitLabel: 'spells', note: 'Apply once for every applicable secondary spell.' },
  { id: 'unknown-specialist-secondary', label: 'Unknown specialist secondary spell', percent: 20, repeatable: true, unitLabel: 'spells', note: 'Apply once for every applicable secondary spell.' },
])

export const CONSTRUCTION_MODIFIER_BY_ID = new Map(RIFTS_CONSTRUCTION_MODIFIERS.map(modifier => [modifier.id, modifier]))

export const RIFTS_CONSTRUCTION_BONUSES = Object.freeze([
  { id: 'proven-schematic', label: 'Schematic of a proven, working Techno-Wizard device', percent: 15 },
  { id: 'disassemble-working-device', label: 'Disassembling a working Techno-Wizard device', percent: 10 },
  { id: 'disassemble-similar-device', label: 'Disassembling a similar Techno-Wizard device', percent: 5 },
  { id: 'working-prototype', label: 'Working prototype model', percent: 5 },
  { id: 'master-proven-design', label: 'Working under an experienced Techno-Wizard master - proven design', percent: 20 },
  { id: 'master-unproven-design', label: 'Working under an experienced Techno-Wizard master - unproven design', percent: 10 },
  { id: 'taking-time', label: 'Taking time', percent: 15, note: 'Adds one-third to construction time; cannot be combined with another construction-time modifier.' },
  { id: 'at-your-leisure', label: 'At your leisure', percent: 30, note: 'Doubles construction time; cannot be combined with another construction-time modifier.' },
  { id: 'assistant-skill', label: "Assisting Techno-Wizard's construction skill", percent: 1, repeatable: true, unitLabel: '10% skill increments', note: 'Apply 1% for every full 10% of the assistant skill; round fractions down.' },
  { id: 'device-level-reduced', label: 'Device level reduced', percent: 5, repeatable: true, unitLabel: 'levels', note: 'Apply once per level reduced; the device cannot be reduced below level one.' },
])

export const CONSTRUCTION_BONUS_BY_ID = new Map(RIFTS_CONSTRUCTION_BONUSES.map(bonus => [bonus.id, bonus]))
