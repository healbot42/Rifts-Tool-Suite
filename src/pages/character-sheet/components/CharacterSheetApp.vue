<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import CatalogPickerModal from '../../../components/CatalogPickerModal.vue'
import CatalogEntryDetails from '../../../components/CatalogEntryDetails.vue'
import SpellDetails from './SpellDetails.vue'
import SpellPickerModal from './SpellPickerModal.vue'
import {
  groupInvocationsByLevel,
  invocations,
  invocationsById,
} from '../../../data/magic/invocations.js'
import {
  skillCategories,
  skills,
  skillsById,
} from '../../../data/character/skills.js'
import { languages, languageRules } from '../../../data/character/languages.js'
import {
  skillEffects,
  skillSynergies,
} from '../../../data/character/skillEffects.js'
import {
  occs,
  occsById,
  secondaryEligible,
} from '../../../data/character/occs.js'
import {
  reconcileStartingEquipment,
  specializationEquipmentPackages,
  startingEquipmentPackages,
} from '../../../data/character/startingEquipment.js'
import {
  applyEquipmentCatalogSelection,
  armoryDefaultsForCatalogSelection,
  characterEquipmentCatalog,
  legalStartingEquipmentEntries,
} from '../../../data/character/equipmentCatalog.js'
import {
  attributeDefinitions,
  attributeOrder,
  attributeRulesSource,
  evaluateAttributeRequirements,
  generateAttributes,
  rollOccAttributeBonuses,
} from '../../../data/character/attributeRules.js'
import {
  attributeBonus,
  hitPoints,
  movement,
  skillTotal,
  weightLimits,
} from '../lib/calculations.js'
import { skillDescription } from '../lib/skillDescriptions.js'
import {
  categoryChoiceAvailable,
  countsTowardSkillAllowance,
  skillChoiceAvailable,
} from '../lib/skillAvailability.js'
import {
  blankSpecializationState,
  normalizeSpecializationState,
  specializationById,
  specializationHasDuplicateChoices,
  specializationIncomplete,
  specializationSelectionVisible,
} from '../lib/specializations.js'
import '../character-sheet.css'
import {
  persistenceErrorMessage,
  repositories,
} from '../../../lib/persistence/index.js'

const storageStatus = ref('')

function reportStorageFailure(result) {
  console.error('Character Sheet local storage failed', result.error)
  storageStatus.value = persistenceErrorMessage(result.error, 'The character')
}
const OCC_TOOLTIP =
  'Select an Occupational or Racial Character Class. Its package populates ' +
  'automatic skills, bonuses, choices, and abilities.'
const RELATED_SKILLS_TOOLTIP =
  'O.C.C. Related Skills chosen at the current level. New selections begin ' +
  'at first-level proficiency.'
const SECONDARY_SKILLS_TOOLTIP =
  'Secondary Skills chosen at the current level. These receive no O.C.C. ' +
  'bonus, but may receive an I.Q. bonus.'
const SPECIALIZATION_TOOLTIP =
  'Choose the class specialization. Its automatic skills, skill choices, ' +
  'requirements, and other required selections come from shared class data.'
const TRAINING_TOOLTIP =
  'Choose how this skill was learned. This controls slot counters and the ' +
  'class bonus.'

function specializationSelectionKey(specialization, selection, index) {
  return `${specialization.id}-${selection.id}-${index}`
}

function nativeLanguageTooltip(occ) {
  const proficiency = occ.languages.nativeBase + occ.languages.nativeBonus
  return (
    `Native Language is automatic at ${proficiency}% before level ` +
    'advancement and applicable I.Q. bonus.'
  )
}

function otherLanguageTooltip(occ) {
  return (
    `Choose each additional spoken language with a +${occ.languages.otherBonus}% ` +
    'O.C.C. bonus.'
  )
}

function literacyLanguageTooltip(occ) {
  return (
    `Choose each required literacy with a +${occ.languages.literacyOtherBonus}% ` +
    'O.C.C. bonus.'
  )
}

function occOtherLanguageCount(occ) {
  return Math.max(1, Number(occ?.languages?.otherCount) || 1)
}

function occLiteracyCount(occ) {
  return Math.max(0, Number(occ?.languages?.literacyOtherCount) || 0)
}

function equipmentActionTooltip(action, section) {
  const item = section.singular.toLowerCase()
  return action === 'add'
    ? `Add another ${item} to this character.`
    : `Remove this ${item} from the character.`
}

function carriedEquipmentTooltip(section) {
  const owner = state.identity.name || 'this character'
  return `${section.singular} carried by ${owner}.`
}

function equipmentMaximumTooltip(label, maximum) {
  return `Current ${label}. Maximum: ${maximum}.`
}

const blank = () => ({
  identity: {
    name: '',
    race: '',
    trueName: '',
    occupation: '',
    occ: '',
    alignment: '',
    age: '',
    sex: '',
    height: '',
    weight: '',
    origin: '',
    environment: '',
    sentiments: '',
    languages: '',
    insanity: '',
  },
  level: 1,
  experience: 0,
  attributes: {
    iq: 10,
    me: 10,
    ma: 10,
    ps: 10,
    pp: 10,
    pe: 10,
    pb: 10,
    spd: 10,
  },
  attributeGeneration: {
    base: null,
    lowAssignments: [],
    occBonuses: null,
  },
  strengthType: 'normal',
  attacks: 4,
  hpFirstRoll: 0,
  hpLaterRolls: 0,
  hpBonus: 0,
  sdcBase: 0,
  sdcBonus: 0,
  skillBonusRolls: {},
  resources: { ppe: 0, isp: 0, chi: 0 },
  combat: {
    initiative: 0,
    strike: 0,
    parry: 0,
    dodge: 0,
    roll: 0,
    damage: 0,
    perception: 0,
  },
  skills: {},
  languages: { spoken: [], literacy: [] },
  classChoices: {},
  equipment: { weapons: [], armor: [], vehicles: [], items: [] },
  spells: [],
  ownedAssets: [],
  play: {
    hp: null,
    sdc: null,
    isp: null,
    ppe: null,
    chi: null,
    mdc: null,
    armorMdc: null,
    equipment: {},
  },
  notes: {
    abilities: '',
    equipment: '',
    weapons: '',
    armor: '',
    magic: '',
    history: '',
    contacts: '',
    notes: '',
  },
})
const state = reactive(blank())
const mode = ref('edit')
const attributeRollError = ref('')
const equipmentCatalogOpen = ref(false)
const startingEquipmentChoiceTarget = ref(null)
const equipmentDetail = ref(null)
const equipmentDetailDialog = ref(null)
let equipmentDetailRestore = null
const spellPickerOpen = ref(false)
const spellDetail = ref(null)
const spellDetailDialog = ref(null)
let spellDetailRestore = null
const editTab = ref('identity')
const editTabs = [
  ['identity', 'Identity'],
  ['class', 'O.C.C. / R.C.C.'],
  ['attributes', 'Attributes & Health'],
  ['derived', 'Derived & Combat'],
  ['skills', 'Skills & Languages'],
  ['equipment', 'Equipment'],
  ['magic', 'Magic'],
  ['record', 'Character Record'],
]
const equipmentSections = [
  {
    id: 'weapons',
    label: 'Weapons',
    singular: 'Weapon',
    description:
      'Weapons carried by the character, including combat statistics and ammunition.',
    fields: [
      ['name', 'Name', 'text', 'Weapon name'],
      ['category', 'Type', 'text', 'Weapon category or model'],
      [
        'damage',
        'Damage',
        'text',
        'Damage per attack, including dice and damage type',
      ],
      ['range', 'Range', 'text', 'Effective range'],
      [
        'rateOfFire',
        'Rate of fire',
        'text',
        'Rate of fire or attack restrictions',
      ],
      [
        'ammoMax',
        'Ammunition',
        'number',
        'Maximum ammunition, payload, or charges',
      ],
      [
        'bonuses',
        'Bonuses',
        'text',
        'Weapon-specific strike, parry, or damage bonuses',
      ],
      ['notes', 'Notes', 'textarea', 'Modes, restrictions, and special rules'],
    ],
  },
  {
    id: 'armor',
    label: 'Armor',
    singular: 'Armor',
    description:
      'Body armor and protective equipment with maximum S.D.C. or M.D.C.',
    fields: [
      ['name', 'Name', 'text', 'Armor name or model'],
      ['category', 'Type', 'text', 'Armor type'],
      ['armorRating', 'A.R.', 'number', 'Armor Rating, when applicable'],
      ['maxSdc', 'Maximum S.D.C.', 'number', 'Maximum armor S.D.C.'],
      ['maxMdc', 'Maximum M.D.C.', 'number', 'Maximum armor M.D.C.'],
      [
        'penalties',
        'Penalties',
        'text',
        'Mobility, prowl, perception, or other penalties',
      ],
      ['notes', 'Notes', 'textarea', 'Coverage and special protection'],
    ],
  },
  {
    id: 'vehicles',
    label: 'Vehicles',
    singular: 'Vehicle',
    description: 'Vehicles, robots, and mounts used by the character.',
    fields: [
      ['name', 'Name', 'text', 'Vehicle name or model'],
      ['category', 'Type', 'text', 'Vehicle class'],
      ['maxSdc', 'Maximum S.D.C.', 'number', 'Maximum vehicle S.D.C.'],
      ['maxMdc', 'Maximum M.D.C.', 'number', 'Maximum vehicle M.D.C.'],
      ['speed', 'Speed', 'text', 'Maximum and cruising speed'],
      ['crew', 'Crew / passengers', 'text', 'Crew and passenger capacity'],
      ['cargo', 'Cargo', 'text', 'Cargo capacity'],
      ['weapons', 'Weapons', 'textarea', 'Mounted weapons and combat systems'],
      [
        'notes',
        'Notes',
        'textarea',
        'Range, fuel, sensors, and special features',
      ],
    ],
  },
  {
    id: 'items',
    label: 'Other items',
    singular: 'Item',
    description:
      'General equipment, supplies, currency, and miscellaneous possessions.',
    fields: [
      ['name', 'Name', 'text', 'Item name'],
      ['quantity', 'Quantity', 'number', 'Number carried'],
      ['weight', 'Weight', 'text', 'Weight per item or total weight'],
      ['value', 'Value', 'text', 'Price or estimated value'],
      ['notes', 'Notes', 'textarea', 'Description, uses, or special rules'],
    ],
  },
]
const tooltip = reactive({ visible: false, text: '', x: 0, y: 0 })
let hydrated = false

function openTooltip(event, text) {
  const rect = event.currentTarget.getBoundingClientRect()
  const pointer = event.type.startsWith('mouse') && event.clientX
  tooltip.text = text
  tooltip.x = Math.max(
    12,
    Math.min(pointer ? event.clientX + 14 : rect.left, window.innerWidth - 420),
  )
  tooltip.y = Math.max(
    12,
    Math.min(
      pointer ? event.clientY + 18 : rect.bottom + 8,
      window.innerHeight - 220,
    ),
  )
  tooltip.visible = true
}
function closeTooltip() {
  tooltip.visible = false
}
function setOtherSdcTotal(event) {
  state.sdcBonus = (Number(event.target.value) || 0) - trainedEffects.value.sdc
}
const vTooltip = {
  mounted(el, binding) {
    el.__tooltipText = binding.value
    el.__tooltipOpen = (event) => openTooltip(event, el.__tooltipText)
    el.__tooltipMove = (event) => openTooltip(event, el.__tooltipText)
    el.__tooltipClose = closeTooltip
    el.addEventListener('mouseenter', el.__tooltipOpen)
    el.addEventListener('mousemove', el.__tooltipMove)
    el.addEventListener('mouseleave', el.__tooltipClose)
    el.addEventListener('focus', el.__tooltipOpen)
    el.addEventListener('blur', el.__tooltipClose)
  },
  updated(el, binding) {
    el.__tooltipText = binding.value
  },
  unmounted(el) {
    el.removeEventListener('mouseenter', el.__tooltipOpen)
    el.removeEventListener('mousemove', el.__tooltipMove)
    el.removeEventListener('mouseleave', el.__tooltipClose)
    el.removeEventListener('focus', el.__tooltipOpen)
    el.removeEventListener('blur', el.__tooltipClose)
  },
}

function skillRecord(id) {
  if (!state.skills[id])
    state.skills[id] = {
      selected: false,
      trainingType: '',
      occBonus: 0,
      otherBonus: 0,
      learnedLevel: 1,
      useIq: true,
    }
  return state.skills[id]
}
skills.forEach((skill) => skillRecord(skill.id))

const iqBonus = computed(() => attributeBonus('iq', state.attributes.iq))
const activeOcc = computed(() => occsById[state.identity.occ] || null)
const attributeRequirementStatus = computed(() =>
  evaluateAttributeRequirements(
    activeOcc.value?.attributeRequirements || [],
    state.attributes,
  ),
)
const unmetAttributeRequirements = computed(() =>
  attributeRequirementStatus.value.results.filter(
    (result) => !result.recommended && !result.met,
  ),
)
function attributeRequirement(key) {
  return attributeRequirementStatus.value.results.find(
    (result) => result.attribute === key,
  )
}
function attributeRequirementUnmet(key) {
  const requirement = attributeRequirement(key)
  return requirement && !requirement.recommended && !requirement.met
}
function attributeName(key) {
  return (
    attributeDefinitions.find((definition) => definition.id === key)?.name ||
    key.toUpperCase()
  )
}
function lowBonusTargets(assignment) {
  const usedTargets = new Set(
    state.attributeGeneration.lowAssignments
      .filter(
        (candidate) =>
          candidate !== assignment &&
          candidate.applied &&
          candidate.distinctTargetGroup === assignment.distinctTargetGroup,
      )
      .map((candidate) => candidate.selectedTarget),
  )
  return (assignment.eligibleTargets || attributeOrder).filter(
    (key) => !usedTargets.has(key),
  )
}
function diceText(dice) {
  return dice?.length ? dice.join(' + ') : 'fixed'
}
function rollAllAttributes() {
  attributeRollError.value = ''
  try {
    removeAppliedClassBonuses()
    const previousPerception =
      state.attributeGeneration?.base?.lowAttributeCompensation
        ?.perceptionBonus || 0
    const result = generateAttributes(Math.random, {
      generationStrategy: activeOcc.value?.generationStrategy,
    })
    Object.assign(state.attributes, result.values)
    state.combat.perception =
      (+state.combat.perception || 0) -
      previousPerception +
      result.lowAttributeCompensation.perceptionBonus
    state.attributeGeneration = {
      base: result,
      lowAssignments: result.lowAttributeCompensation.operations.map(
        (operation, index) => ({
          ...operation,
          id: `low-${index}`,
          selectedTarget: '',
          applied: false,
        }),
      ),
      occBonuses: null,
    }
  } catch (error) {
    attributeRollError.value =
      error instanceof Error
        ? error.message
        : 'This character class does not have an attribute generator yet.'
  }
}
function applyLowAttributeBonus(assignment) {
  if (
    assignment.applied ||
    !lowBonusTargets(assignment).includes(assignment.selectedTarget)
  )
    return
  state.attributes[assignment.selectedTarget] =
    (+state.attributes[assignment.selectedTarget] || 0) + assignment.value
  assignment.applied = true
}
function operationTargetValue(operation) {
  if (operation.target === 'hpBonus' || operation.target === 'sdcBonus') {
    return +state[operation.target] || 0
  }
  return Object.hasOwn(state.attributes, operation.target)
    ? +state.attributes[operation.target] || 0
    : null
}
function setOperationTarget(operation, value) {
  if (operation.target === 'hpBonus' || operation.target === 'sdcBonus')
    state[operation.target] = value
  else if (Object.hasOwn(state.attributes, operation.target))
    state.attributes[operation.target] = value
}
function applyAttributeOperation(operation) {
  const current = operationTargetValue(operation)
  if (current == null) return
  operation.priorValue = current
  if (operation.operation === 'add')
    setOperationTarget(operation, current + operation.value)
  else if (operation.operation === 'minimum')
    setOperationTarget(operation, Math.max(current, operation.value))
  else if (operation.operation === 'replace')
    setOperationTarget(operation, operation.value)
  operation.appliedValue = operationTargetValue(operation)
}
function removeAppliedClassBonuses() {
  const operations = state.attributeGeneration.occBonuses?.operations || []
  for (const operation of [...operations].reverse()) {
    const current = operationTargetValue(operation)
    if (current == null) continue
    if (operation.operation === 'add')
      setOperationTarget(operation, current - operation.value)
    else if (current === operation.appliedValue)
      setOperationTarget(operation, operation.priorValue)
  }
  state.attributeGeneration.occBonuses = null
}
function rollClassAttributeBonuses() {
  if (!activeOcc.value) return
  const result = rollOccAttributeBonuses(activeOcc.value)
  for (const operation of result.operations) applyAttributeOperation(operation)
  state.attributeGeneration.occBonuses = result
}
const startingEquipmentChoices = computed(() =>
  equipmentSections.flatMap((section) =>
    (state.equipment[section.id] || [])
      .filter((item) => item.choice)
      .map((item) => ({ item, section })),
  ),
)
const knownSpells = computed(() =>
  state.spells.map((id) => invocationsById[id]).filter(Boolean),
)
const knownSpellGroups = computed(() =>
  groupInvocationsByLevel(knownSpells.value),
)
function startingChoicesFor(sectionId) {
  return startingEquipmentChoices.value.filter(
    ({ section }) => section.id === sectionId,
  )
}
const activeEquipmentCatalog = computed(() =>
  startingEquipmentChoiceTarget.value
    ? legalStartingEquipmentEntries(
        startingEquipmentChoiceTarget.value.item.choice,
        startingEquipmentChoiceTarget.value.section.id,
      )
    : characterEquipmentCatalog,
)
const activeSpecialization = computed(() =>
  specializationById(activeOcc.value, state.classChoices.specialization?.id),
)
const activeOccMdc = computed(() => activeOcc.value?.mdc || null)
const relatedTotal = computed(
  () => activeOcc.value?.relatedAtLevel(state.level) || 0,
)
const secondaryTotal = computed(
  () => activeOcc.value?.secondaryAtLevel(state.level) || 0,
)
const relatedUsed = computed(
  () =>
    skills.filter((skill) =>
      countsTowardSkillAllowance(skillRecord(skill.id), 'related'),
    ).length,
)
const secondaryUsed = computed(
  () =>
    skills.filter((skill) =>
      countsTowardSkillAllowance(skillRecord(skill.id), 'secondary'),
    ).length,
)
const relatedRemaining = computed(() =>
  Math.max(0, relatedTotal.value - relatedUsed.value),
)
const secondaryRemaining = computed(() =>
  Math.max(0, secondaryTotal.value - secondaryUsed.value),
)
const trainedPercentageSkills = computed(() =>
  skills
    .filter((skill) => skillRecord(skill.id).selected && skill.base != null)
    .sort((a, b) => a.name.localeCompare(b.name)),
)
const trainedSpecialSkills = computed(() =>
  skills
    .filter((skill) => skillRecord(skill.id).selected && skill.base == null)
    .sort((a, b) => a.name.localeCompare(b.name)),
)
const weaponProficiencyIds = skillCategories.find(
  ([category]) => category === 'Weapon Proficiencies',
)[1]
const trainedWeaponProficiencies = computed(() =>
  weaponProficiencyIds
    .filter((id) => skillRecord(id).selected)
    .map((id) => ({ id, name: skillsById[id].name })),
)
function classChoicesIncomplete() {
  if (!activeOcc.value) return false
  const spoken = state.classChoices.otherLanguages || []
  const literacies = state.classChoices.literacyLanguages || []
  if (
    !state.classChoices.nativeLanguage ||
    spoken.length !== occOtherLanguageCount(activeOcc.value) ||
    spoken.some((language) => !language) ||
    literacies.length !== occLiteracyCount(activeOcc.value) ||
    literacies.some((language) => !language)
  )
    return true
  return (
    activeOcc.value.choices.some((choice) =>
      choice.count > 1
        ? state.classChoices[choice.id]?.some((value) => !value)
        : !state.classChoices[choice.id],
    ) ||
    specializationIncomplete(activeOcc.value, state.classChoices.specialization)
  )
}
function classChoicesInvalid() {
  if (!activeOcc.value) return false
  const spoken = [
    state.classChoices.nativeLanguage,
    ...(state.classChoices.otherLanguages || []),
  ].filter(Boolean)
  const literacies = (state.classChoices.literacyLanguages || []).filter(
    Boolean,
  )
  if (new Set(spoken).size !== spoken.length) return true
  if (new Set(literacies).size !== literacies.length) return true
  const classSkillChoices = activeOcc.value.choices
    .flatMap((choice) =>
      Array.isArray(state.classChoices[choice.id])
        ? state.classChoices[choice.id]
        : [state.classChoices[choice.id]],
    )
    .filter(Boolean)
  const specializationSkillChoices = Object.values(
    state.classChoices.specialization?.choices || {},
  )
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter(Boolean)
  const selected = [...classSkillChoices, ...specializationSkillChoices]
  return (
    new Set(selected).size !== selected.length ||
    specializationHasDuplicateChoices(
      activeOcc.value,
      state.classChoices.specialization,
    )
  )
}
function choiceIsDuplicate(choice, index) {
  if (choice.count <= 1) return false
  const values = state.classChoices[choice.id] || []
  const value = values[index - 1]
  return (
    Boolean(value) &&
    values.some(
      (other, otherIndex) => other === value && otherIndex !== index - 1,
    )
  )
}
function specializationChoiceIsDuplicate(choice, index) {
  if (choice.count <= 1) return false
  const values = state.classChoices.specialization?.choices?.[choice.id] || []
  const value = values[index - 1]
  return (
    Boolean(value) &&
    values.some(
      (other, otherIndex) => other === value && otherIndex !== index - 1,
    )
  )
}
function equipmentNamesIncomplete() {
  return equipmentSections.some((section) =>
    state.equipment[section.id].some((item) => !String(item.name || '').trim()),
  )
}
function tabStatus(tab) {
  if (tab === 'identity')
    return !state.identity.name || !state.identity.occ ? 'available' : ''
  if (tab === 'class')
    return classChoicesInvalid()
      ? 'error'
      : classChoicesIncomplete()
        ? 'available'
        : ''
  if (tab === 'attributes')
    return unmetAttributeRequirements.value.length ? 'error' : ''
  if (tab === 'skills')
    return relatedUsed.value > relatedTotal.value ||
      secondaryUsed.value > secondaryTotal.value
      ? 'error'
      : relatedRemaining.value || secondaryRemaining.value
        ? 'available'
        : ''
  if (tab === 'equipment') return equipmentNamesIncomplete() ? 'available' : ''
  return ''
}
function refreshCatalogEquipment() {
  state.play.equipment ||= {}
  for (const section of equipmentSections)
    for (const item of state.equipment[section.id]) {
      const defaults = armoryDefaultsForCatalogSelection(
        item.catalogSelectionId,
      )
      if (!defaults) continue
      Object.assign(item, defaults)
      const status = (state.play.equipment[item.id] ||= {})
      if (status.ammo == null) status.ammo = Number(item.ammoMax) || 0
    }
}
function enterPlayMode() {
  mode.value = 'play'
  refreshCatalogEquipment()
  if (state.play.hp == null) state.play.hp = derived.value.hp
  if (state.play.sdc == null) state.play.sdc = derived.value.sdc
  if (state.play.isp == null) state.play.isp = state.resources.isp
  if (state.play.ppe == null) state.play.ppe = state.resources.ppe
  if (state.play.chi == null) state.play.chi = state.resources.chi
  if (state.play.mdc == null) state.play.mdc = activeOccMdc.value?.mainBody ?? 0
  if (state.play.armorMdc == null)
    state.play.armorMdc = activeOccMdc.value?.armor ?? 0
  for (const section of equipmentSections)
    for (const item of state.equipment[section.id]) {
      if (String(item.name || '').trim()) equipmentStatus(item)
      else delete state.play.equipment[item.id]
    }
}
function equipmentId() {
  return (
    globalThis.crypto?.randomUUID?.() ||
    `equipment-${Date.now()}-${Math.random().toString(36).slice(2)}`
  )
}
const legacyAssetArmoryIds = {
  'usa-g10-glitter-boy': 'rue-glitter-boy-power-armor',
  'ft-005-flying-titan': 'rue-titan-industries-ft-005-flying-titan-power-armor',
  'ng-x9-samson': 'rue-northern-gun-ng-x9-samson-power-armor',
  'tr-001-combat-titan': 'rue-titan-industries-tr-001-titan-combat-robot',
}
function migrateLegacyOwnedAssets() {
  for (const owned of state.ownedAssets || []) {
    const catalogId = legacyAssetArmoryIds[owned.catalogId]
    const catalog = characterEquipmentCatalog.find(
      (entry) => entry.id === catalogId,
    )
    if (!catalog) continue
    const id = `migrated:${owned.id}`
    const existing = state.equipment.vehicles.find(
      (item) => item.id === id || item.catalogSelectionId === catalog.id,
    )
    if (existing) {
      const status = (state.play.equipment[existing.id] ||= {})
      status.mdc ??=
        owned.current?.mainMdc ?? catalog.metadata.defaults.maxMdc ?? 0
      continue
    }
    state.equipment.vehicles.push({
      ...catalog.metadata.defaults,
      id,
      name: owned.name || catalog.name,
      quantity: 1,
      notes: '',
      catalogSelectionId: catalog.id,
    })
    state.play.equipment[id] = {
      mdc: owned.current?.mainMdc ?? catalog.metadata.defaults.maxMdc ?? 0,
      ammo: 0,
    }
  }
  state.ownedAssets = []
}
function addEquipment(kind) {
  const section = equipmentSections.find((entry) => entry.id === kind)
  const item = {
    id: equipmentId(),
  }
  for (const [key, , type] of section.fields)
    item[key] = type === 'number' ? 0 : ''
  if (kind === 'items') item.quantity = 1
  state.equipment[kind].push(item)
}
function addCatalogEquipment(selection) {
  if (startingEquipmentChoiceTarget.value) {
    const { item } = startingEquipmentChoiceTarget.value
    const wasSelected = Boolean(item.catalogSelectionId)
    Object.assign(item, selection.metadata.defaults, {
      name: selection.metadata.customChoice
        ? selection.values.customName
        : selection.name,
      catalogSelectionId: selection.catalogId,
      notes: selection.values.notes || item.notes || '',
    })
    if (!wasSelected) equipmentStatus(item).ammo = Number(item.ammoMax) || 0
    startingEquipmentChoiceTarget.value = null
    equipmentCatalogOpen.value = false
    return
  }
  const result = applyEquipmentCatalogSelection(
    selection,
    state.equipment,
    equipmentId(),
  )
  state.equipment = result.equipment
  equipmentCatalogOpen.value = false
}
function openEquipmentCatalog() {
  startingEquipmentChoiceTarget.value = null
  equipmentCatalogOpen.value = true
}
function openStartingEquipmentChoice(choice) {
  startingEquipmentChoiceTarget.value = choice
  equipmentCatalogOpen.value = true
}
function closeEquipmentCatalog() {
  startingEquipmentChoiceTarget.value = null
  equipmentCatalogOpen.value = false
}
function catalogStatistic(item, ...labels) {
  return item.statistics?.find((statistic) => labels.includes(statistic.label))
    ?.value
}
function openEquipmentDetail(item) {
  if (item.statistics?.length) equipmentDetail.value = item
}
function equipmentDetailKeydown(event, item) {
  if (['Enter', ' '].includes(event.key) && item.statistics?.length) {
    event.preventDefault()
    openEquipmentDetail(item)
  }
}
watch(equipmentDetail, async (item) => {
  if (item) {
    equipmentDetailRestore = document.activeElement
    await nextTick()
    equipmentDetailDialog.value?.focus()
  } else equipmentDetailRestore?.focus()
})
function addKnownSpell(id) {
  if (!invocationsById[id] || state.spells.includes(id)) return
  state.spells.push(id)
  spellPickerOpen.value = false
}
function removeKnownSpell(id) {
  state.spells = state.spells.filter((spellId) => spellId !== id)
}
function openSpellDetail(spell) {
  spellDetail.value = spell
}
watch(spellDetail, async (spell) => {
  if (spell) {
    spellDetailRestore = document.activeElement
    await nextTick()
    spellDetailDialog.value?.focus()
  } else spellDetailRestore?.focus()
})
function reconcileClassEquipment() {
  const occId = activeOcc.value?.id
  if (!occId) return
  const weaponProficiencies = trainedWeaponProficiencies.value
  state.equipment = reconcileStartingEquipment(
    state.equipment,
    startingEquipmentPackages[occId],
    occId,
    { weaponProficiencies },
  )
  const specializationId = state.classChoices.specialization?.id
  if (specializationId)
    state.equipment = reconcileStartingEquipment(
      state.equipment,
      specializationEquipmentPackages[`${occId}:${specializationId}`],
      `${occId}:${specializationId}`,
      { weaponProficiencies },
    )
}
watch(
  () => trainedWeaponProficiencies.value.map(({ id }) => id).join(','),
  () => reconcileClassEquipment(),
  { flush: 'post' },
)
function removeEquipment(kind, index) {
  const [item] = state.equipment[kind].splice(index, 1)
  if (item) delete state.play.equipment[item.id]
}
function equipmentStatus(item) {
  const status = (state.play.equipment[item.id] ||= {})
  if (status.ammo == null) status.ammo = Number(item.ammoMax) || 0
  if (status.sdc == null) status.sdc = Number(item.maxSdc) || 0
  if (status.mdc == null) status.mdc = Number(item.maxMdc) || 0
  return status
}
function populatedEquipment(kind) {
  return state.equipment[kind].filter((item) =>
    Boolean(String(item.name || '').trim()),
  )
}
const trainedEffects = computed(() => {
  const total = {
    attributes: { ps: 0, pp: 0, pe: 0, pb: 0, spd: 0 },
    combat: { initiative: 0, strike: 0, parry: 0, dodge: 0, roll: 0 },
    sdc: 0,
    attacks: 0,
    perception: 0,
    rolls: [],
    situational: [],
    breakdown: {
      attributes: {},
      combat: {},
      sdc: [],
      attacks: [],
      perception: [],
    },
  }
  for (const [id, effect] of Object.entries(skillEffects)) {
    if (!skillRecord(id).selected) continue
    const name = skillsById[id]?.name || id
    for (const [key, value] of Object.entries(effect.attributes || {})) {
      total.attributes[key] += value
      ;(total.breakdown.attributes[key] ||= []).push(`${name}: +${value}`)
    }
    for (const [key, value] of Object.entries(effect.combat || {})) {
      total.combat[key] += value
      ;(total.breakdown.combat[key] ||= []).push(`${name}: +${value}`)
    }
    if (effect.sdc) {
      total.sdc += effect.sdc
      total.breakdown.sdc.push(`${name}: +${effect.sdc}`)
    }
    if (effect.attacks) {
      total.attacks += effect.attacks
      total.breakdown.attacks.push(`${name}: +${effect.attacks}`)
    }
    if (effect.perception) {
      total.perception += effect.perception
      total.breakdown.perception.push(`${name}: +${effect.perception}`)
    }
    if (effect.sdcDice) {
      const rolled = Number(state.skillBonusRolls[`${id}:sdc`]) || 0
      total.sdc += rolled
      total.rolls.push({ id, type: 'sdc', dice: effect.sdcDice })
      total.breakdown.sdc.push(`${name} (${effect.sdcDice}): +${rolled}`)
    }
    if (effect.speedDice) {
      const rolled = Number(state.skillBonusRolls[`${id}:spd`]) || 0
      total.attributes.spd += rolled
      total.rolls.push({ id, type: 'spd', dice: effect.speedDice })
      ;(total.breakdown.attributes.spd ||= []).push(
        `${name} (${effect.speedDice}): +${rolled}`,
      )
    }
    for (const note of effect.situational || [])
      total.situational.push(`${skillsById[id]?.name || id}: ${note}`)
  }
  return total
})
const effectiveAttributes = computed(() =>
  Object.fromEntries(
    Object.entries(state.attributes).map(([key, value]) => [
      key,
      (+value || 0) + (trainedEffects.value.attributes[key] || 0),
    ]),
  ),
)
function classProgressionBonus(group, key) {
  return (activeOcc.value?.[group]?.[key] || []).filter(
    (level) => state.level >= level,
  ).length
}
const derived = computed(() => {
  const classBonuses = activeOcc.value?.combatBonuses || {}
  const saveBonuses = activeOcc.value?.saveBonuses || {}
  const totalAttacks =
    (+state.attacks || 0) +
    trainedEffects.value.attacks +
    (classBonuses.attacks || 0)
  const move = movement(effectiveAttributes.value.spd, totalAttacks)
  const weight = weightLimits(effectiveAttributes.value.ps, state.strengthType)
  return {
    hp: hitPoints(
      effectiveAttributes.value.pe,
      state.level,
      state.hpFirstRoll,
      state.hpLaterRolls,
      state.hpBonus,
    ),
    sdc:
      (+state.sdcBase || 0) + (+state.sdcBonus || 0) + trainedEffects.value.sdc,
    move,
    weight,
    attacks: totalAttacks,
    damage: attributeBonus('ps', effectiveAttributes.value.ps),
    strike:
      attributeBonus('pp', effectiveAttributes.value.pp) +
      (+state.combat.strike || 0) +
      trainedEffects.value.combat.strike,
    parry:
      attributeBonus('pp', effectiveAttributes.value.pp) +
      (+state.combat.parry || 0) +
      trainedEffects.value.combat.parry,
    dodge:
      attributeBonus('pp', effectiveAttributes.value.pp) +
      (+state.combat.dodge || 0) +
      trainedEffects.value.combat.dodge,
    roll:
      (+state.combat.roll || 0) +
      trainedEffects.value.combat.roll +
      (classBonuses.roll || 0) +
      classProgressionBonus('combatProgression', 'roll'),
    automaticDodge: classProgressionBonus(
      'combatProgression',
      'automaticDodge',
    ),
    initiative:
      attributeBonus('ppInitiative', effectiveAttributes.value.pp) +
      (+state.combat.initiative || 0) +
      trainedEffects.value.combat.initiative +
      (classBonuses.initiative || 0) +
      classProgressionBonus('combatProgression', 'initiative'),
    perception:
      (+state.combat.perception || 0) +
      trainedEffects.value.perception +
      (classBonuses.perception || 0),
    psionics:
      attributeBonus('mePsionics', effectiveAttributes.value.me) +
      (saveBonuses.psionics || 0),
    insanity:
      attributeBonus('meInsanity', effectiveAttributes.value.me) +
      (saveBonuses.insanity || 0),
    trust: attributeBonus('ma', effectiveAttributes.value.ma),
    charm: attributeBonus('pb', effectiveAttributes.value.pb),
    coma:
      attributeBonus('peComa', effectiveAttributes.value.pe) +
      (classBonuses.coma || 0) +
      (saveBonuses.coma || 0),
    poison:
      attributeBonus('peSave', effectiveAttributes.value.pe) +
      Math.max(
        saveBonuses.toxins || 0,
        saveBonuses.poison || 0,
        saveBonuses.drugs || 0,
      ),
    magic:
      attributeBonus('peSave', effectiveAttributes.value.pe) +
      (saveBonuses.magic || 0),
    possession: saveBonuses.possession || 0,
    mindControl: saveBonuses.mindControl || 0,
    disease:
      attributeBonus('peSave', effectiveAttributes.value.pe) +
      (saveBonuses.disease || 0),
    horrorFactor:
      (saveBonuses.horrorFactor || 0) +
      classProgressionBonus('saveProgression', 'horrorFactor'),
    pain: saveBonuses.pain || 0,
    fatigue: saveBonuses.fatigue || 0,
  }
})

function skillLevel(id) {
  return Math.max(
    1,
    state.level - Math.max(1, skillRecord(id).learnedLevel) + 1,
  )
}
function trainedSkillBonus(id) {
  return (
    Object.entries(skillSynergies).reduce(
      (total, [source, bonuses]) =>
        total + (skillRecord(source).selected ? bonuses[id] || 0 : 0),
      0,
    ) +
    Object.entries(skillEffects).reduce(
      (total, [source, effect]) =>
        total +
        (skillRecord(source).selected ? effect.skillBonuses?.[id] || 0 : 0),
      0,
    )
  )
}
function relevantSituational(...terms) {
  const lower = terms.map((term) => term.toLowerCase())
  return trainedEffects.value.situational
    .filter((note) => lower.some((term) => note.toLowerCase().includes(term)))
    .map((note) => `Situational - ${note}`)
}
function derivedTooltip(field) {
  const a = effectiveAttributes.value
  const effects = trainedEffects.value.breakdown
  const attributeLines = (key) => [
    `Base ${key.toUpperCase()}: ${+state.attributes[key] || 0}`,
    ...(effects.attributes[key] || []),
    `Effective ${key.toUpperCase()}: ${a[key]}`,
  ]
  const combatLines = (key) => [
    `Other ${key}: ${+state.combat[key] || 0}`,
    ...(effects.combat[key] || []),
  ]
  const tooltips = {
    hp: [
      ...attributeLines('pe'),
      `First-level roll: +${+state.hpFirstRoll || 0}`,
      `Later-level rolls: +${+state.hpLaterRolls || 0}`,
      `Other HP: ${+state.hpBonus || 0}`,
      `Total HP: ${derived.value.hp}`,
    ],
    sdc: [
      `Base S.D.C.: ${+state.sdcBase || 0}`,
      `Other S.D.C.: ${+state.sdcBonus || 0}`,
      ...effects.sdc,
      `Trained-skill S.D.C.: +${trainedEffects.value.sdc}`,
      `Total S.D.C.: ${derived.value.sdc}`,
    ],
    otherSdc: [
      `Manual bonus: ${+state.sdcBonus || 0}`,
      ...effects.sdc,
      `Other S.D.C. bonuses: ${(Number(state.sdcBonus) || 0) + trainedEffects.value.sdc}`,
    ],
    attacks: [
      `Base attacks: ${+state.attacks || 0}`,
      ...effects.attacks,
      `Total attacks: ${derived.value.attacks}`,
      ...relevantSituational('attack/action', 'one hand-to-hand attack'),
    ],
    weight: [
      ...attributeLines('ps'),
      `Carry formula for ${state.strengthType} strength`,
      `Carry: ${derived.value.weight.carry} lb`,
      `Lift: ${derived.value.weight.lift} lb`,
      ...relevantSituational('carrying and lifting'),
    ],
    movement: [
      ...attributeLines('spd'),
      `Speed x 5: ${derived.value.move.perMelee} ft/melee`,
      `Divided by ${derived.value.attacks} attacks: ${derived.value.move.perAttack} ft/attack`,
      `Approx. ${derived.value.move.mph} mph`,
      ...relevantSituational('forced march', 'half speed'),
    ],
    damage: [
      ...attributeLines('ps'),
      `Attribute-chart damage bonus: +${derived.value.damage}`,
    ],
    trust: [
      `M.A.: ${a.ma}`,
      `Attribute-chart result: ${derived.value.trust ? derived.value.trust + '%' : 'none'}`,
    ],
    charm: [
      ...attributeLines('pb'),
      `Attribute-chart result: ${derived.value.charm ? derived.value.charm + '%' : 'none'}`,
      ...relevantSituational('dressed to impress'),
    ],
    coma: [
      ...attributeLines('pe'),
      `Attribute-chart bonus: +${derived.value.coma}%`,
    ],
    magic: [
      ...attributeLines('pe'),
      `Attribute-chart magic bonus: +${attributeBonus('peSave', a.pe)}`,
      ...(activeOcc.value?.saveBonuses?.magic
        ? [`${activeOcc.value.name}: +${activeOcc.value.saveBonuses.magic}`]
        : []),
      `Total save vs magic: +${derived.value.magic}`,
    ],
    poison: [
      ...attributeLines('pe'),
      ...(Math.max(
        activeOcc.value?.saveBonuses?.toxins || 0,
        activeOcc.value?.saveBonuses?.poison || 0,
        activeOcc.value?.saveBonuses?.drugs || 0,
      )
        ? [
            `${activeOcc.value.name}: +${Math.max(
              activeOcc.value.saveBonuses.toxins || 0,
              activeOcc.value.saveBonuses.poison || 0,
              activeOcc.value.saveBonuses.drugs || 0,
            )}`,
          ]
        : []),
      `Total save vs toxins, poison, drugs, and disease: +${derived.value.poison}`,
    ],
    possession: [
      ...(activeOcc.value?.saveBonuses?.possession
        ? [
            `${activeOcc.value.name}: +${activeOcc.value.saveBonuses.possession}`,
          ]
        : []),
      `Total save vs possession: +${derived.value.possession}`,
    ],
    psionicsInsanity: [
      `M.E.: ${a.me}`,
      ...(activeOcc.value?.saveBonuses?.psionics
        ? [`${activeOcc.value.name}: +${activeOcc.value.saveBonuses.psionics}`]
        : []),
      `Save vs psionics: +${derived.value.psionics}`,
      `Save vs insanity: +${derived.value.insanity}`,
    ],
    initiative: [
      ...combatLines('initiative'),
      `P.P. initiative bonus: +${attributeBonus('ppInitiative', a.pp)}`,
      `Total: +${derived.value.initiative}`,
    ],
    strike: [
      ...combatLines('strike'),
      `P.P. strike bonus: +${attributeBonus('pp', a.pp)}`,
      `Total: +${derived.value.strike}`,
      ...relevantSituational('to strike'),
    ],
    parry: [
      ...combatLines('parry'),
      `P.P. parry bonus: +${attributeBonus('pp', a.pp)}`,
      `Total: +${derived.value.parry}`,
      ...relevantSituational('to strike and parry'),
    ],
    dodge: [
      ...combatLines('dodge'),
      `P.P. dodge bonus: +${attributeBonus('pp', a.pp)}`,
      `Total: +${derived.value.dodge}`,
      ...relevantSituational('to dodge'),
    ],
    roll: [...combatLines('roll'), `Total: +${derived.value.roll}`],
    perception: [
      `Other perception: ${+state.combat.perception || 0}`,
      ...effects.perception,
      `Total: +${derived.value.perception}`,
    ],
  }
  return (tooltips[field] || []).join('\n')
}
function totalFor(id) {
  const record = skillRecord(id)
  return skillTotal(
    skillsById[id],
    {
      ...record,
      otherBonus: (+record.otherBonus || 0) + trainedSkillBonus(id),
      currentLevel: skillLevel(id),
    },
    iqBonus.value,
  )
}
function skillTotalTooltip(id) {
  const skill = skillsById[id]
  const record = skillRecord(id)
  const currentLevel = skillLevel(id)
  const learnedLevel = Math.max(1, Number(record.learnedLevel) || 1)
  const levelBonus =
    Math.max(0, currentLevel - learnedLevel) * (skill.perLevel || 0)
  const iq = record.useIq === false ? 0 : iqBonus.value
  const trainedBonuses = []
  for (const [source, bonuses] of Object.entries(skillSynergies)) {
    if (skillRecord(source).selected && bonuses[id])
      trainedBonuses.push(
        `${skillsById[source]?.name || source}: +${bonuses[id]}%`,
      )
  }
  for (const [source, effect] of Object.entries(skillEffects)) {
    const bonus = effect.skillBonuses?.[id] || 0
    if (skillRecord(source).selected && bonus)
      trainedBonuses.push(`${skillsById[source]?.name || source}: +${bonus}%`)
  }
  const rawTotal =
    skill.base +
    (Number(record.occBonus) || 0) +
    (Number(record.otherBonus) || 0) +
    trainedBonuses.reduce(
      (sum, line) => sum + Number(line.match(/\+(\d+(?:\.\d+)?)%$/)?.[1] || 0),
      0,
    ) +
    iq +
    levelBonus
  return [
    `${skill.name} calculation`,
    `Base proficiency: ${skill.base}%`,
    `O.C.C. bonus: +${Number(record.occBonus) || 0}%`,
    `Other bonus: +${Number(record.otherBonus) || 0}%`,
    ...trainedBonuses,
    `I.Q. bonus: +${iq}%${record.useIq === false ? ' (disabled)' : ''}`,
    `Level advancement: +${levelBonus}% (${skill.perLevel || 0}% per level; learned at ${learnedLevel}, currently ${currentLevel})`,
    ...(rawTotal > 98
      ? [`Uncapped total: ${rawTotal}%`, 'Maximum proficiency: 98%']
      : []),
    `Total: ${totalFor(id)}%`,
  ].join('\n')
}
const categoriesBySkill = Object.fromEntries(
  skills.map((skill) => [
    skill.id,
    skillCategories
      .filter(([, ids]) => ids.includes(skill.id))
      .map(([name]) => name),
  ]),
)
function descriptionFor(id) {
  return skillDescription(skillsById[id], categoriesBySkill[id])
}
function relatedInfo(id) {
  return (
    activeOcc.value?.relatedSkillInfo?.(id) || {
      eligible: false,
      bonus: 0,
      category: '',
    }
  )
}
function isOccSkill(id) {
  return ['occ', 'occ-choice'].includes(skillRecord(id).trainingType)
}
function isSkillChoiceAvailable(id) {
  const record = skillRecord(id)
  return (
    Boolean(activeOcc.value) &&
    skillChoiceAvailable({
      selected: record.selected,
      occSkill: isOccSkill(id),
      relatedEligible: relatedInfo(id).eligible,
      relatedRemaining: relatedRemaining.value,
    })
  )
}
function isCategoryChoiceAvailable(ids) {
  return categoryChoiceAvailable(ids, isSkillChoiceAvailable)
}
function trainingOptions(id) {
  const options = [{ value: '', label: 'Untrained' }]
  if (relatedInfo(id).eligible)
    options.push({
      value: 'related',
      label: `O.C.C. Related${relatedInfo(id).bonus ? ` (+${relatedInfo(id).bonus}%)` : ''}`,
    })
  if (secondaryEligible(id))
    options.push({ value: 'secondary', label: 'Secondary (+0%)' })
  return options
}
function setTraining(id, type) {
  const record = skillRecord(id)
  if (record.trainingType === 'occ' || record.trainingType === 'occ-choice')
    return
  if (
    type === 'related' &&
    record.trainingType !== 'related' &&
    relatedUsed.value >= relatedTotal.value
  ) {
    record.selected = Boolean(record.trainingType)
    alert('No O.C.C. Related Skill selections remain at this level.')
    return
  }
  if (
    type === 'secondary' &&
    record.trainingType !== 'secondary' &&
    secondaryUsed.value >= secondaryTotal.value
  ) {
    record.selected = Boolean(record.trainingType)
    alert('No Secondary Skill selections remain at this level.')
    return
  }
  record.trainingType = type
  record.selected = Boolean(type)
  if (type === 'related') record.occBonus = relatedInfo(id).bonus
  if (type === 'secondary') record.occBonus = 0
  if (!type) record.occBonus = 0
}
function toggleSkill(id) {
  const record = skillRecord(id)
  if (record.trainingType === 'occ' || record.trainingType === 'occ-choice') {
    record.selected = true
    return
  }
  if (!record.selected) {
    record.trainingType = ''
    record.occBonus = 0
    return
  }
  const preferred =
    relatedInfo(id).eligible && relatedRemaining.value > 0
      ? 'related'
      : 'secondary'
  record.selected = false
  setTraining(id, preferred)
}
function setOccSkill(id, bonus, type = 'occ') {
  const record = skillRecord(id)
  record.selected = true
  record.trainingType = type
  record.occBonus = bonus
  record.learnedLevel = 1
}
function syncOccLanguage(slot, type, kind = 'spoken') {
  state.languages[kind] = state.languages[kind].filter(
    (record) => !(record.occId && record.occSlot === slot),
  )
  if (!type) return
  const rules = activeOcc.value?.languages || {
    nativeBase: 88,
    nativeBonus: 0,
    otherBonus: 0,
  }
  state.languages[kind].push(
    slot === 'native'
      ? {
          type,
          occBonus: rules.nativeBonus,
          otherBonus: 0,
          learnedLevel: 1,
          useIq: true,
          baseOverride: rules.nativeBase,
          perLevelOverride: 1,
          occId: activeOcc.value.id,
          occSlot: slot,
        }
      : {
          type,
          occBonus:
            kind === 'literacy'
              ? rules.literacyOtherBonus || 0
              : rules.otherBonus,
          otherBonus: 0,
          learnedLevel: 1,
          useIq: true,
          occId: activeOcc.value.id,
          occSlot: slot,
        },
  )
}

function normalizeOccLanguageChoices() {
  const occ = activeOcc.value
  if (!occ) return
  const savedSpoken = state.languages.spoken
    .filter((record) => record.occId && record.occSlot !== 'native')
    .map((record) => record.type)
  const savedLiteracies = state.languages.literacy
    .filter((record) => record.occId)
    .map((record) => record.type)
  const legacyOther = state.classChoices.otherLanguage
  const spoken =
    state.classChoices.otherLanguages || [legacyOther].filter(Boolean)
  const literacies = state.classChoices.literacyLanguages || []
  state.classChoices.otherLanguages = Array.from(
    { length: occOtherLanguageCount(occ) },
    (_, index) => spoken[index] || savedSpoken[index] || '',
  )
  state.classChoices.literacyLanguages = Array.from(
    { length: occLiteracyCount(occ) },
    (_, index) => literacies[index] || savedLiteracies[index] || '',
  )
  delete state.classChoices.otherLanguage
  state.languages.spoken = state.languages.spoken.filter(
    (record) => !record.occId || record.occSlot === 'native',
  )
  state.languages.literacy = state.languages.literacy.filter(
    (record) => !record.occId,
  )
  state.classChoices.otherLanguages.forEach((language, index) =>
    syncOccLanguage(`other-${index}`, language),
  )
  state.classChoices.literacyLanguages.forEach((language, index) =>
    syncOccLanguage(`literacy-${index}`, language, 'literacy'),
  )
}
function syncOccChoice(choice) {
  for (const skill of skills)
    if (skillRecord(skill.id).occChoice === choice.id) {
      Object.assign(skillRecord(skill.id), {
        selected: false,
        trainingType: '',
        occBonus: 0,
        occChoice: '',
      })
    }
  const values = Array.isArray(state.classChoices[choice.id])
    ? state.classChoices[choice.id]
    : [state.classChoices[choice.id]]
  for (const id of values.filter(Boolean)) {
    setOccSkill(id, choice.bonus, 'occ-choice')
    skillRecord(id).occChoice = choice.id
  }
}
function clearSpecializationSkills() {
  for (const skill of skills) {
    const record = skillRecord(skill.id)
    if (!record.specializationId) continue
    Object.assign(record, {
      selected: false,
      trainingType: '',
      occBonus: 0,
      occChoice: '',
      specializationId: '',
    })
    const automatic = activeOcc.value?.automaticSkills.find(
      ([id]) => id === skill.id,
    )
    if (automatic) {
      setOccSkill(automatic[0], automatic[1])
      continue
    }
    const requiredChoice = activeOcc.value?.choices.find((choice) =>
      (Array.isArray(state.classChoices[choice.id])
        ? state.classChoices[choice.id]
        : [state.classChoices[choice.id]]
      ).includes(skill.id),
    )
    if (requiredChoice) {
      setOccSkill(skill.id, requiredChoice.bonus, 'occ-choice')
      skillRecord(skill.id).occChoice = requiredChoice.id
    }
  }
}
function applySpecialization() {
  clearSpecializationSkills()
  const option = specializationById(
    activeOcc.value,
    state.classChoices.specialization?.id,
  )
  state.classChoices.specialization = blankSpecializationState(option)
  if (!option) return
  for (const [id, bonus] of option.automaticSkills) {
    setOccSkill(id, bonus)
    skillRecord(id).specializationId = option.id
  }
  reconcileClassEquipment()
}
function syncSpecializationChoice(choice) {
  const option = activeSpecialization.value
  const choiceKey = `specialization:${option?.id}:${choice.id}`
  for (const skill of skills) {
    const record = skillRecord(skill.id)
    if (
      record.specializationId === option?.id &&
      record.occChoice === choiceKey
    )
      Object.assign(record, {
        selected: false,
        trainingType: '',
        occBonus: 0,
        occChoice: '',
        specializationId: '',
      })
  }
  const value = state.classChoices.specialization.choices[choice.id]
  const values = Array.isArray(value) ? value : [value]
  for (const id of values.filter(Boolean)) {
    setOccSkill(id, choice.bonusByOption?.[id] ?? choice.bonus, 'occ-choice')
    Object.assign(skillRecord(id), {
      occChoice: choiceKey,
      specializationId: option.id,
    })
  }
}
function applyOcc() {
  removeAppliedClassBonuses()
  for (const skill of skills)
    if (['occ', 'occ-choice'].includes(skillRecord(skill.id).trainingType))
      Object.assign(skillRecord(skill.id), {
        selected: false,
        trainingType: '',
        occBonus: 0,
        occChoice: '',
      })
  state.languages.spoken = state.languages.spoken.filter(
    (record) => !record.occId,
  )
  state.classChoices = {}
  const occ = activeOcc.value
  if (!occ) return
  state.play = {
    hp: null,
    sdc: null,
    isp: null,
    ppe: null,
    chi: null,
    mdc: null,
    armorMdc: null,
    equipment: {},
  }
  state.identity.occupation = occ.name
  if (occ.defaults.strengthType) state.strengthType = occ.defaults.strengthType
  for (const key of ['ps', 'pp', 'pe', 'spd'])
    if (occ.defaults[key] != null) state.attributes[key] = occ.defaults[key]
  if (occ.defaults.isp != null) state.resources.isp = occ.defaults.isp
  for (const [id, bonus] of occ.automaticSkills) setOccSkill(id, bonus)
  for (const choice of occ.choices)
    state.classChoices[choice.id] =
      choice.count > 1 ? Array(choice.count).fill('') : ''
  state.classChoices.specialization = blankSpecializationState()
  state.classChoices.nativeLanguage = 'American'
  state.classChoices.otherLanguages = Array(occOtherLanguageCount(occ)).fill('')
  state.classChoices.literacyLanguages = Array(occLiteracyCount(occ)).fill('')
  delete state.classChoices.otherLanguage
  syncOccLanguage('native', 'American')
  reconcileClassEquipment()
}
function addLanguage(kind) {
  state.languages[kind].push({
    type: languages[0],
    occBonus: 0,
    otherBonus: 0,
    learnedLevel: 1,
    useIq: true,
  })
}
function languageLevel(record) {
  return Math.max(1, state.level - Math.max(1, record.learnedLevel) + 1)
}
function languageTotal(kind, record) {
  return skillTotal(
    {
      ...languageRules[kind],
      base: record.baseOverride ?? languageRules[kind].base,
      perLevel: record.perLevelOverride ?? languageRules[kind].perLevel,
    },
    { ...record, currentLevel: languageLevel(record) },
    iqBonus.value,
  )
}
async function resetSheet() {
  if (!confirm('Clear the saved character sheet?')) return
  const result = await repositories.character.remove()
  if (!result.ok || result.warning) {
    reportStorageFailure({ error: result.error || result.warning })
    return
  }
  Object.assign(state, blank())
}
function downloadJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: 'application/json',
  })
  const link = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `${state.identity.name || 'rifts-character'}.json`,
  })
  link.click()
  URL.revokeObjectURL(link.href)
}
function importJson(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      Object.assign(state, blank(), JSON.parse(reader.result))
      state.classChoices.specialization = normalizeSpecializationState(
        activeOcc.value,
        state.classChoices.specialization,
      )
      normalizeOccLanguageChoices()
    } catch {
      alert('That file is not a valid character export.')
    }
  }
  reader.readAsText(file)
  event.target.value = ''
}

onMounted(async () => {
  const saved = await repositories.character.load()
  if (saved.ok && saved.value) Object.assign(state, blank(), saved.value)
  else if (!saved.ok || saved.warning)
    reportStorageFailure({ error: saved.error || saved.warning })
  state.languages ||= { spoken: [], literacy: [] }
  state.languages.spoken ||= []
  state.languages.literacy ||= []
  state.spells = [...new Set(state.spells || [])].filter(
    (id) => invocationsById[id],
  )
  state.equipment ||= { weapons: [], armor: [], vehicles: [], items: [] }
  state.attributeGeneration ||= {
    base: null,
    lowAssignments: [],
    occBonuses: null,
  }
  state.attributeGeneration.lowAssignments ||= []
  for (const section of equipmentSections) {
    state.equipment[section.id] ||= []
    for (const item of state.equipment[section.id]) {
      item.id ||= equipmentId()
    }
  }
  state.classChoices ||= {}
  state.play ||= {
    hp: null,
    sdc: null,
    isp: null,
    ppe: null,
    chi: null,
    mdc: null,
    armorMdc: null,
    equipment: {},
  }
  state.play.equipment ||= {}
  refreshCatalogEquipment()
  state.skillBonusRolls ||= {}
  state.combat.perception ??= 0
  state.classChoices.specialization = normalizeSpecializationState(
    activeOcc.value,
    state.classChoices.specialization,
  )
  normalizeOccLanguageChoices()
  reconcileClassEquipment()
  migrateLegacyOwnedAssets()
  skills.forEach((skill) => {
    const record = skillRecord(skill.id)
    if (
      record.selected &&
      (!record.trainingType || record.trainingType === 'custom')
    )
      record.trainingType = 'secondary'
  })
  skills.forEach((skill) => skillRecord(skill.id))
  await nextTick()
  hydrated = true
})
watch(
  state,
  async (value) => {
    if (!hydrated) return
    const result = await repositories.character.save(value)
    if (!result.ok || result.warning)
      reportStorageFailure({ error: result.error || result.warning })
  },
  { deep: true },
)
</script>

<template>
  <div class="character-sheet">
    <header class="sheet-hero panel">
      <div>
        <p class="eyebrow">Rifts Tool Suite</p>
        <h1>Character Sheet</h1>
        <p>
          Auto-saved locally. Derived values follow the Rifts Ultimate Edition
          character-building rules.
        </p>
      </div>
      <div class="sheet-actions">
        <button
          v-tooltip="'Open the tabbed character builder.'"
          :class="{ secondary: mode !== 'edit' }"
          @click="mode = 'edit'"
        >
          Create / Edit</button
        ><button
          v-tooltip="
            'Open the play sheet with editable damage and resource trackers.'
          "
          :class="{ secondary: mode !== 'play' }"
          @click="enterPlayMode"
        >
          Play</button
        ><button
          class="secondary"
          @click="downloadJson"
        >
          Export</button
        ><label class="import-button"
          >Import<input
            type="file"
            accept="application/json"
            @change="importJson" /></label
        ><button
          class="danger"
          @click="resetSheet"
        >
          Clear
        </button>
      </div>
    </header>
    <p
      v-if="storageStatus"
      class="storage-status panel"
      role="alert"
    >
      {{ storageStatus }}
    </p>

    <div
      v-if="mode === 'edit'"
      class="editor-shell"
    >
      <nav
        class="editor-tabs panel"
        aria-label="Character creation sections"
      >
        <button
          v-for="[id, label] in editTabs"
          :key="id"
          v-tooltip="
            tabStatus(id) === 'error'
              ? 'This section contains an invalid or excessive selection.'
              : tabStatus(id) === 'available'
                ? 'This section has available or incomplete selections.'
                : `${label} is complete.`
          "
          :class="[
            'editor-tab',
            {
              active: editTab === id,
              available: tabStatus(id) === 'available',
              error: tabStatus(id) === 'error',
            },
          ]"
          @click="editTab = id"
        >
          <span>{{ label }}</span
          ><small v-if="tabStatus(id) === 'available'">Action available</small
          ><small v-if="tabStatus(id) === 'error'">Needs correction</small>
        </button>
      </nav>
      <div class="editor-content">
        <section
          v-if="editTab === 'identity'"
          class="panel"
        >
          <h2>Identity</h2>
          <div class="field-grid identity-grid">
            <label
              v-for="(value, key) in state.identity"
              :key="key"
              :class="{
                'required-field': ['name', 'occ'].includes(key),
                'needs-choice':
                  ['name', 'occ'].includes(key) &&
                  !String(state.identity[key] || '').trim(),
              }"
              ><span>{{ key.replace(/([A-Z])/g, ' $1') }}</span
              ><select
                v-if="key === 'occ'"
                v-model="state.identity.occ"
                v-tooltip="OCC_TOOLTIP"
                required
                @change="applyOcc"
              >
                <option value="">No class selected</option>
                <option
                  v-for="occ in occs"
                  :key="occ.id"
                  :value="occ.id"
                >
                  {{ occ.name }}
                </option></select
              ><input
                v-else
                v-model="state.identity[key]"
                :required="key === 'name'"
            /></label>
            <label
              ><span>Experience level</span
              ><input
                v-model.number="state.level"
                type="number"
                min="1"
                max="30"
            /></label>
            <label
              ><span>Experience points</span
              ><input
                v-model.number="state.experience"
                type="number"
                min="0"
            /></label>
          </div>
        </section>

        <section
          v-if="editTab === 'class' && !activeOcc"
          class="panel empty-section"
        >
          <h2>O.C.C. / R.C.C.</h2>
          <p>
            Select a class from the O.C.C. field on the Identity tab to
            configure class abilities and required choices.
          </p>
          <button @click="editTab = 'identity'">Go to Identity</button>
        </section>
        <section
          v-if="editTab === 'class' && activeOcc"
          class="panel class-panel"
        >
          <div class="class-heading">
            <div>
              <p class="eyebrow">Selected class</p>
              <h2
                v-tooltip="activeOcc.description"
                tabindex="0"
              >
                {{ activeOcc.name }}
              </h2>
              <p>{{ activeOcc.description }}</p>
            </div>
            <div class="skill-counters">
              <output
                v-tooltip="RELATED_SKILLS_TOOLTIP"
                tabindex="0"
                ><span>O.C.C. Related</span
                ><strong
                  >{{ relatedUsed }} chosen / {{ relatedTotal }} total</strong
                ></output
              ><output
                v-tooltip="SECONDARY_SKILLS_TOOLTIP"
                tabindex="0"
                ><span>Secondary</span
                ><strong
                  >{{ secondaryUsed }} chosen /
                  {{ secondaryTotal }} total</strong
                ></output
              >
            </div>
          </div>
          <template v-if="activeOcc.specializations.length"
            ><h3>Military occupational specialty (MOS)</h3>
            <div class="specialization-panel">
              <label
                v-tooltip="SPECIALIZATION_TOOLTIP"
                :class="[
                  'required-field',
                  { 'needs-choice': !activeSpecialization },
                ]"
                ><span>MOS</span
                ><select
                  v-model="state.classChoices.specialization.id"
                  required
                  @change="applySpecialization"
                >
                  <option value="">Choose an MOS</option>
                  <option
                    v-for="option in activeOcc.specializations"
                    :key="option.id"
                    :value="option.id"
                  >
                    {{ option.name }}
                  </option>
                </select></label
              >
              <template v-if="activeSpecialization"
                ><div
                  v-if="activeSpecialization.requirements.length"
                  class="specialization-info"
                >
                  <strong>Requirements</strong>
                  <ul>
                    <li
                      v-for="item in activeSpecialization.requirements"
                      :key="item"
                    >
                      {{ item }}
                    </li>
                  </ul>
                </div>
                <div class="class-choice-grid">
                  <template
                    v-for="choice in activeSpecialization.choices"
                    :key="choice.id"
                    ><label
                      v-for="index in choice.count"
                      :key="`${activeSpecialization.id}-${choice.id}-${index}`"
                      v-tooltip="choice.description"
                      :class="[
                        'required-field',
                        {
                          'needs-choice':
                            choice.count > 1
                              ? !state.classChoices.specialization.choices[
                                  choice.id
                                ]?.[index - 1]
                              : !state.classChoices.specialization.choices[
                                  choice.id
                                ],
                          'invalid-choice': specializationChoiceIsDuplicate(
                            choice,
                            index,
                          ),
                        },
                      ]"
                      ><span
                        >{{ choice.label
                        }}{{ choice.count > 1 ? ` ${index}` : '' }}</span
                      ><select
                        v-if="choice.count > 1"
                        v-model="
                          state.classChoices.specialization.choices[choice.id][
                            index - 1
                          ]
                        "
                        required
                        @change="syncSpecializationChoice(choice)"
                      >
                        <option value="">Choose a skill</option>
                        <option
                          v-for="id in choice.options"
                          :key="id"
                          :value="id"
                        >
                          {{ skillsById[id].name }}
                        </option></select
                      ><select
                        v-else
                        v-model="
                          state.classChoices.specialization.choices[choice.id]
                        "
                        required
                        @change="syncSpecializationChoice(choice)"
                      >
                        <option value="">Choose a skill</option>
                        <option
                          v-for="id in choice.options"
                          :key="id"
                          :value="id"
                        >
                          {{ skillsById[id].name }}
                        </option>
                      </select></label
                    ></template
                  >
                  <template
                    v-for="selection in activeSpecialization.selections"
                    :key="selection.id"
                    ><template
                      v-if="
                        specializationSelectionVisible(
                          selection,
                          state.classChoices.specialization,
                        )
                      "
                      ><label
                        v-for="index in selection.count"
                        :key="
                          specializationSelectionKey(
                            activeSpecialization,
                            selection,
                            index,
                          )
                        "
                        :class="[
                          'required-field',
                          {
                            'needs-choice':
                              selection.count > 1
                                ? !state.classChoices.specialization.selections[
                                    selection.id
                                  ]?.[index - 1]
                                : !state.classChoices.specialization.selections[
                                    selection.id
                                  ],
                          },
                        ]"
                        ><span
                          >{{ selection.label
                          }}{{ selection.count > 1 ? ` ${index}` : '' }}</span
                        ><input
                          v-if="selection.count > 1"
                          v-model.trim="
                            state.classChoices.specialization.selections[
                              selection.id
                            ][index - 1]
                          "
                          :placeholder="selection.placeholder"
                          required /><input
                          v-else
                          v-model.trim="
                            state.classChoices.specialization.selections[
                              selection.id
                            ]
                          "
                          :placeholder="selection.placeholder"
                          required /></label></template
                  ></template>
                </div>
                <ul
                  v-if="activeSpecialization.notes.length"
                  class="ability-list specialization-notes"
                >
                  <li
                    v-for="note in activeSpecialization.notes"
                    :key="note"
                  >
                    {{ note }}
                  </li>
                </ul>
              </template>
            </div></template
          >
          <h3>Required O.C.C. choices</h3>
          <div class="class-choice-grid">
            <label
              v-tooltip="nativeLanguageTooltip(activeOcc)"
              :class="[
                'required-field',
                { 'needs-choice': !state.classChoices.nativeLanguage },
              ]"
              ><span>Native language</span
              ><select
                v-model="state.classChoices.nativeLanguage"
                required
                @change="
                  syncOccLanguage('native', state.classChoices.nativeLanguage)
                "
              >
                <option
                  v-for="language in languages"
                  :key="language"
                >
                  {{ language }}
                </option>
              </select></label
            >
            <label
              v-for="(_, index) in state.classChoices.otherLanguages"
              :key="`other-language-${index}`"
              v-tooltip="otherLanguageTooltip(activeOcc)"
              :class="[
                'required-field',
                {
                  'needs-choice': !state.classChoices.otherLanguages[index],
                },
              ]"
              ><span
                >Other language {{ index + 1 }} (+{{
                  activeOcc.languages.otherBonus
                }}%)</span
              ><select
                v-model="state.classChoices.otherLanguages[index]"
                required
                @change="
                  syncOccLanguage(
                    `other-${index}`,
                    state.classChoices.otherLanguages[index],
                  )
                "
              >
                <option value="">Choose a language</option>
                <option
                  v-for="language in languages"
                  :key="language"
                >
                  {{ language }}
                </option>
              </select></label
            >
            <label
              v-for="(_, index) in state.classChoices.literacyLanguages"
              :key="`literacy-language-${index}`"
              v-tooltip="literacyLanguageTooltip(activeOcc)"
              :class="[
                'required-field',
                {
                  'needs-choice': !state.classChoices.literacyLanguages[index],
                },
              ]"
              ><span
                >Literacy {{ index + 1 }} (+{{
                  activeOcc.languages.literacyOtherBonus
                }}%)</span
              ><select
                v-model="state.classChoices.literacyLanguages[index]"
                required
                @change="
                  syncOccLanguage(
                    `literacy-${index}`,
                    state.classChoices.literacyLanguages[index],
                    'literacy',
                  )
                "
              >
                <option value="">Choose a language</option>
                <option
                  v-for="language in languages"
                  :key="language"
                >
                  {{ language }}
                </option>
              </select></label
            >
            <template
              v-for="choice in activeOcc.choices"
              :key="choice.id"
              ><label
                v-for="index in choice.count"
                :key="`${choice.id}-${index}`"
                v-tooltip="choice.description"
                :class="[
                  'required-field',
                  {
                    'needs-choice':
                      choice.count > 1
                        ? !state.classChoices[choice.id]?.[index - 1]
                        : !state.classChoices[choice.id],
                    'invalid-choice': choiceIsDuplicate(choice, index),
                  },
                ]"
                ><span
                  >{{ choice.label
                  }}{{ choice.count > 1 ? ` ${index}` : '' }}</span
                ><select
                  v-if="choice.count > 1"
                  v-model="state.classChoices[choice.id][index - 1]"
                  required
                  @change="syncOccChoice(choice)"
                >
                  <option value="">Choose a skill</option>
                  <option
                    v-for="id in choice.options"
                    :key="id"
                    :value="id"
                  >
                    {{ skillsById[id].name }}
                  </option></select
                ><select
                  v-else
                  v-model="state.classChoices[choice.id]"
                  required
                  @change="syncOccChoice(choice)"
                >
                  <option value="">Choose a skill</option>
                  <option
                    v-for="id in choice.options"
                    :key="id"
                    :value="id"
                  >
                    {{ skillsById[id].name }}
                  </option>
                </select></label
              ></template
            >
          </div>
          <template
            v-for="[heading, notes] in [
              ['Character creation notes', activeOcc.creationNotes],
              ['Resource rules', activeOcc.resourceNotes],
              ['Equipment rules', activeOcc.equipmentNotes],
            ]"
            :key="heading"
          >
            <template v-if="notes.length">
              <h3>{{ heading }}</h3>
              <ul class="ability-list">
                <li
                  v-for="note in notes"
                  :key="note"
                  v-tooltip="note"
                  tabindex="0"
                >
                  {{ note }}
                </li>
              </ul>
            </template>
          </template>
          <h3 v-if="activeOcc.abilities.length">Other abilities</h3>
          <div
            v-if="activeOccMdc"
            class="class-stats"
          >
            <output
              v-tooltip="'Class-specific natural and armor M.D.C. maximums.'"
              tabindex="0"
              ><span>Main body / armor / combined M.D.C.</span
              ><strong
                >{{ activeOccMdc.mainBody }} / {{ activeOccMdc.armor }} /
                {{ activeOccMdc.total }}</strong
              ></output
            >
          </div>
          <ul class="ability-list">
            <li
              v-for="ability in activeOcc.abilities"
              :key="ability"
              v-tooltip="ability"
              tabindex="0"
            >
              {{ ability }}
            </li>
          </ul>
        </section>

        <div
          v-if="editTab === 'attributes'"
          class="sheet-columns attribute-health-layout"
        >
          <section class="panel attribute-builder">
            <header class="attribute-builder-heading">
              <div>
                <h2>Attributes</h2>
                <p>
                  Generated values remain fully editable ·
                  {{ attributeRulesSource.book }} pp.
                  {{ attributeRulesSource.pages }}
                </p>
              </div>
              <button
                type="button"
                @click="rollAllAttributes"
              >
                Roll all attributes
              </button>
            </header>
            <p
              v-if="attributeRollError"
              class="attribute-requirement-alert"
              role="alert"
            >
              {{ attributeRollError }}
            </p>
            <p
              v-if="unmetAttributeRequirements.length"
              class="attribute-requirement-alert"
              role="alert"
            >
              {{ activeOcc.name }} requirements not met:
              {{
                unmetAttributeRequirements.map((item) => item.label).join(', ')
              }}.
            </p>
            <div class="attribute-grid">
              <label
                v-for="(value, key) in state.attributes"
                :key="key"
                :class="{
                  'attribute-requirement-unmet': attributeRequirementUnmet(key),
                }"
                ><span
                  >{{ key.toUpperCase() }}
                  <em v-if="attributeRequirement(key)">
                    {{
                      attributeRequirement(key).recommended
                        ? 'suggested'
                        : 'minimum'
                    }}
                    {{ attributeRequirement(key).minimum }}
                  </em></span
                ><input
                  v-model.number="state.attributes[key]"
                  type="number"
                  min="0"
                  :aria-invalid="
                    attributeRequirementUnmet(key) ? 'true' : undefined
                  "
                /><small v-if="trainedEffects.attributes[key]"
                  >Trained skills +{{ trainedEffects.attributes[key] }} · total
                  {{ effectiveAttributes[key] }}</small
                ><small v-else-if="key === 'iq'"
                  >Skill bonus +{{ iqBonus }}%</small
                ><small v-if="state.attributeGeneration.base?.rolls[key]">
                  Rolled
                  {{
                    diceText(state.attributeGeneration.base.rolls[key].baseDice)
                  }}
                  <template
                    v-if="
                      state.attributeGeneration.base.rolls[key].exceptionalDice
                        ?.length
                    "
                  >
                    + exceptional
                    {{
                      diceText(
                        state.attributeGeneration.base.rolls[key]
                          .exceptionalDice,
                      )
                    }}</template
                  >
                </small></label
              >
            </div>
            <section
              v-if="state.attributeGeneration.lowAssignments.length"
              class="attribute-adjustments"
            >
              <h3>Low-attribute bonus choices</h3>
              <p>The book grants these bonuses to attributes of your choice.</p>
              <p
                v-if="
                  state.attributeGeneration.base.lowAttributeCompensation
                    .perceptionBonus
                "
                class="attribute-rule-note"
              >
                +{{
                  state.attributeGeneration.base.lowAttributeCompensation
                    .perceptionBonus
                }}
                Perception was applied automatically for multiple low
                attributes.
              </p>
              <div
                v-for="assignment in state.attributeGeneration.lowAssignments"
                :key="assignment.id"
                class="attribute-adjustment-row"
              >
                <span>
                  {{ assignment.label }}: +{{ assignment.value }} ({{
                    diceText(assignment.dice)
                  }})
                </span>
                <select
                  v-model="assignment.selectedTarget"
                  :disabled="assignment.applied"
                  aria-label="Attribute receiving low-attribute bonus"
                >
                  <option value="">Choose attribute</option>
                  <option
                    v-for="key in lowBonusTargets(assignment)"
                    :key="key"
                    :value="key"
                  >
                    {{ attributeName(key) }}
                  </option>
                </select>
                <button
                  type="button"
                  class="secondary"
                  :disabled="
                    assignment.applied ||
                    !lowBonusTargets(assignment).includes(
                      assignment.selectedTarget,
                    )
                  "
                  @click="applyLowAttributeBonus(assignment)"
                >
                  {{ assignment.applied ? 'Applied' : 'Apply' }}
                </button>
              </div>
            </section>
            <section
              v-if="activeOcc?.attributeBonuses?.length"
              class="attribute-adjustments occ-attribute-bonuses"
            >
              <div class="attribute-bonus-heading">
                <div>
                  <h3>{{ activeOcc.name }} attribute bonuses</h3>
                  <p>
                    Roll and apply this class package once
                    <template v-if="activeOcc.attributeBonusSource">
                      · {{ activeOcc.attributeBonusSource.book }} p.
                      {{ activeOcc.attributeBonusSource.pages }}</template
                    >.
                  </p>
                </div>
                <button
                  type="button"
                  :disabled="Boolean(state.attributeGeneration.occBonuses)"
                  @click="rollClassAttributeBonuses"
                >
                  {{
                    state.attributeGeneration.occBonuses
                      ? 'Class bonuses applied'
                      : 'Roll class bonuses'
                  }}
                </button>
              </div>
              <ul v-if="state.attributeGeneration.occBonuses">
                <li
                  v-for="operation in state.attributeGeneration.occBonuses
                    .operations"
                  :key="operation.id"
                >
                  {{ operation.label }}:
                  {{ operation.operation === 'add' ? '+' : ''
                  }}{{ operation.value }}
                  <span v-if="operation.dice?.length">
                    ({{ diceText(operation.dice) }})
                  </span>
                </li>
              </ul>
            </section>
          </section>
          <section class="panel">
            <h2>Health & resources</h2>
            <div class="field-grid compact">
              <label
                ><span>First-level HP d6</span
                ><input
                  v-model.number="state.hpFirstRoll"
                  type="number"
                  min="0"
                  max="6"
              /></label>
              <label
                ><span>Later-level HP rolls</span
                ><input
                  v-model.number="state.hpLaterRolls"
                  type="number"
                  min="0"
              /></label>
              <label
                ><span>Other HP bonus</span
                ><input
                  v-model.number="state.hpBonus"
                  type="number"
              /></label>
              <output
                v-tooltip="derivedTooltip('hp')"
                class="derived-help"
                tabindex="0"
                ><span>Hit Points</span
                ><strong>{{ derived.hp }}</strong></output
              >
              <label
                ><span>Base S.D.C.</span
                ><input
                  v-model.number="state.sdcBase"
                  type="number"
                  min="0"
              /></label>
              <label class="derived-input-help"
                ><span>Other S.D.C. bonuses</span
                ><input
                  v-tooltip="derivedTooltip('otherSdc')"
                  :value="(+state.sdcBonus || 0) + trainedEffects.sdc"
                  type="number"
                  @input="setOtherSdcTotal"
              /></label>
              <output
                v-tooltip="derivedTooltip('sdc')"
                class="derived-help"
                tabindex="0"
                ><span>Physical S.D.C.</span
                ><strong>{{ derived.sdc }}</strong></output
              >
              <label
                v-for="(_, key) in state.resources"
                :key="key"
                ><span>{{ key.toUpperCase() }}</span
                ><input
                  v-model.number="state.resources[key]"
                  type="number"
                  min="0"
              /></label>
            </div>
          </section>
        </div>

        <section
          v-if="editTab === 'derived'"
          class="panel"
        >
          <h2>Derived values</h2>
          <div class="derived-grid">
            <label
              ><span>Strength type</span
              ><select v-model="state.strengthType">
                <option value="normal">Normal / augmented</option>
                <option value="robot">Robot</option>
                <option value="supernatural">Supernatural</option>
              </select></label
            >
            <label
              ><span>Base attacks per melee</span
              ><input
                v-model.number="state.attacks"
                type="number"
                min="1"
            /></label>
            <output
              v-tooltip="derivedTooltip('attacks')"
              class="derived-help"
              tabindex="0"
              ><span>Total attacks per melee</span
              ><strong>{{ derived.attacks }}</strong></output
            >
            <output
              v-tooltip="derivedTooltip('weight')"
              class="derived-help"
              tabindex="0"
              ><span>Carry / lift</span
              ><strong
                >{{ derived.weight.carry }} /
                {{ derived.weight.lift }} lb</strong
              ></output
            >
            <output
              v-tooltip="derivedTooltip('movement')"
              class="derived-help"
              tabindex="0"
              ><span>Running</span><strong>{{ derived.move.mph }} mph</strong
              ><small
                >{{ derived.move.perMelee }} ft/melee ·
                {{ derived.move.perAttack }} ft/attack</small
              ></output
            >
            <output
              v-tooltip="derivedTooltip('damage')"
              class="derived-help"
              tabindex="0"
              ><span>P.S. damage bonus</span
              ><strong>+{{ derived.damage }}</strong></output
            >
            <output
              v-tooltip="derivedTooltip('trust')"
              class="derived-help"
              tabindex="0"
              ><span>Trust / intimidate</span
              ><strong>{{
                derived.trust ? derived.trust + '%' : '—'
              }}</strong></output
            >
            <output
              v-tooltip="derivedTooltip('charm')"
              class="derived-help"
              tabindex="0"
              ><span>Charm / impress</span
              ><strong>{{
                derived.charm ? derived.charm + '%' : '—'
              }}</strong></output
            >
            <output
              v-tooltip="derivedTooltip('coma')"
              class="derived-help"
              tabindex="0"
              ><span>Save vs coma / death</span
              ><strong>+{{ derived.coma }}%</strong></output
            >
            <output
              v-tooltip="derivedTooltip('magic')"
              class="derived-help"
              tabindex="0"
              ><span>Save vs magic</span
              ><strong>+{{ derived.magic }}</strong></output
            >
            <output
              v-tooltip="derivedTooltip('poison')"
              class="derived-help"
              tabindex="0"
              ><span>Save vs poison</span
              ><strong>+{{ derived.poison }}</strong></output
            >
            <output
              v-tooltip="derivedTooltip('possession')"
              class="derived-help"
              tabindex="0"
              ><span>Save vs possession</span
              ><strong>+{{ derived.possession }}</strong></output
            >
            <output
              v-tooltip="derivedTooltip('psionicsInsanity')"
              class="derived-help"
              tabindex="0"
              ><span>Save vs psionics / insanity</span
              ><strong
                >+{{ derived.psionics }} / +{{ derived.insanity }}</strong
              ></output
            >
            <output v-if="derived.mindControl"
              ><span>Save vs mind control</span
              ><strong>+{{ derived.mindControl }}</strong></output
            ><output v-if="activeOcc.saveBonuses.disease"
              ><span>Save vs disease</span
              ><strong>+{{ derived.disease }}</strong></output
            ><output v-if="derived.horrorFactor"
              ><span>Save vs Horror Factor</span
              ><strong>+{{ derived.horrorFactor }}</strong></output
            ><output v-if="derived.pain"
              ><span>Save vs pain</span
              ><strong>+{{ derived.pain }}</strong></output
            ><output v-if="derived.fatigue"
              ><span>Save vs fatigue</span
              ><strong>+{{ derived.fatigue }}</strong></output
            >
          </div>
          <h3>Combat bonuses</h3>
          <div class="combat-grid">
            <label
              v-for="(_, key) in state.combat"
              :key="key"
              ><span>Other {{ key }}</span
              ><input
                v-model.number="state.combat[key]"
                type="number" /></label
            ><output
              v-tooltip="derivedTooltip('initiative')"
              class="derived-help"
              tabindex="0"
              ><span>Total initiative</span
              ><strong>+{{ derived.initiative }}</strong></output
            ><output
              v-tooltip="derivedTooltip('strike')"
              class="derived-help"
              tabindex="0"
              ><span>Total strike</span
              ><strong>+{{ derived.strike }}</strong></output
            ><output
              v-tooltip="derivedTooltip('parry')"
              class="derived-help"
              tabindex="0"
              ><span>Total parry</span
              ><strong>+{{ derived.parry }}</strong></output
            ><output
              v-tooltip="derivedTooltip('dodge')"
              class="derived-help"
              tabindex="0"
              ><span>Total dodge</span
              ><strong>+{{ derived.dodge }}</strong></output
            ><output v-if="derived.automaticDodge"
              ><span>Automatic dodge</span
              ><strong>+{{ derived.automaticDodge }}</strong></output
            ><output
              v-tooltip="derivedTooltip('roll')"
              class="derived-help"
              tabindex="0"
              ><span>Total roll with impact</span
              ><strong>+{{ derived.roll }}</strong></output
            ><output
              v-tooltip="derivedTooltip('perception')"
              class="derived-help"
              tabindex="0"
              ><span>Total perception</span
              ><strong>+{{ derived.perception }}</strong></output
            >
          </div>
          <template v-if="trainedEffects.rolls.length"
            ><h3>Rolled trained-skill bonuses</h3>
            <p>
              Enter the result rolled when the skill was learned. These values
              are included in the derived attributes and S.D.C. above.
            </p>
            <div class="skill-roll-grid">
              <label
                v-for="roll in trainedEffects.rolls"
                :key="`${roll.id}:${roll.type}`"
                ><span
                  >{{ skillsById[roll.id].name }} · {{ roll.dice }}
                  {{ roll.type === 'sdc' ? 'S.D.C.' : 'Speed' }}</span
                ><input
                  v-model.number="
                    state.skillBonusRolls[`${roll.id}:${roll.type}`]
                  "
                  type="number"
                  min="0"
              /></label></div
          ></template>
          <template v-if="trainedEffects.situational.length"
            ><h3>Situational trained-skill bonuses</h3>
            <ul class="situational-list">
              <li
                v-for="note in trainedEffects.situational"
                :key="note"
              >
                {{ note }}
              </li>
            </ul></template
          >
          <template v-if="activeOcc.situationalBonuses.length"
            ><h3>Situational class bonuses</h3>
            <ul class="situational-list">
              <li
                v-for="note in activeOcc.situationalBonuses"
                :key="note"
              >
                {{ note }}
              </li>
            </ul></template
          >
        </section>

        <section
          v-if="editTab === 'skills'"
          class="panel skills-panel"
        >
          <div class="skills-heading">
            <div>
              <h2>Skills</h2>
              <p>
                Highlighted categories contain valid skills you can choose with
                an available O.C.C. Related slot. Any non-O.C.C. skill can be
                selected as Secondary. A repeated skill is one shared record:
                editing it in any category updates every occurrence.
              </p>
            </div>
            <div
              v-if="activeOcc"
              class="skill-counters"
            >
              <output
                v-tooltip="
                  'O.C.C. Related Skills chosen / total at this level.'
                "
                tabindex="0"
                ><span>O.C.C. Related</span
                ><strong
                  >{{ relatedUsed }} / {{ relatedTotal }} chosen</strong
                ></output
              ><output
                v-tooltip="'Secondary Skills chosen / total at this level.'"
                tabindex="0"
                ><span>Secondary</span
                ><strong
                  >{{ secondaryUsed }} / {{ secondaryTotal }} chosen</strong
                ></output
              >
            </div>
          </div>
          <div class="language-groups">
            <section
              v-for="kind in ['spoken', 'literacy']"
              :key="kind"
              class="language-group"
            >
              <header>
                <div>
                  <h3>{{ languageRules[kind].label }}</h3>
                  <p>{{ languageRules[kind].description }}</p>
                </div>
                <button
                  type="button"
                  :aria-label="`Add ${languageRules[kind].label}`"
                  @click="addLanguage(kind)"
                >
                  + Add
                </button>
              </header>
              <p
                v-if="!state.languages[kind].length"
                class="empty-language"
              >
                No {{ kind }} languages added.
              </p>
              <div
                v-for="(record, index) in state.languages[kind]"
                :key="`${kind}-${index}`"
                class="language-row"
              >
                <label
                  ><span>Type</span
                  ><select v-model="record.type">
                    <option
                      v-for="language in languages"
                      :key="language"
                    >
                      {{ language }}
                    </option>
                  </select></label
                >
                <output
                  ><span>Total</span
                  ><strong>{{ languageTotal(kind, record) }}%</strong></output
                >
                <output
                  ><span>Base</span
                  ><strong
                    >{{
                      record.baseOverride ?? languageRules[kind].base
                    }}%</strong
                  ></output
                >
                <label
                  ><span>OCC bonus</span
                  ><input
                    v-model.number="record.occBonus"
                    type="number"
                /></label>
                <label
                  ><span>Other</span
                  ><input
                    v-model.number="record.otherBonus"
                    type="number"
                /></label>
                <label class="language-iq"
                  ><span>I.Q.</span
                  ><span class="check-line"
                    ><input
                      v-model="record.useIq"
                      type="checkbox"
                    />{{ record.useIq ? `+${iqBonus}%` : 'off' }}</span
                  ></label
                >
                <label
                  ><span>Learned lvl</span
                  ><input
                    v-model.number="record.learnedLevel"
                    type="number"
                    min="1"
                    :max="state.level"
                /></label>
                <output
                  ><span>Skill lvl</span
                  ><strong>{{ languageLevel(record) }}</strong></output
                >
                <output
                  ><span>Level gain</span
                  ><strong
                    >+{{
                      Math.max(0, languageLevel(record) - 1) *
                      (record.perLevelOverride ?? languageRules[kind].perLevel)
                    }}%</strong
                  ></output
                >
                <button
                  type="button"
                  class="danger remove-language"
                  aria-label="Remove language"
                  @click="state.languages[kind].splice(index, 1)"
                >
                  &times;
                </button>
              </div>
            </section>
          </div>
          <details
            v-for="[category, ids] in skillCategories"
            :key="category"
            :class="{ 'has-available-skills': isCategoryChoiceAvailable(ids) }"
          >
            <summary>
              <span>{{ category }}</span
              ><small
                >{{
                  ids.filter((id) => skillRecord(id).selected).length
                }}
                selected / {{ ids.length }}</small
              >
            </summary>
            <div class="skill-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Use</th>
                    <th>Skill</th>
                    <th>Training</th>
                    <th>Total</th>
                    <th>Base</th>
                    <th>OCC bonus</th>
                    <th>Other</th>
                    <th>I.Q.</th>
                    <th>Learned lvl</th>
                    <th>Current lvl</th>
                    <th>Level gain</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="id in ids"
                    :key="id"
                    :class="{
                      selected: skillRecord(id).selected,
                      'available-skill': isSkillChoiceAvailable(id),
                    }"
                  >
                    <td>
                      <input
                        v-model="skillRecord(id).selected"
                        type="checkbox"
                        :disabled="
                          ['occ', 'occ-choice'].includes(
                            skillRecord(id).trainingType,
                          )
                        "
                        :aria-label="`Select ${skillsById[id].name}`"
                        @change="toggleSkill(id)"
                      />
                    </td>
                    <th
                      scope="row"
                      class="skill-name-cell"
                    >
                      <span
                        v-tooltip="descriptionFor(id)"
                        class="skill-help"
                        tabindex="0"
                        >{{ skillsById[id].name }}</span
                      ><small v-if="skillsById[id].note">{{
                        skillsById[id].note
                      }}</small
                      ><small v-if="activeOcc && relatedInfo(id).eligible"
                        >Eligible as O.C.C. Related{{
                          relatedInfo(id).bonus
                            ? ` at +${relatedInfo(id).bonus}%`
                            : ''
                        }}</small
                      ><small v-if="activeOcc && !isOccSkill(id)"
                        >Eligible as Secondary at +0% O.C.C.</small
                      >
                    </th>
                    <td>
                      <span v-if="skillRecord(id).trainingType === 'occ'"
                        >Automatic O.C.C.</span
                      ><span
                        v-else-if="
                          skillRecord(id).trainingType === 'occ-choice'
                        "
                        >O.C.C. choice</span
                      ><select
                        v-else
                        v-tooltip="TRAINING_TOOLTIP"
                        :value="skillRecord(id).trainingType"
                        @change="setTraining(id, $event.target.value)"
                      >
                        <option
                          v-for="option in trainingOptions(id)"
                          :key="option.value"
                          :value="option.value"
                        >
                          {{ option.label }}
                        </option>
                      </select>
                    </td>
                    <td class="total">
                      {{
                        totalFor(id) == null ? 'Special' : totalFor(id) + '%'
                      }}
                    </td>
                    <td>
                      {{
                        skillsById[id].base == null
                          ? '—'
                          : skillsById[id].base + '%'
                      }}
                    </td>
                    <td>
                      <input
                        v-model.number="skillRecord(id).occBonus"
                        type="number"
                        :disabled="
                          [
                            'occ',
                            'occ-choice',
                            'related',
                            'secondary',
                          ].includes(skillRecord(id).trainingType)
                        "
                        aria-label="OCC bonus"
                      />
                    </td>
                    <td>
                      <input
                        v-model.number="skillRecord(id).otherBonus"
                        type="number"
                        aria-label="Other bonus"
                      /><small v-if="trainedSkillBonus(id)"
                        >+{{ trainedSkillBonus(id) }}% trained skill</small
                      >
                    </td>
                    <td>
                      <label class="iq-toggle"
                        ><input
                          v-model="skillRecord(id).useIq"
                          type="checkbox"
                        />{{
                          skillRecord(id).useIq ? `+${iqBonus}%` : 'off'
                        }}</label
                      >
                    </td>
                    <td>
                      <input
                        v-model.number="skillRecord(id).learnedLevel"
                        type="number"
                        min="1"
                        :max="state.level"
                        aria-label="Learned level"
                      />
                    </td>
                    <td>{{ skillLevel(id) }}</td>
                    <td>
                      {{
                        skillsById[id].base == null
                          ? '—'
                          : '+' +
                            Math.max(0, skillLevel(id) - 1) *
                              skillsById[id].perLevel +
                            '%'
                      }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>
        </section>

        <section
          v-if="editTab === 'equipment'"
          class="panel equipment-editor"
        >
          <header class="equipment-editor-heading">
            <h2>Equipment</h2>
            <button
              type="button"
              @click="openEquipmentCatalog"
            >
              Browse Armory
            </button>
          </header>
          <p>
            Add the equipment the character owns. Combat-use values such as
            ammunition and current armor or vehicle durability are tracked
            separately in Play mode.
          </p>
          <section
            v-for="section in equipmentSections"
            :key="section.id"
            class="equipment-section"
          >
            <header>
              <div>
                <h3>{{ section.label }}</h3>
                <p>{{ section.description }}</p>
              </div>
              <button
                v-tooltip="equipmentActionTooltip('add', section)"
                type="button"
                @click="addEquipment(section.id)"
              >
                + Add {{ section.singular }}
              </button>
            </header>
            <section
              v-if="startingChoicesFor(section.id).length"
              class="starting-equipment-choices"
            >
              <h4>Required {{ section.singular.toLowerCase() }} choices</h4>
              <div class="class-choice-grid">
                <div
                  v-for="choice in startingChoicesFor(section.id)"
                  :key="choice.item.id"
                  :class="{
                    'needs-choice': !String(choice.item.name || '').trim(),
                  }"
                >
                  <span>{{ choice.item.choice.prompt }}</span>
                  <button
                    type="button"
                    @click="openStartingEquipmentChoice(choice)"
                  >
                    {{
                      choice.item.name
                        ? `Change ${choice.item.name}`
                        : `Choose ${section.singular}`
                    }}
                  </button>
                </div>
              </div>
            </section>
            <p
              v-if="
                state.equipment[section.id].every(
                  (item) => item.choice && !item.catalogSelectionId,
                )
              "
              class="empty-equipment"
            >
              No additional {{ section.label.toLowerCase() }} added.
            </p>
            <div
              v-if="
                section.id === 'weapons' &&
                state.equipment.weapons.some(
                  (item) => !item.choice || item.catalogSelectionId,
                )
              "
              class="weapon-roster-heading"
              aria-hidden="true"
            >
              <span>Weapon</span>
              <span>Damage</span>
              <span>Range</span>
              <span>Ammunition</span>
            </div>
            <article
              v-for="(item, index) in state.equipment[section.id]"
              v-show="!item.choice || item.catalogSelectionId"
              :key="item.id"
              class="equipment-edit-card"
              :class="{ 'weapon-roster-card': section.id === 'weapons' }"
            >
              <details class="equipment-card-disclosure">
                <summary
                  v-if="section.id === 'weapons'"
                  class="weapon-roster-row"
                >
                  <span class="weapon-roster-name">
                    <strong>{{ item.name || 'Unnamed weapon' }}</strong>
                    <small>{{
                      item.subcategory || item.category || 'Weapon'
                    }}</small>
                  </span>
                  <span data-label="Damage">{{ item.damage || '—' }}</span>
                  <span data-label="Range">{{ item.range || '—' }}</span>
                  <span
                    data-label="Ammunition"
                    class="weapon-roster-ammo"
                  >
                    {{ equipmentStatus(item).ammo
                    }}<template v-if="item.ammoMax">
                      / {{ item.ammoMax }}</template
                    >
                  </span>
                </summary>
                <summary
                  v-else
                  class="equipment-simple-summary"
                >
                  <strong>{{
                    item.name || `Unnamed ${section.singular}`
                  }}</strong>
                  <span v-if="item.quantity">Quantity {{ item.quantity }}</span>
                  <span v-else-if="item.category">{{ item.category }}</span>
                </summary>
                <CatalogEntryDetails
                  v-if="item.statistics?.length"
                  :entry="item"
                  compact
                />
                <div
                  v-if="!item.statistics?.length"
                  class="equipment-fields"
                >
                  <label
                    v-for="[key, label, type, help] in section.fields"
                    :key="key"
                    v-tooltip="help"
                    :class="{
                      'wide-field': type === 'textarea',
                      'required-field': key === 'name',
                      'needs-choice':
                        key === 'name' && !String(item.name || '').trim(),
                    }"
                    ><span>{{ label }}</span
                    ><textarea
                      v-if="type === 'textarea'"
                      v-model="item[key]"
                      rows="2"
                    ></textarea
                    ><input
                      v-else
                      v-model="item[key]"
                      :type="type"
                      :min="type === 'number' ? 0 : undefined"
                      :required="key === 'name'"
                  /></label>
                </div>
                <div
                  v-else
                  class="equipment-fields catalog-character-fields"
                >
                  <label v-if="section.id === 'weapons'">
                    <span>Current ammunition</span>
                    <span class="tracker-line">
                      <input
                        v-model.number="equipmentStatus(item).ammo"
                        type="number"
                        min="0"
                        :max="item.ammoMax || undefined"
                      />
                      <strong v-if="item.ammoMax">/ {{ item.ammoMax }}</strong>
                    </span>
                  </label>
                  <label class="wide-field">
                    <span>Character notes</span>
                    <textarea
                      v-model="item.notes"
                      rows="2"
                    ></textarea>
                  </label>
                </div>
                <button
                  v-tooltip="equipmentActionTooltip('remove', section)"
                  type="button"
                  class="danger equipment-remove"
                  @click="removeEquipment(section.id, index)"
                >
                  Remove
                </button>
              </details>
            </article>
          </section>
        </section>

        <section
          v-if="editTab === 'magic'"
          class="panel spellbook"
        >
          <header class="spellbook-heading">
            <div>
              <h2>Known spells</h2>
              <p>
                Invocations are organized by level and alphabetized by name.
              </p>
            </div>
            <button
              type="button"
              @click="spellPickerOpen = true"
            >
              Browse Invocations
            </button>
          </header>
          <p
            v-if="!knownSpellGroups.length"
            class="empty-equipment"
          >
            No spells have been added.
          </p>
          <section
            v-for="group in knownSpellGroups"
            :key="group.level"
            class="spell-level-group"
          >
            <h3>Level {{ group.level }}</h3>
            <div
              class="spellbook-table-heading"
              aria-hidden="true"
            >
              <span>Name</span><span>Cost</span><span>Level</span><span></span>
            </div>
            <article
              v-for="spell in group.entries"
              :key="spell.id"
              class="spellbook-row"
            >
              <button
                type="button"
                class="spellbook-summary"
                @click="openSpellDetail(spell)"
              >
                <strong>{{ spell.name }}</strong>
                <span>{{ spell.cost }}</span>
                <span>{{ spell.level }}</span>
              </button>
              <button
                type="button"
                class="danger"
                :aria-label="`Remove ${spell.name}`"
                @click="removeKnownSpell(spell.id)"
              >
                Remove
              </button>
            </article>
          </section>
        </section>

        <section
          v-if="editTab === 'record'"
          class="panel"
        >
          <h2>Character record</h2>
          <div class="notes-grid">
            <label
              v-for="(_, key) in state.notes"
              :key="key"
              ><span>{{ key }}</span
              ><textarea
                v-model="state.notes[key]"
                rows="5"
              ></textarea>
            </label>
          </div>
        </section>
      </div>
    </div>

    <section
      v-else
      class="play-sheet"
    >
      <div class="play-column play-column-left">
        <section class="panel play-identity">
          <div>
            <p class="eyebrow">Play mode</p>
            <h2>{{ state.identity.name || 'Unnamed Character' }}</h2>
            <p class="identity-chips">
              <span>{{
                activeOcc?.name || state.identity.occupation || 'No class'
              }}</span>
              <span>Level {{ state.level }}</span>
              <span>{{ state.identity.race || 'Race not set' }}</span>
              <span>{{ state.identity.alignment || 'Alignment not set' }}</span>
            </p>
          </div>
          <button
            class="secondary"
            @click="mode = 'edit'"
          >
            Edit character
          </button>
        </section>
        <section class="panel play-live-status">
          <h2>Live status</h2>
          <div class="play-trackers">
            <label v-tooltip="`Current Hit Points. Maximum: ${derived.hp}`"
              ><span>HP current / max</span
              ><span class="tracker-line"
                ><input
                  v-model.number="state.play.hp"
                  type="number"
                /><strong>/ {{ derived.hp }}</strong></span
              ></label
            ><label
              v-tooltip="`Current Physical S.D.C. Maximum: ${derived.sdc}`"
              ><span>S.D.C. current / max</span
              ><span class="tracker-line"
                ><input
                  v-model.number="state.play.sdc"
                  type="number"
                /><strong>/ {{ derived.sdc }}</strong></span
              ></label
            ><label
              v-if="activeOccMdc"
              v-tooltip="'Current class-specific main-body M.D.C.'"
              ><span>Main-body M.D.C.</span
              ><span class="tracker-line"
                ><input
                  v-model.number="state.play.mdc"
                  type="number"
                /><strong>/ {{ activeOccMdc.mainBody }}</strong></span
              ></label
            ><label
              v-if="activeOccMdc"
              v-tooltip="'Current class-specific external armor M.D.C.'"
              ><span>Armor M.D.C.</span
              ><span class="tracker-line"
                ><input
                  v-model.number="state.play.armorMdc"
                  type="number"
                /><strong>/ {{ activeOccMdc.armor }}</strong></span
              ></label
            ><label
              v-for="key in ['isp', 'ppe', 'chi']"
              :key="key"
              v-tooltip="
                `Current ${key.toUpperCase()}. Maximum: ${state.resources[key]}`
              "
              ><span>{{ key.toUpperCase() }} current / max</span
              ><span class="tracker-line"
                ><input
                  v-model.number="state.play[key]"
                  type="number"
                /><strong>/ {{ state.resources[key] }}</strong></span
              ></label
            >
          </div>
        </section>
        <section class="panel play-attributes">
          <h2>Attributes</h2>
          <div class="play-stat-grid">
            <output
              v-for="(value, key) in effectiveAttributes"
              :key="key"
              ><span>{{ key.toUpperCase() }}</span
              ><strong>{{ value }}</strong></output
            >
          </div>
        </section>
        <section class="panel play-movement">
          <h2>Movement & saves</h2>
          <div class="play-stat-grid">
            <output
              ><span>Running</span><strong>{{ derived.move.mph }} mph</strong
              ><small>{{ derived.move.perMelee }} ft/melee</small></output
            ><output
              ><span>Carry / lift</span
              ><strong
                >{{ derived.weight.carry }} /
                {{ derived.weight.lift }} lb</strong
              ></output
            ><output
              ><span>Magic</span><strong>+{{ derived.magic }}</strong></output
            ><output
              ><span>Toxins / poison</span
              ><strong>+{{ derived.poison }}</strong></output
            ><output
              ><span>Possession</span
              ><strong>+{{ derived.possession }}</strong></output
            ><output
              ><span>Psionics</span
              ><strong>+{{ derived.psionics }}</strong></output
            ><output v-if="derived.mindControl"
              ><span>Mind control</span
              ><strong>+{{ derived.mindControl }}</strong></output
            ><output v-if="activeOcc.saveBonuses.disease"
              ><span>Disease</span
              ><strong>+{{ derived.disease }}</strong></output
            ><output v-if="derived.horrorFactor"
              ><span>Horror Factor</span
              ><strong>+{{ derived.horrorFactor }}</strong></output
            ><output v-if="derived.pain"
              ><span>Pain</span><strong>+{{ derived.pain }}</strong></output
            ><output v-if="derived.fatigue"
              ><span>Fatigue</span
              ><strong>+{{ derived.fatigue }}</strong></output
            ><output
              ><span>Insanity</span
              ><strong>+{{ derived.insanity }}</strong></output
            ><output
              ><span>Coma / death</span
              ><strong>+{{ derived.coma }}%</strong></output
            >
          </div>
        </section>
        <section class="panel play-languages">
          <h2>Languages</h2>
          <div class="play-skill-grid">
            <div
              v-for="record in state.languages.spoken"
              :key="'spoken-' + record.type"
              tabindex="0"
            >
              <span>Spoken: {{ record.type }}</span
              ><strong>{{ languageTotal('spoken', record) }}%</strong>
            </div>
            <div
              v-for="record in state.languages.literacy"
              :key="'literacy-' + record.type"
              tabindex="0"
            >
              <span>Literacy: {{ record.type }}</span
              ><strong>{{ languageTotal('literacy', record) }}%</strong>
            </div>
          </div>
        </section>
        <section class="panel play-skills">
          <h2>Trained skills</h2>
          <template v-if="trainedPercentageSkills.length">
            <h3>Percentage skills</h3>
            <div class="play-percentage-skills">
              <div
                v-for="skill in trainedPercentageSkills"
                :key="skill.id"
              >
                <span
                  v-tooltip="descriptionFor(skill.id)"
                  tabindex="0"
                  >{{ skill.name }}</span
                >
                <strong
                  v-tooltip="skillTotalTooltip(skill.id)"
                  tabindex="0"
                  >{{ totalFor(skill.id) }}%</strong
                >
              </div>
            </div>
          </template>
          <template v-if="trainedSpecialSkills.length">
            <h3>Special skills</h3>
            <div class="play-special-skills">
              <div
                v-for="skill in trainedSpecialSkills"
                :key="skill.id"
              >
                <span
                  v-tooltip="descriptionFor(skill.id)"
                  tabindex="0"
                  >{{ skill.name }}</span
                >
                <strong>Special</strong>
              </div>
            </div>
          </template>
          <p
            v-if="
              !trainedPercentageSkills.length && !trainedSpecialSkills.length
            "
          >
            No trained skills.
          </p>
          <template v-if="activeOcc.situationalBonuses.length"
            ><h3>Situational class bonuses</h3>
            <ul class="situational-list">
              <li
                v-for="note in activeOcc.situationalBonuses"
                :key="note"
              >
                {{ note }}
              </li>
            </ul></template
          >
        </section>
      </div>

      <div class="play-column play-column-middle">
        <section class="panel play-combat">
          <h2>Combat</h2>
          <div class="play-stat-grid">
            <output
              ><span>Attacks</span
              ><strong>{{ derived.attacks }}</strong></output
            ><output
              ><span>Initiative</span
              ><strong>+{{ derived.initiative }}</strong></output
            ><output
              ><span>Strike</span><strong>+{{ derived.strike }}</strong></output
            ><output
              ><span>Parry</span><strong>+{{ derived.parry }}</strong></output
            ><output
              ><span>Dodge</span><strong>+{{ derived.dodge }}</strong></output
            ><output v-if="derived.automaticDodge"
              ><span>Automatic dodge</span
              ><strong>+{{ derived.automaticDodge }}</strong></output
            ><output
              ><span>Roll</span><strong>+{{ derived.roll }}</strong></output
            ><output
              ><span>Perception</span
              ><strong>+{{ derived.perception }}</strong></output
            ><output
              ><span>P.S. damage</span
              ><strong>+{{ derived.damage }}</strong></output
            >
          </div>
        </section>
        <section class="panel play-equipment">
          <h2>Equipment</h2>
          <template
            v-for="section in equipmentSections"
            :key="section.id"
          >
            <div
              v-if="populatedEquipment(section.id).length"
              class="play-equipment-section"
            >
              <h3>{{ section.label }}</h3>
              <div
                v-if="section.id === 'weapons'"
                class="weapon-roster-heading"
                aria-hidden="true"
              >
                <span>Weapon</span>
                <span>Damage</span>
                <span>Range</span>
                <span>Ammunition</span>
              </div>
              <div
                class="play-equipment-grid"
                :class="{ 'weapon-roster': section.id === 'weapons' }"
              >
                <article
                  v-for="item in populatedEquipment(section.id)"
                  :key="item.id"
                  v-tooltip="item.notes || carriedEquipmentTooltip(section)"
                  :tabindex="section.id === 'weapons' ? undefined : 0"
                  :class="{
                    'has-full-details': item.statistics?.length,
                    'weapon-roster-card': section.id === 'weapons',
                  }"
                  @click="section.id !== 'weapons' && openEquipmentDetail(item)"
                  @keydown="
                    section.id !== 'weapons' &&
                    equipmentDetailKeydown($event, item)
                  "
                >
                  <details class="equipment-card-disclosure">
                    <summary
                      v-if="section.id === 'weapons'"
                      class="weapon-roster-row"
                    >
                      <span class="weapon-roster-name">
                        <strong>{{ item.name || 'Unnamed weapon' }}</strong>
                        <small>{{
                          item.subcategory || item.category || 'Weapon'
                        }}</small>
                      </span>
                      <span data-label="Damage">
                        {{
                          item.damage ||
                          catalogStatistic(
                            item,
                            'Mega-Damage',
                            'S.D.C. Damage',
                            'Damage',
                          ) ||
                          '—'
                        }}
                      </span>
                      <span data-label="Range">
                        {{
                          item.range ||
                          catalogStatistic(item, 'Effective Range', 'Range') ||
                          '—'
                        }}
                      </span>
                      <span
                        data-label="Ammunition"
                        class="weapon-roster-ammo"
                      >
                        {{ equipmentStatus(item).ammo
                        }}<template v-if="item.ammoMax">
                          / {{ item.ammoMax }}</template
                        >
                      </span>
                    </summary>
                    <summary
                      v-else
                      class="equipment-simple-summary"
                    >
                      <strong>{{
                        item.name || `Unnamed ${section.singular}`
                      }}</strong>
                      <span v-if="item.quantity"
                        >Quantity {{ item.quantity }}</span
                      >
                      <span v-else-if="item.category">{{ item.category }}</span>
                    </summary>
                    <CatalogEntryDetails
                      v-if="section.id === 'weapons' && item.statistics?.length"
                      :entry="item"
                      compact
                    />
                    <template v-else-if="item.statistics?.length">
                      <header>
                        <strong>{{ item.name }}</strong>
                        <span>View details</span>
                      </header>
                      <dl class="catalog-equipment-summary">
                        <template
                          v-for="[label, value] in [
                            [
                              'Damage',
                              catalogStatistic(
                                item,
                                'Mega-Damage',
                                'S.D.C. Damage',
                              ),
                            ],
                            ['Payload', catalogStatistic(item, 'Payload')],
                            [
                              'Range',
                              catalogStatistic(item, 'Effective Range'),
                            ],
                            [
                              'Rate of fire',
                              catalogStatistic(
                                item,
                                'Rate of Fire',
                                'Rate of Use',
                              ),
                            ],
                          ]"
                          :key="label"
                        >
                          <template v-if="value">
                            <dt>{{ label }}</dt>
                            <dd>{{ value }}</dd>
                          </template>
                        </template>
                      </dl>
                    </template>
                    <header v-else>
                      <strong>{{
                        item.name || `Unnamed ${section.singular}`
                      }}</strong
                      ><span v-if="item.category">{{ item.category }}</span>
                    </header>
                    <dl v-if="!item.statistics?.length">
                      <template
                        v-for="[key, label, type] in section.fields.filter(
                          (field) =>
                            !['name', 'category', 'notes'].includes(field[0]),
                        )"
                        :key="key"
                        ><template
                          v-if="
                            item[key] !== '' &&
                            item[key] != null &&
                            !(type === 'number' && Number(item[key]) === 0)
                          "
                          ><dt>{{ label }}</dt>
                          <dd>{{ item[key] }}</dd></template
                        ></template
                      >
                    </dl>
                    <div
                      v-if="section.id === 'weapons' && Number(item.ammoMax)"
                      class="equipment-tracker"
                      @click.stop
                    >
                      <label
                        v-tooltip="
                          equipmentMaximumTooltip(
                            'ammunition, payload, or charges',
                            item.ammoMax,
                          )
                        "
                        ><span>Ammo current / max</span
                        ><span class="tracker-line"
                          ><input
                            v-model.number="equipmentStatus(item).ammo"
                            type="number"
                            min="0"
                          /><strong>/ {{ item.ammoMax }}</strong></span
                        ></label
                      >
                    </div>
                    <div
                      v-if="
                        ['armor', 'vehicles'].includes(section.id) &&
                        (Number(item.maxSdc) || Number(item.maxMdc))
                      "
                      class="equipment-trackers"
                      @click.stop
                    >
                      <label
                        v-if="Number(item.maxSdc)"
                        v-tooltip="
                          equipmentMaximumTooltip(
                            `${section.singular.toLowerCase()} S.D.C`,
                            item.maxSdc,
                          )
                        "
                        ><span>S.D.C. current / max</span
                        ><span class="tracker-line"
                          ><input
                            v-model.number="equipmentStatus(item).sdc"
                            type="number"
                            min="0"
                          /><strong>/ {{ item.maxSdc }}</strong></span
                        ></label
                      >
                      <label
                        v-if="Number(item.maxMdc)"
                        v-tooltip="
                          equipmentMaximumTooltip(
                            `${section.singular.toLowerCase()} M.D.C`,
                            item.maxMdc,
                          )
                        "
                        ><span>M.D.C. current / max</span
                        ><span class="tracker-line"
                          ><input
                            v-model.number="equipmentStatus(item).mdc"
                            type="number"
                            min="0"
                          /><strong>/ {{ item.maxMdc }}</strong></span
                        ></label
                      >
                    </div>
                    <p v-if="item.notes">{{ item.notes }}</p>
                  </details>
                </article>
              </div>
            </div>
          </template>
          <p
            v-if="
              equipmentSections.every(
                (section) => !populatedEquipment(section.id).length,
              )
            "
            class="empty-equipment"
          >
            No equipment has been added in Create/Edit mode.
          </p>
        </section>
      </div>

      <div class="play-column play-column-right">
        <section class="panel spellbook play-spellbook">
          <header class="spellbook-heading">
            <div>
              <h2>Known spells</h2>
              <p>Open an invocation to review its complete rules.</p>
            </div>
          </header>
          <p
            v-if="!knownSpellGroups.length"
            class="empty-equipment"
          >
            No known spells.
          </p>
          <section
            v-for="group in knownSpellGroups"
            :key="group.level"
            class="spell-level-group"
          >
            <h3>Level {{ group.level }}</h3>
            <div
              class="spellbook-table-heading play"
              aria-hidden="true"
            >
              <span>Name</span><span>Cost</span><span>Level</span>
            </div>
            <button
              v-for="spell in group.entries"
              :key="spell.id"
              type="button"
              class="spellbook-summary play"
              @click="openSpellDetail(spell)"
            >
              <strong>{{ spell.name }}</strong>
              <span>{{ spell.cost }}</span>
              <span>{{ spell.level }}</span>
            </button>
          </section>
        </section>
        <section
          v-if="activeOcc?.abilities.length"
          class="panel"
        >
          <h2>Class abilities</h2>
          <ul class="ability-list">
            <li
              v-for="ability in activeOcc.abilities"
              :key="ability"
              v-tooltip="ability"
              tabindex="0"
            >
              {{ ability }}
            </li>
          </ul>
        </section>
        <section class="panel">
          <h2>Character record</h2>
          <div class="play-notes">
            <article
              v-for="(value, key) in state.notes"
              :key="key"
            >
              <h3>{{ key }}</h3>
              <p>{{ value || '—' }}</p>
            </article>
          </div>
        </section>
      </div>
    </section>

    <div
      v-if="tooltip.visible"
      class="global-tooltip"
      role="tooltip"
      :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }"
    >
      {{ tooltip.text }}
    </div>
    <CatalogPickerModal
      :open="equipmentCatalogOpen"
      :entries="activeEquipmentCatalog"
      :title="
        startingEquipmentChoiceTarget?.item.choice.prompt || 'Equipment Catalog'
      "
      @close="closeEquipmentCatalog"
      @confirm="addCatalogEquipment"
    />
    <SpellPickerModal
      :open="spellPickerOpen"
      :spells="invocations"
      :known-ids="state.spells"
      @close="spellPickerOpen = false"
      @add="addKnownSpell"
    />
    <Teleport to="body">
      <div
        v-if="spellDetail"
        class="spell-picker-backdrop"
        @mousedown.self="spellDetail = null"
        @keydown.esc="spellDetail = null"
      >
        <section
          ref="spellDetailDialog"
          class="spell-detail-modal"
          role="dialog"
          aria-modal="true"
          :aria-label="`${spellDetail.name} spell details`"
          tabindex="-1"
        >
          <header class="spell-modal-heading">
            <h2>Spell details</h2>
            <button
              type="button"
              @click="spellDetail = null"
            >
              Close
            </button>
          </header>
          <SpellDetails :spell="spellDetail" />
        </section>
      </div>
    </Teleport>
    <Teleport to="body">
      <div
        v-if="equipmentDetail"
        class="equipment-detail-backdrop"
        @mousedown.self="equipmentDetail = null"
        @keydown.esc="equipmentDetail = null"
      >
        <section
          ref="equipmentDetailDialog"
          class="equipment-detail-modal"
          role="dialog"
          aria-modal="true"
          :aria-label="`${equipmentDetail.name} details`"
          tabindex="-1"
        >
          <header class="equipment-detail-modal-heading">
            <h2>Equipment details</h2>
            <button
              type="button"
              @click="equipmentDetail = null"
            >
              Close
            </button>
          </header>
          <CatalogEntryDetails :entry="equipmentDetail" />
        </section>
      </div>
    </Teleport>
  </div>
</template>
