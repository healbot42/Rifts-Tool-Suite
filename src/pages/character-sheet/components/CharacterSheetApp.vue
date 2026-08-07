<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { skillCategories, skills, skillsById } from '../data/skills.js'
import { languages, languageRules } from '../data/languages.js'
import { skillEffects, skillSynergies } from '../data/skillEffects.js'
import { occs, occsById, secondaryEligible } from '../data/occs.js'
import { attributeBonus, hitPoints, movement, skillTotal, weightLimits } from '../lib/calculations.js'
import { skillDescription } from '../lib/skillDescriptions.js'
import { categoryChoiceAvailable, countsTowardSkillAllowance, skillChoiceAvailable } from '../lib/skillAvailability.js'
import '../character-sheet.css'

const STORAGE_KEY = 'rifts-character-sheet'
const blank = () => ({
  identity: { name:'', race:'', trueName:'', occupation:'', occ:'', alignment:'', age:'', sex:'', height:'', weight:'', origin:'', environment:'', sentiments:'', languages:'', insanity:'' },
  level: 1, experience: 0, attributes: { iq:10, me:10, ma:10, ps:10, pp:10, pe:10, pb:10, spd:10 },
  strengthType: 'normal', attacks: 4, hpFirstRoll: 0, hpLaterRolls: 0, hpBonus: 0, sdcBase: 0, sdcBonus: 0, skillBonusRolls: {},
  resources: { ppe:0, isp:0, chi:0 }, combat: { initiative:0, strike:0, parry:0, dodge:0, roll:0, damage:0, perception:0 },
  skills: {}, languages: { spoken: [], literacy: [] }, classChoices: {},
  equipment: { weapons: [], armor: [], vehicles: [], items: [] },
  play: { hp:null, sdc:null, isp:null, ppe:null, chi:null, mdc:null, armorMdc:null, equipment:{} },
  notes: { abilities:'', equipment:'', weapons:'', armor:'', magic:'', history:'', contacts:'', notes:'' },
})
const state = reactive(blank())
const mode = ref('edit')
const editTab = ref('identity')
const editTabs = [
  ['identity','Identity'],['class','O.C.C. / R.C.C.'],['attributes','Attributes & Health'],['derived','Derived & Combat'],['skills','Skills & Languages'],['equipment','Equipment'],['record','Character Record'],
]
const equipmentSections = [
  { id:'weapons', label:'Weapons', singular:'Weapon', description:'Weapons carried by the character, including combat statistics and ammunition.', fields:[['name','Name','text','Weapon name'],['category','Type','text','Weapon category or model'],['damage','Damage','text','Damage per attack, including dice and damage type'],['range','Range','text','Effective range'],['rateOfFire','Rate of fire','text','Rate of fire or attack restrictions'],['ammoMax','Ammunition','number','Maximum ammunition, payload, or charges'],['bonuses','Bonuses','text','Weapon-specific strike, parry, or damage bonuses'],['notes','Notes','textarea','Modes, restrictions, and special rules']] },
  { id:'armor', label:'Armor', singular:'Armor', description:'Body armor and protective equipment with maximum S.D.C. or M.D.C.', fields:[['name','Name','text','Armor name or model'],['category','Type','text','Armor type'],['armorRating','A.R.','number','Armor Rating, when applicable'],['maxSdc','Maximum S.D.C.','number','Maximum armor S.D.C.'],['maxMdc','Maximum M.D.C.','number','Maximum armor M.D.C.'],['penalties','Penalties','text','Mobility, prowl, perception, or other penalties'],['notes','Notes','textarea','Coverage and special protection']] },
  { id:'vehicles', label:'Vehicles', singular:'Vehicle', description:'Vehicles, robots, and mounts used by the character.', fields:[['name','Name','text','Vehicle name or model'],['category','Type','text','Vehicle class'],['maxSdc','Maximum S.D.C.','number','Maximum vehicle S.D.C.'],['maxMdc','Maximum M.D.C.','number','Maximum vehicle M.D.C.'],['speed','Speed','text','Maximum and cruising speed'],['crew','Crew / passengers','text','Crew and passenger capacity'],['cargo','Cargo','text','Cargo capacity'],['weapons','Weapons','textarea','Mounted weapons and combat systems'],['notes','Notes','textarea','Range, fuel, sensors, and special features']] },
  { id:'items', label:'Other items', singular:'Item', description:'General equipment, supplies, currency, and miscellaneous possessions.', fields:[['name','Name','text','Item name'],['quantity','Quantity','number','Number carried'],['weight','Weight','text','Weight per item or total weight'],['value','Value','text','Price or estimated value'],['notes','Notes','textarea','Description, uses, or special rules']] },
]
const tooltip = reactive({ visible: false, text: '', x: 0, y: 0 })
let hydrated = false

function openTooltip(event, text) {
  const rect = event.currentTarget.getBoundingClientRect()
  const pointer = event.type.startsWith('mouse') && event.clientX
  tooltip.text = text
  tooltip.x = Math.max(12, Math.min(pointer ? event.clientX + 14 : rect.left, window.innerWidth - 420))
  tooltip.y = Math.max(12, Math.min(pointer ? event.clientY + 18 : rect.bottom + 8, window.innerHeight - 220))
  tooltip.visible = true
}
function closeTooltip() { tooltip.visible = false }
function setOtherSdcTotal(event) {
  state.sdcBonus = (Number(event.target.value) || 0) - trainedEffects.value.sdc
}
const vTooltip = {
  mounted(el, binding) {
    el.__tooltipText = binding.value
    el.__tooltipOpen = event => openTooltip(event, el.__tooltipText)
    el.__tooltipMove = event => openTooltip(event, el.__tooltipText)
    el.__tooltipClose = closeTooltip
    el.addEventListener('mouseenter', el.__tooltipOpen); el.addEventListener('mousemove', el.__tooltipMove)
    el.addEventListener('mouseleave', el.__tooltipClose); el.addEventListener('focus', el.__tooltipOpen); el.addEventListener('blur', el.__tooltipClose)
  },
  updated(el, binding) { el.__tooltipText = binding.value },
  unmounted(el) {
    el.removeEventListener('mouseenter', el.__tooltipOpen); el.removeEventListener('mousemove', el.__tooltipMove)
    el.removeEventListener('mouseleave', el.__tooltipClose); el.removeEventListener('focus', el.__tooltipOpen); el.removeEventListener('blur', el.__tooltipClose)
  },
}

function skillRecord(id) {
  if (!state.skills[id]) state.skills[id] = { selected:false, trainingType:'', occBonus:0, otherBonus:0, learnedLevel:1, useIq:true }
  return state.skills[id]
}
skills.forEach(skill => skillRecord(skill.id))

const iqBonus = computed(() => attributeBonus('iq', state.attributes.iq))
const activeOcc = computed(() => occsById[state.identity.occ] || null)
const activeOccMdc = computed(() => activeOcc.value?.mdc || null)
const relatedTotal = computed(() => activeOcc.value?.relatedAtLevel(state.level) || 0)
const secondaryTotal = computed(() => activeOcc.value?.secondaryAtLevel(state.level) || 0)
const relatedUsed = computed(() => skills.filter(skill=>countsTowardSkillAllowance(skillRecord(skill.id),'related')).length)
const secondaryUsed = computed(() => skills.filter(skill=>countsTowardSkillAllowance(skillRecord(skill.id),'secondary')).length)
const relatedRemaining = computed(() => Math.max(0, relatedTotal.value-relatedUsed.value))
const secondaryRemaining = computed(() => Math.max(0, secondaryTotal.value-secondaryUsed.value))
const trainedPercentageSkills = computed(() => skills.filter(skill=>skillRecord(skill.id).selected&&skill.base!=null).sort((a,b)=>a.name.localeCompare(b.name)))
const trainedSpecialSkills = computed(() => skills.filter(skill=>skillRecord(skill.id).selected&&skill.base==null).sort((a,b)=>a.name.localeCompare(b.name)))
function classChoicesIncomplete() {
  if (!activeOcc.value) return false
  if (!state.classChoices.nativeLanguage || !state.classChoices.otherLanguage) return true
  return activeOcc.value.choices.some(choice => choice.count>1 ? state.classChoices[choice.id]?.some(value=>!value) : !state.classChoices[choice.id])
}
function classChoicesInvalid() {
  if (!activeOcc.value) return false
  return activeOcc.value.choices.some(choice => choice.count>1 && new Set((state.classChoices[choice.id] || []).filter(Boolean)).size !== (state.classChoices[choice.id] || []).filter(Boolean).length)
}
function choiceIsDuplicate(choice, index) {
  if (choice.count <= 1) return false
  const values = state.classChoices[choice.id] || []
  const value = values[index - 1]
  return Boolean(value) && values.some((other, otherIndex) => other === value && otherIndex !== index - 1)
}
function equipmentNamesIncomplete() { return equipmentSections.some(section => state.equipment[section.id].some(item => !String(item.name || '').trim())) }
function tabStatus(tab) {
  if (tab==='identity') return !state.identity.name || !state.identity.occ ? 'available' : ''
  if (tab==='class') return classChoicesInvalid() ? 'error' : classChoicesIncomplete() ? 'available' : ''
  if (tab==='skills') return relatedUsed.value>relatedTotal.value || secondaryUsed.value>secondaryTotal.value ? 'error' : relatedRemaining.value || secondaryRemaining.value ? 'available' : ''
  if (tab==='equipment') return equipmentNamesIncomplete() ? 'available' : ''
  return ''
}
function enterPlayMode() {
  mode.value='play'
  state.play.equipment ||= {}
  if (state.play.hp==null) state.play.hp=derived.value.hp
  if (state.play.sdc==null) state.play.sdc=derived.value.sdc
  if (state.play.isp==null) state.play.isp=state.resources.isp
  if (state.play.ppe==null) state.play.ppe=state.resources.ppe
  if (state.play.chi==null) state.play.chi=state.resources.chi
  if (state.play.mdc==null) state.play.mdc=activeOccMdc.value?.mainBody ?? 0
  if (state.play.armorMdc==null) state.play.armorMdc=activeOccMdc.value?.armor ?? 0
  for (const section of equipmentSections) for (const item of state.equipment[section.id]) equipmentStatus(item)
}
function equipmentId() { return globalThis.crypto?.randomUUID?.() || `equipment-${Date.now()}-${Math.random().toString(36).slice(2)}` }
function addEquipment(kind) {
  const section = equipmentSections.find(entry => entry.id === kind)
  const item = { id:equipmentId() }
  for (const [key,,type] of section.fields) item[key] = type === 'number' ? 0 : ''
  if (kind === 'items') item.quantity = 1
  state.equipment[kind].push(item)
}
function removeEquipment(kind, index) {
  const [item] = state.equipment[kind].splice(index, 1)
  if (item) delete state.play.equipment[item.id]
}
function equipmentStatus(item) {
  const status = state.play.equipment[item.id] ||= {}
  if (status.ammo == null) status.ammo = Number(item.ammoMax) || 0
  if (status.sdc == null) status.sdc = Number(item.maxSdc) || 0
  if (status.mdc == null) status.mdc = Number(item.maxMdc) || 0
  return status
}
function populatedEquipment(kind) { return state.equipment[kind].filter(item => item.name || Object.entries(item).some(([key,value]) => key !== 'id' && value)) }
const trainedEffects = computed(() => {
  const total = { attributes: { ps: 0, pp: 0, pe: 0, pb: 0, spd: 0 }, combat: { initiative: 0, strike: 0, parry: 0, dodge: 0, roll: 0 }, sdc: 0, attacks: 0, perception: 0, rolls: [], situational: [], breakdown: { attributes: {}, combat: {}, sdc: [], attacks: [], perception: [] } }
  for (const [id, effect] of Object.entries(skillEffects)) {
    if (!skillRecord(id).selected) continue
    const name = skillsById[id]?.name || id
    for (const [key, value] of Object.entries(effect.attributes || {})) { total.attributes[key] += value; (total.breakdown.attributes[key] ||= []).push(`${name}: +${value}`) }
    for (const [key, value] of Object.entries(effect.combat || {})) { total.combat[key] += value; (total.breakdown.combat[key] ||= []).push(`${name}: +${value}`) }
    if (effect.sdc) { total.sdc += effect.sdc; total.breakdown.sdc.push(`${name}: +${effect.sdc}`) }
    if (effect.attacks) { total.attacks += effect.attacks; total.breakdown.attacks.push(`${name}: +${effect.attacks}`) }
    if (effect.perception) { total.perception += effect.perception; total.breakdown.perception.push(`${name}: +${effect.perception}`) }
    if (effect.sdcDice) { const rolled = Number(state.skillBonusRolls[`${id}:sdc`]) || 0; total.sdc += rolled; total.rolls.push({ id, type: 'sdc', dice: effect.sdcDice }); total.breakdown.sdc.push(`${name} (${effect.sdcDice}): +${rolled}`) }
    if (effect.speedDice) { const rolled = Number(state.skillBonusRolls[`${id}:spd`]) || 0; total.attributes.spd += rolled; total.rolls.push({ id, type: 'spd', dice: effect.speedDice }); (total.breakdown.attributes.spd ||= []).push(`${name} (${effect.speedDice}): +${rolled}`) }
    for (const note of effect.situational || []) total.situational.push(`${skillsById[id]?.name || id}: ${note}`)
  }
  return total
})
const effectiveAttributes = computed(() => Object.fromEntries(Object.entries(state.attributes).map(([key, value]) => [key, (+value || 0) + (trainedEffects.value.attributes[key] || 0)])))
const derived = computed(() => {
  const classBonuses = activeOcc.value?.combatBonuses || {}
  const totalAttacks = (+state.attacks || 0) + trainedEffects.value.attacks + (classBonuses.attacks || 0)
  const move = movement(effectiveAttributes.value.spd, totalAttacks)
  const weight = weightLimits(effectiveAttributes.value.ps, state.strengthType)
  return {
    hp: hitPoints(effectiveAttributes.value.pe, state.level, state.hpFirstRoll, state.hpLaterRolls, state.hpBonus),
    sdc: (+state.sdcBase || 0) + (+state.sdcBonus || 0) + trainedEffects.value.sdc, move, weight, attacks: totalAttacks,
    damage: attributeBonus('ps', effectiveAttributes.value.ps),
    strike: attributeBonus('pp', effectiveAttributes.value.pp) + (+state.combat.strike || 0) + trainedEffects.value.combat.strike,
    parry: attributeBonus('pp', effectiveAttributes.value.pp) + (+state.combat.parry || 0) + trainedEffects.value.combat.parry,
    dodge: attributeBonus('pp', effectiveAttributes.value.pp) + (+state.combat.dodge || 0) + trainedEffects.value.combat.dodge,
    roll: (+state.combat.roll || 0) + trainedEffects.value.combat.roll + (classBonuses.roll || 0),
    initiative: attributeBonus('ppInitiative', effectiveAttributes.value.pp) + (+state.combat.initiative || 0) + trainedEffects.value.combat.initiative + (classBonuses.initiative || 0),
    perception: (+state.combat.perception || 0) + trainedEffects.value.perception + (classBonuses.perception || 0),
    psionics: attributeBonus('mePsionics', effectiveAttributes.value.me), insanity: attributeBonus('meInsanity', effectiveAttributes.value.me),
    trust: attributeBonus('ma', effectiveAttributes.value.ma), charm: attributeBonus('pb', effectiveAttributes.value.pb),
    coma: attributeBonus('peComa', effectiveAttributes.value.pe) + (activeOcc.value?.combatBonuses?.coma || 0), poison: attributeBonus('peSave', effectiveAttributes.value.pe), magic: attributeBonus('peSave', effectiveAttributes.value.pe) + (activeOcc.value?.id==='combat-cyborg' ? 3 : 0), possession: activeOcc.value?.id==='combat-cyborg' ? 5 : 0,
  }
})

function skillLevel(id) { return Math.max(1, state.level - Math.max(1, skillRecord(id).learnedLevel) + 1) }
function trainedSkillBonus(id) {
  return Object.entries(skillSynergies).reduce((total, [source, bonuses]) => total + (skillRecord(source).selected ? bonuses[id] || 0 : 0), 0)
    + Object.entries(skillEffects).reduce((total, [source, effect]) => total + (skillRecord(source).selected ? effect.skillBonuses?.[id] || 0 : 0), 0)
}
function relevantSituational(...terms) {
  const lower = terms.map(term => term.toLowerCase())
  return trainedEffects.value.situational.filter(note => lower.some(term => note.toLowerCase().includes(term))).map(note => `Situational - ${note}`)
}
function derivedTooltip(field) {
  const a = effectiveAttributes.value
  const effects = trainedEffects.value.breakdown
  const attributeLines = key => [`Base ${key.toUpperCase()}: ${+state.attributes[key] || 0}`, ...(effects.attributes[key] || []), `Effective ${key.toUpperCase()}: ${a[key]}`]
  const combatLines = key => [`Other ${key}: ${+state.combat[key] || 0}`, ...(effects.combat[key] || [])]
  const tooltips = {
    hp: [...attributeLines('pe'), `First-level roll: +${+state.hpFirstRoll || 0}`, `Later-level rolls: +${+state.hpLaterRolls || 0}`, `Other HP: ${+state.hpBonus || 0}`, `Total HP: ${derived.value.hp}`],
    sdc: [`Base S.D.C.: ${+state.sdcBase || 0}`, `Other S.D.C.: ${+state.sdcBonus || 0}`, ...effects.sdc, `Trained-skill S.D.C.: +${trainedEffects.value.sdc}`, `Total S.D.C.: ${derived.value.sdc}`],
    otherSdc: [`Manual bonus: ${+state.sdcBonus || 0}`, ...effects.sdc, `Other S.D.C. bonuses: ${(Number(state.sdcBonus) || 0) + trainedEffects.value.sdc}`],
    attacks: [`Base attacks: ${+state.attacks || 0}`, ...effects.attacks, `Total attacks: ${derived.value.attacks}`, ...relevantSituational('attack/action', 'one hand-to-hand attack')],
    weight: [...attributeLines('ps'), `Carry formula for ${state.strengthType} strength`, `Carry: ${derived.value.weight.carry} lb`, `Lift: ${derived.value.weight.lift} lb`, ...relevantSituational('carrying and lifting')],
    movement: [...attributeLines('spd'), `Speed x 5: ${derived.value.move.perMelee} ft/melee`, `Divided by ${derived.value.attacks} attacks: ${derived.value.move.perAttack} ft/attack`, `Approx. ${derived.value.move.mph} mph`, ...relevantSituational('forced march', 'half speed')],
    damage: [...attributeLines('ps'), `Attribute-chart damage bonus: +${derived.value.damage}`],
    trust: [`M.A.: ${a.ma}`, `Attribute-chart result: ${derived.value.trust ? derived.value.trust + '%' : 'none'}`],
    charm: [...attributeLines('pb'), `Attribute-chart result: ${derived.value.charm ? derived.value.charm + '%' : 'none'}`, ...relevantSituational('dressed to impress')],
    coma: [...attributeLines('pe'), `Attribute-chart bonus: +${derived.value.coma}%`],
    magic: [...attributeLines('pe'), `Attribute-chart magic bonus: +${attributeBonus('peSave', a.pe)}`, ...(activeOcc.value?.id==='combat-cyborg' ? ['Combat Cyborg O.C.C.: +3'] : []), `Total save vs magic: +${derived.value.magic}`],
    poison: [...attributeLines('pe'), `Total save vs poison: +${derived.value.poison}`],
    possession: [...(activeOcc.value?.id==='combat-cyborg' ? ['Combat Cyborg O.C.C.: +5'] : []), `Total save vs possession: +${derived.value.possession}`],
    psionicsInsanity: [`M.E.: ${a.me}`, `Save vs psionics: +${derived.value.psionics}`, `Save vs insanity: +${derived.value.insanity}`],
    initiative: [...combatLines('initiative'), `P.P. initiative bonus: +${attributeBonus('ppInitiative', a.pp)}`, `Total: +${derived.value.initiative}`],
    strike: [...combatLines('strike'), `P.P. strike bonus: +${attributeBonus('pp', a.pp)}`, `Total: +${derived.value.strike}`, ...relevantSituational('to strike')],
    parry: [...combatLines('parry'), `P.P. parry bonus: +${attributeBonus('pp', a.pp)}`, `Total: +${derived.value.parry}`, ...relevantSituational('to strike and parry')],
    dodge: [...combatLines('dodge'), `P.P. dodge bonus: +${attributeBonus('pp', a.pp)}`, `Total: +${derived.value.dodge}`, ...relevantSituational('to dodge')],
    roll: [...combatLines('roll'), `Total: +${derived.value.roll}`],
    perception: [`Other perception: ${+state.combat.perception || 0}`, ...effects.perception, `Total: +${derived.value.perception}`],
  }
  return (tooltips[field] || []).join('\n')
}
function totalFor(id) { const record = skillRecord(id); return skillTotal(skillsById[id], { ...record, otherBonus: (+record.otherBonus || 0) + trainedSkillBonus(id), currentLevel:skillLevel(id) }, iqBonus.value) }
function skillTotalTooltip(id) {
  const skill = skillsById[id]
  const record = skillRecord(id)
  const currentLevel = skillLevel(id)
  const learnedLevel = Math.max(1, Number(record.learnedLevel) || 1)
  const levelBonus = Math.max(0, currentLevel - learnedLevel) * (skill.perLevel || 0)
  const iq = record.useIq === false ? 0 : iqBonus.value
  const trainedBonuses = []
  for (const [source, bonuses] of Object.entries(skillSynergies)) {
    if (skillRecord(source).selected && bonuses[id]) trainedBonuses.push(`${skillsById[source]?.name || source}: +${bonuses[id]}%`)
  }
  for (const [source, effect] of Object.entries(skillEffects)) {
    const bonus = effect.skillBonuses?.[id] || 0
    if (skillRecord(source).selected && bonus) trainedBonuses.push(`${skillsById[source]?.name || source}: +${bonus}%`)
  }
  const rawTotal = skill.base + (Number(record.occBonus) || 0) + (Number(record.otherBonus) || 0)
    + trainedBonuses.reduce((sum, line) => sum + Number(line.match(/\+(\d+(?:\.\d+)?)%$/)?.[1] || 0), 0) + iq + levelBonus
  return [
    `${skill.name} calculation`,
    `Base proficiency: ${skill.base}%`,
    `O.C.C. bonus: +${Number(record.occBonus) || 0}%`,
    `Other bonus: +${Number(record.otherBonus) || 0}%`,
    ...trainedBonuses,
    `I.Q. bonus: +${iq}%${record.useIq === false ? ' (disabled)' : ''}`,
    `Level advancement: +${levelBonus}% (${skill.perLevel || 0}% per level; learned at ${learnedLevel}, currently ${currentLevel})`,
    ...(rawTotal > 98 ? [`Uncapped total: ${rawTotal}%`, 'Maximum proficiency: 98%'] : []),
    `Total: ${totalFor(id)}%`,
  ].join('\n')
}
const categoriesBySkill = Object.fromEntries(skills.map(skill => [skill.id, skillCategories.filter(([, ids]) => ids.includes(skill.id)).map(([name]) => name)]))
function descriptionFor(id) { return skillDescription(skillsById[id], categoriesBySkill[id]) }
function relatedInfo(id) { return activeOcc.value?.relatedSkillInfo?.(id) || { eligible:false, bonus:0, category:'' } }
function isOccSkill(id) { return ['occ','occ-choice'].includes(skillRecord(id).trainingType) }
function isSkillChoiceAvailable(id) {
  const record = skillRecord(id)
  return Boolean(activeOcc.value) && skillChoiceAvailable({
    selected: record.selected,
    occSkill: isOccSkill(id),
    relatedEligible: relatedInfo(id).eligible,
    relatedRemaining: relatedRemaining.value,
  })
}
function isCategoryChoiceAvailable(ids) { return categoryChoiceAvailable(ids, isSkillChoiceAvailable) }
function trainingOptions(id) {
  const options = [{ value:'', label:'Untrained' }]
  if (relatedInfo(id).eligible) options.push({ value:'related', label:`O.C.C. Related${relatedInfo(id).bonus ? ` (+${relatedInfo(id).bonus}%)` : ''}` })
  if (secondaryEligible(id)) options.push({ value:'secondary', label:'Secondary (+0%)' })
  return options
}
function setTraining(id, type) {
  const record = skillRecord(id)
  if (record.trainingType==='occ' || record.trainingType==='occ-choice') return
  if (type==='related' && record.trainingType!=='related' && relatedUsed.value>=relatedTotal.value) { record.selected=Boolean(record.trainingType); alert('No O.C.C. Related Skill selections remain at this level.'); return }
  if (type==='secondary' && record.trainingType!=='secondary' && secondaryUsed.value>=secondaryTotal.value) { record.selected=Boolean(record.trainingType); alert('No Secondary Skill selections remain at this level.'); return }
  record.trainingType = type; record.selected = Boolean(type)
  if (type==='related') record.occBonus = relatedInfo(id).bonus
  if (type==='secondary') record.occBonus = 0
  if (!type) record.occBonus = 0
}
function toggleSkill(id) {
  const record = skillRecord(id)
  if (record.trainingType==='occ' || record.trainingType==='occ-choice') { record.selected=true; return }
  if (!record.selected) { record.trainingType=''; record.occBonus=0; return }
  const preferred = relatedInfo(id).eligible && relatedRemaining.value>0 ? 'related' : 'secondary'
  record.selected = false
  setTraining(id, preferred)
}
function setOccSkill(id, bonus, type='occ') {
  const record=skillRecord(id); record.selected=true; record.trainingType=type; record.occBonus=bonus; record.learnedLevel=1
}
function syncOccLanguage(slot, type) {
  state.languages.spoken = state.languages.spoken.filter(record=>!(record.occId && record.occSlot===slot))
  if (!type) return
  const rules = activeOcc.value?.languages || { nativeBase:88, nativeBonus:0, otherBonus:0 }
  state.languages.spoken.push(slot==='native'
    ? { type, occBonus:rules.nativeBonus, otherBonus:0, learnedLevel:1, useIq:true, baseOverride:rules.nativeBase, perLevelOverride:1, occId:activeOcc.value.id, occSlot:slot }
    : { type, occBonus:rules.otherBonus, otherBonus:0, learnedLevel:1, useIq:true, occId:activeOcc.value.id, occSlot:slot })
}
function syncOccChoice(choice) {
  for (const skill of skills) if (skillRecord(skill.id).occChoice===choice.id) { Object.assign(skillRecord(skill.id), { selected:false,trainingType:'',occBonus:0,occChoice:'' }) }
  const values = Array.isArray(state.classChoices[choice.id]) ? state.classChoices[choice.id] : [state.classChoices[choice.id]]
  for (const id of values.filter(Boolean)) { setOccSkill(id,choice.bonus,'occ-choice'); skillRecord(id).occChoice=choice.id }
}
function applyOcc() {
  for (const skill of skills) if (['occ','occ-choice'].includes(skillRecord(skill.id).trainingType)) Object.assign(skillRecord(skill.id),{ selected:false,trainingType:'',occBonus:0,occChoice:'' })
  state.languages.spoken = state.languages.spoken.filter(record=>!record.occId)
  state.classChoices={}
  const occ=activeOcc.value; if (!occ) return
  state.play={ hp:null,sdc:null,isp:null,ppe:null,chi:null,mdc:null,armorMdc:null,equipment:{} }
  state.identity.occupation=occ.name
  if (occ.defaults.strengthType) state.strengthType=occ.defaults.strengthType
  for (const key of ['ps','pp','pe','spd']) if (occ.defaults[key] != null) state.attributes[key]=occ.defaults[key]
  if (occ.defaults.isp != null) state.resources.isp=occ.defaults.isp
  for (const [id,bonus] of occ.automaticSkills) setOccSkill(id,bonus)
  for (const choice of occ.choices) state.classChoices[choice.id]=choice.count>1 ? Array(choice.count).fill('') : ''
  state.classChoices.nativeLanguage='American'; state.classChoices.otherLanguage=''
  syncOccLanguage('native','American')
}
function addLanguage(kind) {
  state.languages[kind].push({ type: languages[0], occBonus: 0, otherBonus: 0, learnedLevel: 1, useIq: true })
}
function languageLevel(record) { return Math.max(1, state.level - Math.max(1, record.learnedLevel) + 1) }
function languageTotal(kind, record) {
  return skillTotal({ ...languageRules[kind], base:record.baseOverride ?? languageRules[kind].base, perLevel:record.perLevelOverride ?? languageRules[kind].perLevel }, { ...record, currentLevel: languageLevel(record) }, iqBonus.value)
}
function resetSheet() { if (confirm('Clear the saved character sheet?')) Object.assign(state, blank()) }
function downloadJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type:'application/json' })
  const link = Object.assign(document.createElement('a'), { href:URL.createObjectURL(blob), download:`${state.identity.name || 'rifts-character'}.json` })
  link.click(); URL.revokeObjectURL(link.href)
}
function importJson(event) {
  const file = event.target.files?.[0]; if (!file) return
  const reader = new FileReader()
  reader.onload = () => { try { Object.assign(state, blank(), JSON.parse(reader.result)) } catch { alert('That file is not a valid character export.') } }
  reader.readAsText(file); event.target.value = ''
}

onMounted(() => {
  try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) Object.assign(state, blank(), JSON.parse(saved)) } catch { /* ignore damaged local data */ }
  state.languages ||= { spoken: [], literacy: [] }
  state.languages.spoken ||= []; state.languages.literacy ||= []
  state.equipment ||= { weapons:[], armor:[], vehicles:[], items:[] }
  for (const section of equipmentSections) { state.equipment[section.id] ||= []; for (const item of state.equipment[section.id]) item.id ||= equipmentId() }
  state.classChoices ||= {}; state.play ||= { hp:null,sdc:null,isp:null,ppe:null,chi:null,mdc:null,armorMdc:null,equipment:{} }; state.play.equipment ||= {}; state.skillBonusRolls ||= {}; state.combat.perception ??= 0
  skills.forEach(skill=>{
    const record = skillRecord(skill.id)
    if (record.selected && (!record.trainingType || record.trainingType==='custom')) record.trainingType='secondary'
  })
  skills.forEach(skill => skillRecord(skill.id)); hydrated = true
})
watch(state, value => { if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(value)) }, { deep:true })
</script>

<template>
  <div class="character-sheet">
    <header class="sheet-hero panel">
      <div><p class="eyebrow">Rifts Tool Suite</p><h1>Character Sheet</h1><p>Auto-saved locally. Derived values follow the Rifts Ultimate Edition character-building rules.</p></div>
      <div class="sheet-actions"><button :class="{secondary:mode!=='edit'}" v-tooltip="'Open the tabbed character builder.'" @click="mode='edit'">Create / Edit</button><button :class="{secondary:mode!=='play'}" v-tooltip="'Open the play sheet with editable damage and resource trackers.'" @click="enterPlayMode">Play</button><button class="secondary" @click="downloadJson">Export</button><label class="import-button">Import<input type="file" accept="application/json" @change="importJson"></label><button class="danger" @click="resetSheet">Clear</button></div>
    </header>

    <div v-if="mode==='edit'" class="editor-shell"><nav class="editor-tabs panel" aria-label="Character creation sections"><button v-for="[id,label] in editTabs" :key="id" v-tooltip="tabStatus(id)==='error' ? 'This section contains an invalid or excessive selection.' : tabStatus(id)==='available' ? 'This section has available or incomplete selections.' : `${label} is complete.`" :class="['editor-tab',{active:editTab===id,available:tabStatus(id)==='available',error:tabStatus(id)==='error'}]" @click="editTab=id"><span>{{ label }}</span><small v-if="tabStatus(id)==='available'">Action available</small><small v-if="tabStatus(id)==='error'">Needs correction</small></button></nav><div class="editor-content">

    <section v-if="editTab==='identity'" class="panel"><h2>Identity</h2><div class="field-grid identity-grid">
      <label v-for="(value,key) in state.identity" :key="key" :class="{'required-field':['name','occ'].includes(key),'needs-choice':['name','occ'].includes(key)&&!String(state.identity[key] || '').trim()}"><span>{{ key.replace(/([A-Z])/g,' $1') }}</span><select v-if="key==='occ'" v-model="state.identity.occ" v-tooltip="'Select an Occupational or Racial Character Class. Its package populates automatic skills, bonuses, choices, and abilities.'" required @change="applyOcc"><option value="">No class selected</option><option v-for="occ in occs" :key="occ.id" :value="occ.id">{{ occ.name }}</option></select><input v-else v-model="state.identity[key]" :required="key==='name'"></label>
      <label><span>Experience level</span><input v-model.number="state.level" type="number" min="1" max="30"></label>
      <label><span>Experience points</span><input v-model.number="state.experience" type="number" min="0"></label>
    </div></section>

    <section v-if="editTab==='class'&&!activeOcc" class="panel empty-section"><h2>O.C.C. / R.C.C.</h2><p>Select a class from the O.C.C. field on the Identity tab to configure class abilities and required choices.</p><button @click="editTab='identity'">Go to Identity</button></section>
    <section v-if="editTab==='class'&&activeOcc" class="panel class-panel"><div class="class-heading"><div><p class="eyebrow">Selected class</p><h2 v-tooltip="activeOcc.description" tabindex="0">{{ activeOcc.name }}</h2><p>{{ activeOcc.description }}</p></div><div class="skill-counters"><output v-tooltip="'O.C.C. Related Skills chosen at the current level. New selections begin at first-level proficiency.'" tabindex="0"><span>O.C.C. Related</span><strong>{{ relatedUsed }} chosen / {{ relatedTotal }} total</strong></output><output v-tooltip="'Secondary Skills chosen at the current level. These receive no O.C.C. bonus, but may receive an I.Q. bonus.'" tabindex="0"><span>Secondary</span><strong>{{ secondaryUsed }} chosen / {{ secondaryTotal }} total</strong></output></div></div>
      <h3>Required O.C.C. choices</h3><div class="class-choice-grid">
        <label v-tooltip="`Native Language is automatic at ${activeOcc.languages.nativeBase + activeOcc.languages.nativeBonus}% before level advancement and applicable I.Q. bonus.`" :class="['required-field',{'needs-choice':!state.classChoices.nativeLanguage}]"><span>Native language</span><select v-model="state.classChoices.nativeLanguage" required @change="syncOccLanguage('native',state.classChoices.nativeLanguage)"><option v-for="language in languages" :key="language">{{ language }}</option></select></label>
        <label v-tooltip="`Choose one additional spoken language with a +${activeOcc.languages.otherBonus}% O.C.C. bonus.`" :class="['required-field',{'needs-choice':!state.classChoices.otherLanguage}]"><span>Other language (+{{ activeOcc.languages.otherBonus }}%)</span><select v-model="state.classChoices.otherLanguage" required @change="syncOccLanguage('other',state.classChoices.otherLanguage)"><option value="">Choose a language</option><option v-for="language in languages" :key="language">{{ language }}</option></select></label>
        <template v-for="choice in activeOcc.choices" :key="choice.id"><label v-for="index in choice.count" :key="`${choice.id}-${index}`" v-tooltip="choice.description" :class="['required-field',{'needs-choice':choice.count>1 ? !state.classChoices[choice.id]?.[index-1] : !state.classChoices[choice.id],'invalid-choice':choiceIsDuplicate(choice,index)}]"><span>{{ choice.label }}{{ choice.count>1 ? ` ${index}` : '' }}</span><select v-if="choice.count>1" v-model="state.classChoices[choice.id][index-1]" required @change="syncOccChoice(choice)"><option value="">Choose a skill</option><option v-for="id in choice.options" :key="id" :value="id">{{ skillsById[id].name }}</option></select><select v-else v-model="state.classChoices[choice.id]" required @change="syncOccChoice(choice)"><option value="">Choose a skill</option><option v-for="id in choice.options" :key="id" :value="id">{{ skillsById[id].name }}</option></select></label></template>
      </div>
      <h3>Other abilities</h3><div v-if="activeOccMdc" class="class-stats"><output v-tooltip="'Class-specific natural and armor M.D.C. maximums.'" tabindex="0"><span>Main body / armor / combined M.D.C.</span><strong>{{ activeOccMdc.mainBody }} / {{ activeOccMdc.armor }} / {{ activeOccMdc.total }}</strong></output></div><ul class="ability-list"><li v-for="ability in activeOcc.abilities" :key="ability" v-tooltip="ability" tabindex="0">{{ ability }}</li></ul>
    </section>

    <div v-if="editTab==='attributes'" class="sheet-columns">
      <section class="panel"><h2>Attributes</h2><div class="attribute-grid">
        <label v-for="(value,key) in state.attributes" :key="key"><span>{{ key.toUpperCase() }}</span><input v-model.number="state.attributes[key]" type="number" min="0"><small v-if="trainedEffects.attributes[key]">Trained skills +{{ trainedEffects.attributes[key] }} Â· total {{ effectiveAttributes[key] }}</small><small v-else-if="key==='iq'">Skill bonus +{{ iqBonus }}%</small></label>
      </div></section>
      <section class="panel"><h2>Health & resources</h2><div class="field-grid compact">
        <label><span>First-level HP d6</span><input v-model.number="state.hpFirstRoll" type="number" min="0" max="6"></label>
        <label><span>Later-level HP rolls</span><input v-model.number="state.hpLaterRolls" type="number" min="0"></label>
        <label><span>Other HP bonus</span><input v-model.number="state.hpBonus" type="number"></label>
        <output v-tooltip="derivedTooltip('hp')" class="derived-help" tabindex="0"><span>Hit Points</span><strong>{{ derived.hp }}</strong></output>
        <label><span>Base S.D.C.</span><input v-model.number="state.sdcBase" type="number" min="0"></label>
        <label class="derived-input-help"><span>Other S.D.C. bonuses</span><input v-tooltip="derivedTooltip('otherSdc')" :value="(+state.sdcBonus || 0) + trainedEffects.sdc" type="number" @input="setOtherSdcTotal"></label>
        <output v-tooltip="derivedTooltip('sdc')" class="derived-help" tabindex="0"><span>Physical S.D.C.</span><strong>{{ derived.sdc }}</strong></output>
        <label v-for="(_,key) in state.resources" :key="key"><span>{{ key.toUpperCase() }}</span><input v-model.number="state.resources[key]" type="number" min="0"></label>
      </div></section>
    </div>

    <section v-if="editTab==='derived'" class="panel"><h2>Derived values</h2><div class="derived-grid">
      <label><span>Strength type</span><select v-model="state.strengthType"><option value="normal">Normal / augmented</option><option value="robot">Robot</option><option value="supernatural">Supernatural</option></select></label>
      <label><span>Base attacks per melee</span><input v-model.number="state.attacks" type="number" min="1"></label>
      <output v-tooltip="derivedTooltip('attacks')" class="derived-help" tabindex="0"><span>Total attacks per melee</span><strong>{{ derived.attacks }}</strong></output>
      <output v-tooltip="derivedTooltip('weight')" class="derived-help" tabindex="0"><span>Carry / lift</span><strong>{{ derived.weight.carry }} / {{ derived.weight.lift }} lb</strong></output>
      <output v-tooltip="derivedTooltip('movement')" class="derived-help" tabindex="0"><span>Running</span><strong>{{ derived.move.mph }} mph</strong><small>{{ derived.move.perMelee }} ft/melee Â· {{ derived.move.perAttack }} ft/attack</small></output>
      <output v-tooltip="derivedTooltip('damage')" class="derived-help" tabindex="0"><span>P.S. damage bonus</span><strong>+{{ derived.damage }}</strong></output>
      <output v-tooltip="derivedTooltip('trust')" class="derived-help" tabindex="0"><span>Trust / intimidate</span><strong>{{ derived.trust ? derived.trust + '%' : 'â€”' }}</strong></output>
      <output v-tooltip="derivedTooltip('charm')" class="derived-help" tabindex="0"><span>Charm / impress</span><strong>{{ derived.charm ? derived.charm + '%' : 'â€”' }}</strong></output>
      <output v-tooltip="derivedTooltip('coma')" class="derived-help" tabindex="0"><span>Save vs coma / death</span><strong>+{{ derived.coma }}%</strong></output>
      <output v-tooltip="derivedTooltip('magic')" class="derived-help" tabindex="0"><span>Save vs magic</span><strong>+{{ derived.magic }}</strong></output>
      <output v-tooltip="derivedTooltip('poison')" class="derived-help" tabindex="0"><span>Save vs poison</span><strong>+{{ derived.poison }}</strong></output>
      <output v-tooltip="derivedTooltip('possession')" class="derived-help" tabindex="0"><span>Save vs possession</span><strong>+{{ derived.possession }}</strong></output>
      <output v-tooltip="derivedTooltip('psionicsInsanity')" class="derived-help" tabindex="0"><span>Save vs psionics / insanity</span><strong>+{{ derived.psionics }} / +{{ derived.insanity }}</strong></output>
    </div><h3>Combat bonuses</h3><div class="combat-grid"><label v-for="(_,key) in state.combat" :key="key"><span>Other {{ key }}</span><input v-model.number="state.combat[key]" type="number"></label><output v-tooltip="derivedTooltip('initiative')" class="derived-help" tabindex="0"><span>Total initiative</span><strong>+{{ derived.initiative }}</strong></output><output v-tooltip="derivedTooltip('strike')" class="derived-help" tabindex="0"><span>Total strike</span><strong>+{{ derived.strike }}</strong></output><output v-tooltip="derivedTooltip('parry')" class="derived-help" tabindex="0"><span>Total parry</span><strong>+{{ derived.parry }}</strong></output><output v-tooltip="derivedTooltip('dodge')" class="derived-help" tabindex="0"><span>Total dodge</span><strong>+{{ derived.dodge }}</strong></output><output v-tooltip="derivedTooltip('roll')" class="derived-help" tabindex="0"><span>Total roll with impact</span><strong>+{{ derived.roll }}</strong></output><output v-tooltip="derivedTooltip('perception')" class="derived-help" tabindex="0"><span>Total perception</span><strong>+{{ derived.perception }}</strong></output></div>
      <template v-if="trainedEffects.rolls.length"><h3>Rolled trained-skill bonuses</h3><p>Enter the result rolled when the skill was learned. These values are included in the derived attributes and S.D.C. above.</p><div class="skill-roll-grid"><label v-for="roll in trainedEffects.rolls" :key="`${roll.id}:${roll.type}`"><span>{{ skillsById[roll.id].name }} Â· {{ roll.dice }} {{ roll.type === 'sdc' ? 'S.D.C.' : 'Speed' }}</span><input v-model.number="state.skillBonusRolls[`${roll.id}:${roll.type}`]" type="number" min="0"></label></div></template>
      <template v-if="trainedEffects.situational.length"><h3>Situational trained-skill bonuses</h3><ul class="situational-list"><li v-for="note in trainedEffects.situational" :key="note">{{ note }}</li></ul></template>
    </section>

    <section v-if="editTab==='skills'" class="panel skills-panel"><div class="skills-heading"><div><h2>Skills</h2><p>Highlighted categories contain valid skills you can choose with an available O.C.C. Related slot. Any non-O.C.C. skill can be selected as Secondary. A repeated skill is one shared record: editing it in any category updates every occurrence.</p></div><div v-if="activeOcc" class="skill-counters"><output v-tooltip="'O.C.C. Related Skills chosen / total at this level.'" tabindex="0"><span>O.C.C. Related</span><strong>{{ relatedUsed }} / {{ relatedTotal }} chosen</strong></output><output v-tooltip="'Secondary Skills chosen / total at this level.'" tabindex="0"><span>Secondary</span><strong>{{ secondaryUsed }} / {{ secondaryTotal }} chosen</strong></output></div></div>
      <div class="language-groups">
        <section v-for="kind in ['spoken','literacy']" :key="kind" class="language-group">
          <header><div><h3>{{ languageRules[kind].label }}</h3><p>{{ languageRules[kind].description }}</p></div><button type="button" @click="addLanguage(kind)" :aria-label="`Add ${languageRules[kind].label}`">+ Add</button></header>
          <p v-if="!state.languages[kind].length" class="empty-language">No {{ kind }} languages added.</p>
          <div v-for="(record,index) in state.languages[kind]" :key="`${kind}-${index}`" class="language-row">
            <label><span>Type</span><select v-model="record.type"><option v-for="language in languages" :key="language">{{ language }}</option></select></label>
            <output><span>Total</span><strong>{{ languageTotal(kind,record) }}%</strong></output>
            <output><span>Base</span><strong>{{ record.baseOverride ?? languageRules[kind].base }}%</strong></output>
            <label><span>OCC bonus</span><input v-model.number="record.occBonus" type="number"></label>
            <label><span>Other</span><input v-model.number="record.otherBonus" type="number"></label>
            <label class="language-iq"><span>I.Q.</span><span class="check-line"><input v-model="record.useIq" type="checkbox">{{ record.useIq ? `+${iqBonus}%` : 'off' }}</span></label>
            <label><span>Learned lvl</span><input v-model.number="record.learnedLevel" type="number" min="1" :max="state.level"></label>
            <output><span>Skill lvl</span><strong>{{ languageLevel(record) }}</strong></output>
            <output><span>Level gain</span><strong>+{{ Math.max(0,languageLevel(record)-1)*(record.perLevelOverride ?? languageRules[kind].perLevel) }}%</strong></output>
            <button type="button" class="danger remove-language" @click="state.languages[kind].splice(index,1)" aria-label="Remove language">&times;</button>
          </div>
        </section>
      </div>
      <details v-for="([category,ids]) in skillCategories" :key="category" :class="{'has-available-skills':isCategoryChoiceAvailable(ids)}"><summary><span>{{ category }}</span><small>{{ ids.filter(id=>skillRecord(id).selected).length }} selected / {{ ids.length }}</small></summary>
        <div class="skill-table-wrap"><table><thead><tr><th>Use</th><th>Skill</th><th>Training</th><th>Total</th><th>Base</th><th>OCC bonus</th><th>Other</th><th>I.Q.</th><th>Learned lvl</th><th>Current lvl</th><th>Level gain</th></tr></thead><tbody>
          <tr v-for="id in ids" :key="id" :class="{selected:skillRecord(id).selected,'available-skill':isSkillChoiceAvailable(id)}"><td><input v-model="skillRecord(id).selected" type="checkbox" :disabled="['occ','occ-choice'].includes(skillRecord(id).trainingType)" :aria-label="`Select ${skillsById[id].name}`" @change="toggleSkill(id)"></td><th scope="row" class="skill-name-cell"><span v-tooltip="descriptionFor(id)" class="skill-help" tabindex="0">{{ skillsById[id].name }}</span><small v-if="skillsById[id].note">{{ skillsById[id].note }}</small><small v-if="activeOcc&&relatedInfo(id).eligible">Eligible as O.C.C. Related{{ relatedInfo(id).bonus ? ` at +${relatedInfo(id).bonus}%` : '' }}</small><small v-if="activeOcc&&!isOccSkill(id)">Eligible as Secondary at +0% O.C.C.</small></th><td><span v-if="skillRecord(id).trainingType==='occ'">Automatic O.C.C.</span><span v-else-if="skillRecord(id).trainingType==='occ-choice'">O.C.C. choice</span><select v-else :value="skillRecord(id).trainingType" v-tooltip="'Choose how this skill was learned. This controls slot counters and the class bonus.'" @change="setTraining(id,$event.target.value)"><option v-for="option in trainingOptions(id)" :key="option.value" :value="option.value">{{ option.label }}</option></select></td><td class="total">{{ totalFor(id) == null ? 'Special' : totalFor(id) + '%' }}</td><td>{{ skillsById[id].base == null ? 'â€”' : skillsById[id].base + '%' }}</td><td><input v-model.number="skillRecord(id).occBonus" type="number" :disabled="['occ','occ-choice','related','secondary'].includes(skillRecord(id).trainingType)" aria-label="OCC bonus"></td><td><input v-model.number="skillRecord(id).otherBonus" type="number" aria-label="Other bonus"><small v-if="trainedSkillBonus(id)">+{{ trainedSkillBonus(id) }}% trained skill</small></td><td><label class="iq-toggle"><input v-model="skillRecord(id).useIq" type="checkbox">{{ skillRecord(id).useIq ? `+${iqBonus}%` : 'off' }}</label></td><td><input v-model.number="skillRecord(id).learnedLevel" type="number" min="1" :max="state.level" aria-label="Learned level"></td><td>{{ skillLevel(id) }}</td><td>{{ skillsById[id].base == null ? 'â€”' : '+' + Math.max(0,skillLevel(id)-1)*skillsById[id].perLevel + '%' }}</td></tr>
        </tbody></table></div></details>
    </section>

    <section v-if="editTab==='equipment'" class="panel equipment-editor"><h2>Equipment</h2><p>Add the equipment the character owns. Combat-use values such as ammunition and current armor or vehicle durability are tracked separately in Play mode.</p>
      <section v-for="section in equipmentSections" :key="section.id" class="equipment-section">
        <header><div><h3>{{ section.label }}</h3><p>{{ section.description }}</p></div><button type="button" v-tooltip="`Add another ${section.singular.toLowerCase()} to this character.`" @click="addEquipment(section.id)">+ Add {{ section.singular }}</button></header>
        <p v-if="!state.equipment[section.id].length" class="empty-equipment">No {{ section.label.toLowerCase() }} added.</p>
        <article v-for="(item,index) in state.equipment[section.id]" :key="item.id" class="equipment-edit-card">
          <div class="equipment-fields">
            <label v-for="([key,label,type,help]) in section.fields" :key="key" v-tooltip="help" :class="{'wide-field':type==='textarea','required-field':key==='name','needs-choice':key==='name'&&!String(item.name || '').trim()}"><span>{{ label }}</span><textarea v-if="type==='textarea'" v-model="item[key]" rows="2"></textarea><input v-else v-model="item[key]" :type="type" :min="type==='number' ? 0 : undefined" :required="key==='name'"></label>
          </div>
          <button type="button" class="danger equipment-remove" v-tooltip="`Remove this ${section.singular.toLowerCase()} from the character.`" @click="removeEquipment(section.id,index)">Remove</button>
        </article>
      </section>
    </section>

    <section v-if="editTab==='record'" class="panel"><h2>Character record</h2><div class="notes-grid"><label v-for="(_,key) in state.notes" :key="key"><span>{{ key }}</span><textarea v-model="state.notes[key]" rows="5"></textarea></label></div></section>
    </div></div>

    <section v-else class="play-sheet">
      <section class="panel play-identity"><div><p class="eyebrow">Play mode</p><h2>{{ state.identity.name || 'Unnamed Character' }}</h2><p>{{ activeOcc?.name || state.identity.occupation || 'No class' }} · Level {{ state.level }} · {{ state.identity.race || 'Race not set' }} · {{ state.identity.alignment || 'Alignment not set' }}</p></div><button class="secondary" @click="mode='edit'">Edit character</button></section>
      <section class="panel"><h2>Live status</h2><div class="play-trackers"><label v-tooltip="`Current Hit Points. Maximum: ${derived.hp}`"><span>HP current / max</span><span class="tracker-line"><input v-model.number="state.play.hp" type="number"><strong>/ {{ derived.hp }}</strong></span></label><label v-tooltip="`Current Physical S.D.C. Maximum: ${derived.sdc}`"><span>S.D.C. current / max</span><span class="tracker-line"><input v-model.number="state.play.sdc" type="number"><strong>/ {{ derived.sdc }}</strong></span></label><label v-if="activeOccMdc" v-tooltip="'Current class-specific main-body M.D.C.'"><span>Main-body M.D.C.</span><span class="tracker-line"><input v-model.number="state.play.mdc" type="number"><strong>/ {{ activeOccMdc.mainBody }}</strong></span></label><label v-if="activeOccMdc" v-tooltip="'Current class-specific external armor M.D.C.'"><span>Armor M.D.C.</span><span class="tracker-line"><input v-model.number="state.play.armorMdc" type="number"><strong>/ {{ activeOccMdc.armor }}</strong></span></label><label v-for="key in ['isp','ppe','chi']" :key="key" v-tooltip="`Current ${key.toUpperCase()}. Maximum: ${state.resources[key]}`"><span>{{ key.toUpperCase() }} current / max</span><span class="tracker-line"><input v-model.number="state.play[key]" type="number"><strong>/ {{ state.resources[key] }}</strong></span></label></div></section>
      <div class="play-columns"><section class="panel"><h2>Attributes</h2><div class="play-stat-grid"><output v-for="(value,key) in effectiveAttributes" :key="key"><span>{{ key.toUpperCase() }}</span><strong>{{ value }}</strong></output></div></section><section class="panel"><h2>Combat</h2><div class="play-stat-grid"><output><span>Attacks</span><strong>{{ derived.attacks }}</strong></output><output><span>Initiative</span><strong>+{{ derived.initiative }}</strong></output><output><span>Strike</span><strong>+{{ derived.strike }}</strong></output><output><span>Parry</span><strong>+{{ derived.parry }}</strong></output><output><span>Dodge</span><strong>+{{ derived.dodge }}</strong></output><output><span>Roll</span><strong>+{{ derived.roll }}</strong></output><output><span>Perception</span><strong>+{{ derived.perception }}</strong></output><output><span>P.S. damage</span><strong>+{{ derived.damage }}</strong></output></div></section></div>
      <section class="panel"><h2>Movement & saves</h2><div class="play-stat-grid"><output><span>Running</span><strong>{{ derived.move.mph }} mph</strong><small>{{ derived.move.perMelee }} ft/melee</small></output><output><span>Carry / lift</span><strong>{{ derived.weight.carry }} / {{ derived.weight.lift }} lb</strong></output><output><span>Magic</span><strong>+{{ derived.magic }}</strong></output><output><span>Poison</span><strong>+{{ derived.poison }}</strong></output><output><span>Possession</span><strong>+{{ derived.possession }}</strong></output><output><span>Psionics</span><strong>+{{ derived.psionics }}</strong></output><output><span>Insanity</span><strong>+{{ derived.insanity }}</strong></output><output><span>Coma / death</span><strong>+{{ derived.coma }}%</strong></output></div></section>
      <section class="panel play-equipment"><h2>Equipment</h2>
        <template v-for="section in equipmentSections" :key="section.id">
          <div v-if="populatedEquipment(section.id).length" class="play-equipment-section"><h3>{{ section.label }}</h3><div class="play-equipment-grid">
            <article v-for="item in populatedEquipment(section.id)" :key="item.id" v-tooltip="item.notes || `${section.singular} carried by ${state.identity.name || 'this character'}.`" tabindex="0">
              <header><strong>{{ item.name || `Unnamed ${section.singular}` }}</strong><span v-if="item.category">{{ item.category }}</span></header>
              <dl><template v-for="([key,label,type]) in section.fields.filter(field=>!['name','category','notes'].includes(field[0]))" :key="key"><template v-if="item[key] !== '' && item[key] != null && !(type==='number' && Number(item[key])===0)"><dt>{{ label }}</dt><dd>{{ item[key] }}</dd></template></template></dl>
              <div v-if="section.id==='weapons' && Number(item.ammoMax)" class="equipment-tracker" @click.stop><label v-tooltip="`Current ammunition, payload, or charges. Maximum: ${item.ammoMax}.`"><span>Ammo current / max</span><span class="tracker-line"><input v-model.number="equipmentStatus(item).ammo" type="number" min="0"><strong>/ {{ item.ammoMax }}</strong></span></label></div>
              <div v-if="['armor','vehicles'].includes(section.id) && (Number(item.maxSdc) || Number(item.maxMdc))" class="equipment-trackers" @click.stop>
                <label v-if="Number(item.maxSdc)" v-tooltip="`Current ${section.singular.toLowerCase()} S.D.C. Maximum: ${item.maxSdc}.`"><span>S.D.C. current / max</span><span class="tracker-line"><input v-model.number="equipmentStatus(item).sdc" type="number" min="0"><strong>/ {{ item.maxSdc }}</strong></span></label>
                <label v-if="Number(item.maxMdc)" v-tooltip="`Current ${section.singular.toLowerCase()} M.D.C. Maximum: ${item.maxMdc}.`"><span>M.D.C. current / max</span><span class="tracker-line"><input v-model.number="equipmentStatus(item).mdc" type="number" min="0"><strong>/ {{ item.maxMdc }}</strong></span></label>
              </div>
              <p v-if="item.notes">{{ item.notes }}</p>
            </article>
          </div></div>
        </template>
        <p v-if="equipmentSections.every(section=>!populatedEquipment(section.id).length)" class="empty-equipment">No equipment has been added in Create/Edit mode.</p>
      </section>
      <section class="panel"><h2>Languages</h2><div class="play-skill-grid"><div v-for="record in state.languages.spoken" :key="'spoken-'+record.type" tabindex="0"><span>Spoken: {{ record.type }}</span><strong>{{ languageTotal('spoken',record) }}%</strong></div><div v-for="record in state.languages.literacy" :key="'literacy-'+record.type" tabindex="0"><span>Literacy: {{ record.type }}</span><strong>{{ languageTotal('literacy',record) }}%</strong></div></div></section>
      <section class="panel play-skills">
        <h2>Trained skills</h2>
        <template v-if="trainedPercentageSkills.length">
          <h3>Percentage skills</h3>
          <div class="play-percentage-skills">
            <div v-for="skill in trainedPercentageSkills" :key="skill.id">
              <span v-tooltip="descriptionFor(skill.id)" tabindex="0">{{ skill.name }}</span>
              <strong v-tooltip="skillTotalTooltip(skill.id)" tabindex="0">{{ totalFor(skill.id) }}%</strong>
            </div>
          </div>
        </template>
        <template v-if="trainedSpecialSkills.length">
          <h3>Special skills</h3>
          <div class="play-special-skills">
            <div v-for="skill in trainedSpecialSkills" :key="skill.id">
              <span v-tooltip="descriptionFor(skill.id)" tabindex="0">{{ skill.name }}</span>
              <strong>Special</strong>
            </div>
          </div>
        </template>
        <p v-if="!trainedPercentageSkills.length && !trainedSpecialSkills.length">No trained skills.</p>
      </section>
      <section v-if="activeOcc" class="panel"><h2>Class abilities</h2><ul class="ability-list"><li v-for="ability in activeOcc.abilities" :key="ability" v-tooltip="ability" tabindex="0">{{ ability }}</li></ul></section>
      <section class="panel"><h2>Character record</h2><div class="play-notes"><article v-for="(value,key) in state.notes" :key="key"><h3>{{ key }}</h3><p>{{ value || '—' }}</p></article></div></section>
    </section>

    <div v-if="tooltip.visible" class="global-tooltip" role="tooltip" :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }">{{ tooltip.text }}</div>
  </div>
</template>
