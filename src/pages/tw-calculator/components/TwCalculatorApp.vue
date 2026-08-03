<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { RIFTS_GEMS, RIFTS_ULTIMATE_SPELLS } from '../data/spells.js'
import { downloadDevicePdf } from '../lib/pdfReport.js'
import {
  CONSTRUCTION_BONUS_BY_ID,
  CONSTRUCTION_MODIFIER_BY_ID,
  RIFTS_CONSTRUCTION_BONUSES,
  RIFTS_CONSTRUCTION_MODIFIERS,
} from '../data/constructionModifiers.js'
import {
  buildFinalSummary,
  calculateChainActivation,
  calculateChainBasePpe,
  calculateConstructionCredits,
  calculateConstructionHours,
  calculateModePpe,
  calculateNetSkillRollModifier,
  calculateRequiredGemCost,
  calculateSelectionPercent,
  clampNumber,
} from '../lib/calculations.js'
import { createSpellSearchIndex, findMatchingSpells } from '../lib/spellSearch.js'
import { createRuntimeId } from '../lib/runtimeId.js'

const makeSpell = (primary = false) => ({
  id: createRuntimeId(),
  name: '',
  ppe: 0,
  ppeText: '',
  ppeModeId: '',
  ppeModeInput: null,
  searchOpen: false,
  primary,
})

const makeChain = (index = 1) => ({
  id: createRuntimeId(),
  name: `Function ${index}`,
  primaryGemCarats: 1,
  gemCost: 0,
  mode: 'standard',
  spells: [makeSpell(true)],
})

const state = reactive({
  deviceName: 'New Techno-Wizard Device',
  form: '',
  deviceLevel: 1,
  formCost: 0,
  singleUse: false,
  existingTechnology: false,
  creatorHasMechanicalSkill: false,
  storagePpe: 0,
  storagePercentPerPoint: 1,
  assistantTimeReduction: 0,
  constructionModifierPercent: 0,
  constructionModifiers: [],
  constructionBonuses: [],
  notes: '',
  chains: [makeChain(1)],
})

const saved = localStorage.getItem('rifts-tw-device')
if (saved) {
  try { Object.assign(state, JSON.parse(saved)) } catch { /* ignore malformed saves */ }
}
let saveHandle
let saveUsesIdleCallback = false
let suppressSave = false
function persistState() {
  if (!suppressSave) localStorage.setItem('rifts-tw-device', JSON.stringify(state, (key, value) => key === 'searchOpen' ? undefined : value))
  saveHandle = undefined
}
function cancelScheduledSave() {
  if (saveHandle === undefined) return
  if (saveUsesIdleCallback) window.cancelIdleCallback(saveHandle)
  else window.clearTimeout(saveHandle)
  saveHandle = undefined
}
function scheduleSave() {
  cancelScheduledSave()
  if ('requestIdleCallback' in window) {
    saveUsesIdleCallback = true
    saveHandle = window.requestIdleCallback(persistState, { timeout: 1500 })
  } else {
    saveUsesIdleCallback = false
    saveHandle = window.setTimeout(persistState, 500)
  }
}
watch(state, scheduleSave, { deep: true, flush: 'post' })
window.addEventListener('pagehide', persistState)


const normalized = value => String(value || '').toLowerCase()
const searchableSpells = createSpellSearchIndex(RIFTS_ULTIMATE_SPELLS)
const spellByName = new Map(searchableSpells.map(({ spell, searchName }) => [searchName, spell]))
const spellSearchCache = new Map()
function matchingSpells(spell) {
  const query = normalized(spell.name).trim()
  const cached = spellSearchCache.get(query)
  if (cached) return cached
  const matches = findMatchingSpells(searchableSpells, query)
  if (spellSearchCache.size >= 100) spellSearchCache.clear()
  spellSearchCache.set(query, matches)
  return matches
}
function selectSpell(spell, selected) {
  spell.name = selected.name
  spell.ppe = selected.ppe
  spell.ppeText = selected.ppeText || String(selected.ppe)
  const defaultMode = selected.ppeModes?.[0]
  spell.ppeModeId = defaultMode?.id || ''
  spell.ppeModeInput = defaultMode?.inputDefault ?? null
  if (defaultMode) applySpellMode(spell)
  spell.searchOpen = false
}
function selectedSpell(spell) {
  return spellByName.get(normalized(spell.name))
}
function gemForSpell(spell) {
  return RIFTS_GEMS[selectedSpell(spell)?.gemId]
}
function handleSpellInput(spell) {
  spell.searchOpen = true
  const exact = selectedSpell(spell)
  if (exact) selectSpell(spell, exact)
}
function closeSpellSearch(spell) {
  window.setTimeout(() => { spell.searchOpen = false }, 140)
}

const creditFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const credits = value => creditFormatter.format(value)

function activePpeMode(spell) {
  const modes = selectedSpell(spell)?.ppeModes
  if (!modes?.length) return null
  return modes.find(mode => mode.id === spell.ppeModeId) || modes[0]
}
function modeCostLabel(mode) {
  if (mode.calculation === 'perUnit') return `${mode.ppePerUnit} per ${mode.unit}`
  if (mode.calculation) return `${mode.ppe}+`
  return String(mode.ppe)
}
function applySpellMode(spell) {
  const mode = activePpeMode(spell)
  if (mode) spell.ppe = calculateModePpe(mode, spell.ppeModeInput)
}
function setSpellMode(spell, modeId) {
  spell.ppeModeId = modeId
  const mode = activePpeMode(spell)
  spell.ppeModeInput = mode?.inputDefault ?? null
  applySpellMode(spell)
}
function setSpellModeInput(spell, value) {
  spell.ppeModeInput = Number(value)
  applySpellMode(spell)
}

// Migrate previously saved selections to the new structured cost modes.
for (const chain of state.chains) {
  for (const spell of chain.spells) {
    const mode = activePpeMode(spell)
    if (!mode) continue
    spell.ppeModeId = mode.id
    spell.ppeModeInput ??= mode.inputDefault ?? null
    applySpellMode(spell)
  }
}

// Older saved devices may contain multiple time adjustments from before the
// book's mutual-exclusion rule was enforced. Keep the first selected one.
const savedTimeAdjustment = [
  ...(state.constructionModifiers || []).map(selection => CONSTRUCTION_MODIFIER_BY_ID.get(selection.id)),
  ...(state.constructionBonuses || []).map(selection => CONSTRUCTION_BONUS_BY_ID.get(selection.id)),
].find(entry => entry?.timeExclusive)
if (savedTimeAdjustment) removeOtherTimeAdjustments(savedTimeAdjustment.id)

function requiredGemCost(chain, primaryGemCarats = chain.primaryGemCarats) {
  return calculateRequiredGemCost(chain, gemForSpell, primaryGemCarats)
}

function chainBasePpe(chain, primaryGemCarats = chain.primaryGemCarats) {
  return calculateChainBasePpe(state, chain, primaryGemCarats)
}

const chainResults = computed(() => state.chains.map(chain => {
  const ppeConstruction = chainBasePpe(chain)
  const activation = calculateChainActivation(state, chain, ppeConstruction)
  const gemCost = requiredGemCost(chain) * (state.singleUse ? 0.25 : 1)
  return { chain, ppeConstruction, activation, gemCost }
}))

const basePpeConstruction = computed(() => chainResults.value.reduce((sum, row) => sum + row.ppeConstruction, 0))
const storageModifier = computed(() => basePpeConstruction.value * clampNumber(state.storagePpe) * clampNumber(state.storagePercentPerPoint) / 100)
const selectedConstructionModifierPercent = computed(() => calculateSelectionPercent(state.constructionModifiers, CONSTRUCTION_MODIFIER_BY_ID))
const selectedConstructionBonusPercent = computed(() => calculateSelectionPercent(state.constructionBonuses, CONSTRUCTION_BONUS_BY_ID))
const totalSkillRollModifier = computed(() => calculateNetSkillRollModifier(
  selectedConstructionModifierPercent.value,
  selectedConstructionBonusPercent.value,
  state.constructionModifierPercent,
))
const modifiedPpeConstruction = computed(() => basePpeConstruction.value + storageModifier.value)
const gemTotal = computed(() => chainResults.value.reduce((sum, row) => sum + row.gemCost, 0))
const constructionCreditTotals = computed(() => calculateConstructionCredits(modifiedPpeConstruction.value, state.deviceLevel, state.formCost, gemTotal.value))
const constructionCreditsBeforeGems = computed(() => constructionCreditTotals.value.beforeGems)
const constructionCredits = computed(() => constructionCreditTotals.value.total)

const chart = computed(() => {
  const width = 900
  const height = 320
  const margin = { top: 20, right: 100, bottom: 56, left: 100 }
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom
  const carats = Array.from({ length: 13 }, (_, index) => index * 0.5)

  const metricsAt = carat => {
    const projectedChains = state.chains.map((chain, index) => {
      const ppeConstruction = chainBasePpe(chain, index === 0 ? carat : chain.primaryGemCarats)
      const activation = calculateChainActivation(state, chain, ppeConstruction)
      return { ppeConstruction, activation }
    })
    const basePpe = projectedChains.reduce((sum, row) => sum + row.ppeConstruction, 0)
    const storage = basePpe * clampNumber(state.storagePpe) * clampNumber(state.storagePercentPerPoint) / 100
    const modifiedPpe = basePpe + storage
    const projectedGemTotal = state.chains.reduce((sum, chain, index) =>
      sum + requiredGemCost(chain, index === 0 ? carat : chain.primaryGemCarats), 0) * (state.singleUse ? 0.25 : 1)
    return {
      price: Math.ceil(modifiedPpe * 10 * clampNumber(state.deviceLevel, 1) + projectedGemTotal + clampNumber(state.formCost)),
      activation: Math.ceil(projectedChains.reduce((sum, row) => sum + row.activation, 0)),
    }
  }

  // Zero remains an axis tick, but no price is plotted because a primary gem
  // cannot have zero carats and the construction formula would divide by zero.
  const points = carats.filter(carat => carat > 0).map(carat => ({ carat, ...metricsAt(carat) }))
  const prices = points.map(point => point.price)
  const activations = points.map(point => point.activation)
  const scaleFor = values => {
    const rawMin = Math.min(...values)
    const rawMax = Math.max(...values)
    const spread = Math.max(1, rawMax - rawMin)
    const roughStep = spread * 1.2 / 5
    const magnitude = 10 ** Math.floor(Math.log10(roughStep))
    const normalizedStep = roughStep / magnitude
    const step = Math.max(1, (normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10) * magnitude)
    const min = Math.max(0, Math.floor((rawMin - spread * 0.1) / step) * step)
    const max = Math.max(min + step, Math.ceil((rawMax + spread * 0.1) / step) * step)
    const ticks = Array.from({ length: Math.round((max - min) / step) + 1 }, (_, index) => min + index * step)
    const position = value => margin.top + (max - value) / (max - min) * plotHeight
    return { ticks, position }
  }
  const priceScale = scaleFor(prices)
  const activationScale = scaleFor(activations)
  const x = carat => margin.left + carat / 6 * plotWidth

  return {
    width,
    height,
    margin,
    plotWidth,
    plotHeight,
    points: points.map(point => ({
      ...point,
      x: x(point.carat),
      priceY: priceScale.position(point.price),
      activationY: activationScale.position(point.activation),
    })),
    yTicks: priceScale.ticks.map(value => ({ value, y: priceScale.position(value) })),
    activationTicks: activationScale.ticks.map(value => ({ value, y: activationScale.position(value) })),
    xTicks: carats.map(value => ({ value, x: x(value) })),
  }
})
const chartTooltip = ref(null)
function showChartTooltip(event, series) {
  const svg = event.currentTarget.ownerSVGElement
  const bounds = svg.getBoundingClientRect()
  const pointerX = (event.clientX - bounds.left) * chart.value.width / bounds.width
  const point = chart.value.points.reduce((closest, candidate) =>
    Math.abs(candidate.x - pointerX) < Math.abs(closest.x - pointerX) ? candidate : closest,
  )
  const pointY = series === 'price' ? point.priceY : point.activationY
  const tooltipWidth = 190
  const tooltipHeight = 54
  const x = point.x + tooltipWidth + 18 > chart.value.width ? point.x - tooltipWidth - 12 : point.x + 12
  const y = pointY - tooltipHeight - 12 < 0 ? pointY + 12 : pointY - tooltipHeight - 12
  chartTooltip.value = { series, point, x, y, width: tooltipWidth, height: tooltipHeight }
}
function hideChartTooltip() {
  chartTooltip.value = null
}
const selectedConstructionModifierMap = computed(() => new Map((state.constructionModifiers || []).map(selection => [selection.id, selection])))
const selectedConstructionBonusMap = computed(() => new Map((state.constructionBonuses || []).map(selection => [selection.id, selection])))
function selectedConstructionModifier(id) {
  return selectedConstructionModifierMap.value.get(id)
}
function removeOtherTimeAdjustments(selectedId) {
  state.constructionModifiers = (state.constructionModifiers || []).filter(selection => {
    const entry = CONSTRUCTION_MODIFIER_BY_ID.get(selection.id)
    return selection.id === selectedId || !entry?.timeExclusive
  })
  state.constructionBonuses = (state.constructionBonuses || []).filter(selection => {
    const entry = CONSTRUCTION_BONUS_BY_ID.get(selection.id)
    return selection.id === selectedId || !entry?.timeExclusive
  })
}
function toggleConstructionModifier(modifier, checked) {
  state.constructionModifiers ||= []
  if (checked) {
    if (modifier.timeExclusive) removeOtherTimeAdjustments(modifier.id)
    if (!selectedConstructionModifier(modifier.id)) state.constructionModifiers.push({ id: modifier.id, quantity: 1 })
  } else {
    state.constructionModifiers = state.constructionModifiers.filter(selection => selection.id !== modifier.id)
  }
}
function setConstructionModifierQuantity(id, value) {
  const selection = selectedConstructionModifier(id)
  if (selection) selection.quantity = Math.max(1, Math.floor(Number(value) || 1))
}
function selectedConstructionBonus(id) {
  return selectedConstructionBonusMap.value.get(id)
}
function toggleConstructionBonus(bonus, checked) {
  state.constructionBonuses ||= []
  if (checked) {
    if (bonus.timeExclusive) removeOtherTimeAdjustments(bonus.id)
    if (!selectedConstructionBonus(bonus.id)) state.constructionBonuses.push({ id: bonus.id, quantity: 1 })
  } else {
    state.constructionBonuses = state.constructionBonuses.filter(selection => selection.id !== bonus.id)
  }
}
function setConstructionBonusQuantity(id, value) {
  const selection = selectedConstructionBonus(id)
  if (selection) selection.quantity = Math.max(1, Math.floor(Number(value) || 1))
}
const activeTimeAdjustment = computed(() => {
  for (const selection of state.constructionModifiers || []) {
    const entry = CONSTRUCTION_MODIFIER_BY_ID.get(selection.id)
    if (entry?.timeExclusive) return entry
  }
  for (const selection of state.constructionBonuses || []) {
    const entry = CONSTRUCTION_BONUS_BY_ID.get(selection.id)
    if (entry?.timeExclusive) return entry
  }
  return null
})
const constructionTimeMultiplier = computed(() => activeTimeAdjustment.value?.timeMultiplier ?? 1)
const constructionHours = computed(() => calculateConstructionHours(state, modifiedPpeConstruction.value, constructionTimeMultiplier.value))
const totalActivation = computed(() => chainResults.value.reduce((sum, row) => sum + row.activation, 0))
const hasLeyLineOnlyFunctions = computed(() => state.chains.some(chain => chain.mode === 'ley-only'))
const allFunctionsRequireLeyLine = computed(() => !state.singleUse && state.chains.length > 0 && state.chains.every(chain => chain.mode === 'ley-only'))
const pdfExporting = ref(false)
const pdfExportError = ref('')
const priceChartSection = ref(null)
const chartVisible = ref(false)
let chartObserver

onMounted(() => {
  if ('IntersectionObserver' in window) {
    chartObserver = new IntersectionObserver(entries => {
      chartVisible.value = entries.some(entry => entry.isIntersecting)
      if (!chartVisible.value) chartTooltip.value = null
    }, { rootMargin: '300px 0px' })
    chartObserver.observe(priceChartSection.value)
  } else {
    chartVisible.value = true
  }
})

onBeforeUnmount(() => {
  persistState()
  cancelScheduledSave()
  chartObserver?.disconnect()
  window.removeEventListener('pagehide', persistState)
})

function addChain() { state.chains.push(makeChain(state.chains.length + 1)) }
function removeChain(id) { if (state.chains.length > 1) state.chains = state.chains.filter(chain => chain.id !== id) }
function addSpell(chain) { chain.spells.push(makeSpell(false)) }
function removeSpell(chain, id) { if (chain.spells.length > 1) chain.spells = chain.spells.filter(spell => spell.id !== id) }
function reset() {
  suppressSave = true
  cancelScheduledSave()
  window.removeEventListener('pagehide', persistState)
  localStorage.removeItem('rifts-tw-device')
  location.reload()
}
function exportJson() {
  const blob = new Blob([JSON.stringify({ ...state, calculated: summary.value }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${state.deviceName.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'tw-device'}.json`
  a.click()
  URL.revokeObjectURL(url)
}
const summary = computed(() => buildFinalSummary({
  ppeConstruction: modifiedPpeConstruction.value,
  activationPpe: totalActivation.value,
  constructionHours: constructionHours.value,
  constructionCredits: constructionCredits.value,
  constructionCreditsBeforeGems: constructionCreditsBeforeGems.value,
  gemsCredits: gemTotal.value,
  skillRollModifier: totalSkillRollModifier.value,
  hasLeyLineOnlyFunctions: hasLeyLineOnlyFunctions.value,
  allFunctionsRequireLeyLine: allFunctionsRequireLeyLine.value,
}))
async function exportPdf(printerFriendly = false) {
  pdfExporting.value = true
  pdfExportError.value = ''
  try {
    await downloadDevicePdf({
      generatedAt: new Date().toISOString(),
      state: JSON.parse(JSON.stringify(state)),
      summary: { ...summary.value },
      calculations: {
        basePpeConstruction: basePpeConstruction.value,
        storageModifier: storageModifier.value,
        modifiedPpeConstruction: modifiedPpeConstruction.value,
        selectedConstructionModifierPercent: selectedConstructionModifierPercent.value,
        selectedConstructionBonusPercent: selectedConstructionBonusPercent.value,
        totalSkillRollModifier: totalSkillRollModifier.value,
        constructionTimeAdjustment: activeTimeAdjustment.value?.label || 'None',
        constructionTimeMultiplier: constructionTimeMultiplier.value,
      },
      chains: chainResults.value.map(({ ppeConstruction, activation, gemCost }) => ({ ppeConstruction, activation, gemCost })),
    }, { printerFriendly })
  } catch (error) {
    console.error('PDF export failed', error)
    pdfExportError.value = 'The PDF could not be created. Please try again.'
  } finally {
    pdfExporting.value = false
  }
}
</script>

<template>
  <main class="tw-calculator-page">
    <header class="hero">
      <div>
        <p class="eyebrow">Rifts Ultimate Edition</p>
        <h1>Techno-Wizard Device Calculator</h1>
        <p>Build spell chains and estimate P.P.E., activation, construction time, and credit cost.</p>
      </div>
      <div class="actions">
        <button :disabled="pdfExporting" @click="exportPdf(false)">{{ pdfExporting ? 'Creating PDF...' : 'Export PDF' }}</button>
        <button class="secondary" :disabled="pdfExporting" @click="exportPdf(true)">Printer-friendly PDF</button>
        <button @click="exportJson">Export JSON</button>
        <button class="secondary" @click="reset">Reset</button>
        <p v-if="pdfExportError" class="export-error" role="alert">{{ pdfExportError }}</p>
      </div>
    </header>

    <div class="app-layout">
    <div class="workspace">
    <section class="panel grid settings">
      <label>Device name<input v-model="state.deviceName" /></label>
      <label>Form<input v-model="state.form" placeholder="Pistol, armor, vehicle…" /></label>
      <label>Device level<input v-model.number="state.deviceLevel" type="number" min="1" /></label>
      <label>Basic form cost (credits)<input v-model.number="state.formCost" type="number" min="0" /></label>
      <label class="check"><input v-model="state.singleUse" type="checkbox" /> Single-use device</label>
      <label class="check"><input v-model="state.existingTechnology" type="checkbox" /> Added to existing technology</label>
      <label v-if="state.existingTechnology" class="check"><input v-model="state.creatorHasMechanicalSkill" type="checkbox" /> Creator has appropriate Mechanical skill</label>
    </section>

    <section class="chains">
      <article v-for="(chain, chainIndex) in state.chains" :key="chain.id" class="panel chain">
        <div class="chain-head">
          <input v-model="chain.name" class="title-input" :aria-label="`Function ${chainIndex + 1} name`" />
          <button class="danger" :disabled="state.chains.length === 1" @click="removeChain(chain.id)">Remove</button>
        </div>

        <div class="grid chain-settings">
          <label>Primary gem carats<input v-model.number="chain.primaryGemCarats" type="number" min="0.5" step="0.5" /></label>
          <label>Required gems cost (credits)<input :value="credits(requiredGemCost(chain))" readonly /></label>
          <label>Power mode
            <select v-model="chain.mode">
              <option value="standard">Standard</option>
              <option value="ley-only">Ley line only (×1.5)</option>
              <option value="ley-hybrid">Works on/off ley line (×2)</option>
            </select>
          </label>
        </div>

        <div class="spell-list">
          <div v-for="(spell, spellIndex) in chain.spells" :key="spell.id" class="spell-row">
            <span class="badge">{{ spellIndex === 0 ? 'Primary' : 'Secondary' }}</span>
            <div class="spell-picker">
              <input
                v-model="spell.name"
                aria-label="Spell name"
                autocomplete="off"
                placeholder="Start typing a spell name…"
                @focus="spell.searchOpen = true"
                @input="handleSpellInput(spell)"
                @blur="closeSpellSearch(spell)"
              />
              <div v-if="spell.searchOpen" class="spell-options" role="listbox">
                <button
                  v-for="option in matchingSpells(spell)"
                  :key="`${option.level}-${option.name}`"
                  type="button"
                  class="spell-option"
                  @mousedown.prevent="selectSpell(spell, option)"
                >
                  <span>{{ option.name }}</span>
                  <small>Level {{ option.level }} · {{ option.ppeText || option.ppe }} P.P.E.</small>
                </button>
                <p v-if="matchingSpells(spell).length === 0" class="no-spells">No matching spells.</p>
              </div>
              <p v-if="gemForSpell(spell)" class="gem-note">
                Required gem: <strong>{{ gemForSpell(spell).name }}</strong>
                <span>{{ credits(gemForSpell(spell).pricePerCarat) }} credits per carat</span>
              </p>
              <div v-if="selectedSpell(spell)?.ppeModes?.length" class="spell-mode">
                <label>Cost mode
                  <select :value="activePpeMode(spell)?.id" @change="setSpellMode(spell, $event.target.value)">
                    <option v-for="mode in selectedSpell(spell).ppeModes" :key="mode.id" :value="mode.id">
                      {{ mode.label }} - {{ modeCostLabel(mode) }} P.P.E.
                    </option>
                  </select>
                </label>
                <label v-if="activePpeMode(spell)?.inputLabel">
                  {{ activePpeMode(spell).inputLabel }}
                  <input
                    type="number"
                    :min="activePpeMode(spell).inputMin"
                    :step="activePpeMode(spell).inputStep"
                    :value="spell.ppeModeInput ?? activePpeMode(spell).inputDefault"
                    @input="setSpellModeInput(spell, $event.target.value)"
                  />
                </label>
                <p v-if="activePpeMode(spell)?.note" class="mode-note">{{ activePpeMode(spell).note }}</p>
              </div>
            </div>
            <div class="ppe-field">
              <label class="inline">P.P.E.<input v-model.number="spell.ppe" type="number" min="0" :readonly="Boolean(selectedSpell(spell)?.ppeModes?.length)" /></label>
              <span v-if="spell.ppeText && spell.ppeText !== String(spell.ppe)" class="ppe-note">Book: {{ spell.ppeText }}</span>
            </div>
            <button class="icon danger" :disabled="chain.spells.length === 1" @click="removeSpell(chain, spell.id)">×</button>
          </div>
        </div>
        <button class="secondary" @click="addSpell(chain)">Add secondary spell</button>

        <div class="chain-result">
          <span>Construction P.P.E. <strong>{{ credits(chainResults[chainIndex].ppeConstruction) }}</strong></span>
          <span>Activation <strong>{{ chain.mode === 'ley-only' ? 'Ley line required' : `${credits(chainResults[chainIndex].activation)} P.P.E.` }}</strong></span>
        </div>
      </article>
      <button class="add-function" @click="addChain">+ Add function / spell chain</button>
    </section>

    <section class="panel grid modifiers">
      <label>P.P.E. storage<input v-model.number="state.storagePpe" type="number" min="0" /></label>
      <label>Construction increase per stored P.P.E. (%)<input v-model.number="state.storagePercentPerPoint" type="number" min="0" step="0.1" /></label>
      <label>Assistant time reduction (%)<input v-model.number="state.assistantTimeReduction" type="number" min="0" max="35" /></label>
      <div class="construction-adjustments wide">
      <fieldset class="modifier-options">
        <legend>Construction penalties</legend>
        <p>Selected penalties are added together and subtracted from the construction skill roll.</p>
        <label v-for="modifier in RIFTS_CONSTRUCTION_MODIFIERS" :key="modifier.id" v-memo="[selectedConstructionModifier(modifier.id)?.quantity]" class="modifier-option">
          <input
            type="checkbox"
            :checked="Boolean(selectedConstructionModifier(modifier.id))"
            @change="toggleConstructionModifier(modifier, $event.target.checked)"
          />
          <span><strong>{{ modifier.label }}</strong> <b class="penalty-percent">-{{ modifier.percent }}%</b><small v-if="modifier.note">{{ modifier.note }}</small></span>
          <span v-if="modifier.repeatable && selectedConstructionModifier(modifier.id)" class="modifier-quantity">
            <input
              :value="selectedConstructionModifier(modifier.id).quantity"
              type="number"
              min="1"
              step="1"
              @input="setConstructionModifierQuantity(modifier.id, $event.target.value)"
            />
            {{ modifier.unitLabel }}
          </span>
        </label>
      </fieldset>
      <fieldset class="modifier-options bonus-options">
        <legend>Construction bonuses</legend>
        <p>Selected bonuses are added together and applied to the construction skill roll.</p>
        <label v-for="bonus in RIFTS_CONSTRUCTION_BONUSES" :key="bonus.id" v-memo="[selectedConstructionBonus(bonus.id)?.quantity]" class="modifier-option">
          <input
            type="checkbox"
            :checked="Boolean(selectedConstructionBonus(bonus.id))"
            @change="toggleConstructionBonus(bonus, $event.target.checked)"
          />
          <span><strong>{{ bonus.label }}</strong> <b class="bonus-percent">+{{ bonus.percent }}%</b><small v-if="bonus.note">{{ bonus.note }}</small></span>
          <span v-if="bonus.repeatable && selectedConstructionBonus(bonus.id)" class="modifier-quantity">
            <input
              :value="selectedConstructionBonus(bonus.id).quantity"
              type="number"
              min="1"
              step="1"
              @input="setConstructionBonusQuantity(bonus.id, $event.target.value)"
            />
            {{ bonus.unitLabel }}
          </span>
        </label>
      </fieldset>
      </div>
      <label>Other custom skill-roll modifier (%)<input v-model.number="state.constructionModifierPercent" type="number" step="1" /></label>
      <label>Selected bonuses (%)<input :value="credits(selectedConstructionBonusPercent)" readonly /></label>
      <label>Total skill-roll modifier (%)<input :value="`${totalSkillRollModifier >= 0 ? '+' : ''}${credits(totalSkillRollModifier)}`" readonly /></label>
      <label>Construction-time adjustment<input :value="activeTimeAdjustment ? `${activeTimeAdjustment.label} (x${credits(constructionTimeMultiplier)})` : 'None'" readonly /></label>
      <label class="wide">Notes<textarea v-model="state.notes" rows="3" /></label>
    </section>

    <section ref="priceChartSection" class="panel price-chart">
      <h2>Total price and activation cost by primary gem size</h2>
      <p class="chart-context">Varies Function 1's primary gem; other functions remain at their entered carat values.</p>
      <svg
        v-if="chartVisible"
        :viewBox="`0 0 ${chart.width} ${chart.height}`"
        role="img"
        aria-labelledby="price-chart-title price-chart-description"
      >
        <title id="price-chart-title">Total item price and activation cost by primary gem carats</title>
        <desc id="price-chart-description">Total construction price on the left axis and activation P.P.E. on the right axis, from zero to six primary gem carats in half-carat increments.</desc>

        <g v-for="tick in chart.yTicks" :key="`y-${tick.value}`">
          <line class="chart-grid" :x1="chart.margin.left" :x2="chart.margin.left + chart.plotWidth" :y1="tick.y" :y2="tick.y" />
          <text class="chart-label chart-label-price" :x="chart.margin.left - 12" :y="tick.y + 4" text-anchor="end">{{ credits(tick.value) }}</text>
        </g>
        <g v-for="tick in chart.xTicks" :key="`x-${tick.value}`">
          <line class="chart-grid" :x1="tick.x" :x2="tick.x" :y1="chart.margin.top" :y2="chart.margin.top + chart.plotHeight" />
          <text class="chart-label" :x="tick.x" :y="chart.margin.top + chart.plotHeight + 24" text-anchor="middle">{{ tick.value }}</text>
        </g>
        <g v-for="tick in chart.activationTicks" :key="`activation-y-${tick.value}`">
          <text class="chart-label chart-label-activation" :x="chart.margin.left + chart.plotWidth + 12" :y="tick.y + 4">{{ credits(tick.value) }}</text>
        </g>

        <line class="chart-axis chart-axis-price" :x1="chart.margin.left" :x2="chart.margin.left" :y1="chart.margin.top" :y2="chart.margin.top + chart.plotHeight" />
        <line class="chart-axis chart-axis-activation" :x1="chart.margin.left + chart.plotWidth" :x2="chart.margin.left + chart.plotWidth" :y1="chart.margin.top" :y2="chart.margin.top + chart.plotHeight" />
        <line class="chart-axis" :x1="chart.margin.left" :x2="chart.margin.left + chart.plotWidth" :y1="chart.margin.top + chart.plotHeight" :y2="chart.margin.top + chart.plotHeight" />
        <polyline class="chart-line" :points="chart.points.map(point => `${point.x},${point.priceY}`).join(' ')" />
        <polyline class="chart-line chart-line-activation" :points="chart.points.map(point => `${point.x},${point.activationY}`).join(' ')" />
        <polyline
          class="chart-hit-area"
          :points="chart.points.map(point => `${point.x},${point.priceY}`).join(' ')"
          @pointermove="showChartTooltip($event, 'price')"
          @pointerleave="hideChartTooltip"
        />
        <polyline
          class="chart-hit-area"
          :points="chart.points.map(point => `${point.x},${point.activationY}`).join(' ')"
          @pointermove="showChartTooltip($event, 'activation')"
          @pointerleave="hideChartTooltip"
        />
        <circle
          v-for="point in chart.points"
          :key="`point-${point.carat}`"
          class="chart-point"
          :cx="point.x"
          :cy="point.priceY"
          r="4"
        >
          <title>{{ point.carat }} carats: {{ credits(point.price) }} credits total price</title>
        </circle>
        <circle
          v-for="point in chart.points"
          :key="`activation-point-${point.carat}`"
          class="chart-point chart-point-activation"
          :cx="point.x"
          :cy="point.activationY"
          r="4"
        >
          <title>{{ point.carat }} carats: {{ credits(point.activation) }} P.P.E. activation cost</title>
        </circle>

        <text class="chart-axis-title" :x="chart.margin.left + chart.plotWidth / 2" :y="chart.height - 8" text-anchor="middle">Primary gem (carats)</text>
        <text class="chart-axis-title chart-axis-title-price" :transform="`translate(18 ${chart.margin.top + chart.plotHeight / 2}) rotate(-90)`" text-anchor="middle">Total price (credits)</text>
        <text class="chart-axis-title chart-axis-title-activation" :transform="`translate(${chart.width - 18} ${chart.margin.top + chart.plotHeight / 2}) rotate(90)`" text-anchor="middle">Activation cost (P.P.E.)</text>

        <g v-if="chartTooltip" class="chart-tooltip" :transform="`translate(${chartTooltip.x} ${chartTooltip.y})`" pointer-events="none">
          <rect :width="chartTooltip.width" :height="chartTooltip.height" rx="7" />
          <circle :class="chartTooltip.series === 'price' ? 'chart-point' : 'chart-point-activation'" cx="14" cy="17" r="4" />
          <text class="chart-tooltip-label" x="25" y="21">{{ chartTooltip.point.carat }} carats</text>
          <text class="chart-tooltip-value" x="14" y="42">
            {{ credits(chartTooltip.series === 'price' ? chartTooltip.point.price : chartTooltip.point.activation) }}
            {{ chartTooltip.series === 'price' ? 'credits' : 'P.P.E.' }}
          </text>
        </g>
      </svg>
      <p v-else class="chart-placeholder">Chart loads when it approaches the viewport.</p>
    </section>
    </div>

    <aside class="results-sidebar" aria-label="Final device statistics">
      <div class="results-sidebar-inner">
        <h2>Final statistics</h2>
        <div class="stat"><span>Total construction P.P.E.</span><strong>{{ credits(summary.ppeConstruction) }}</strong></div>
        <div class="stat">
          <span>Total activation P.P.E.</span>
          <strong>{{ summary.allFunctionsRequireLeyLine ? 'Ley line required' : credits(summary.activationPpe) }}</strong>
          <small v-if="summary.hasLeyLineOnlyFunctions && !summary.allFunctionsRequireLeyLine">Ley-line functions require a ley line.</small>
        </div>
        <div class="stat"><span>Construction time</span><strong>{{ credits(summary.constructionHours) }} hours</strong></div>
        <div class="stat"><span>Required gems</span><strong>{{ credits(summary.gemsCredits) }} credits</strong></div>
        <div class="stat"><span>Cost before gems</span><strong>{{ credits(summary.constructionCreditsBeforeGems) }} credits</strong></div>
        <div class="stat"><span>Total construction cost (includes gems)</span><strong>{{ credits(summary.constructionCredits) }} credits</strong></div>
        <div class="stat skill-stat">
          <span>Total skill-roll modifier</span>
          <strong :class="summary.skillRollModifier < 0 ? 'negative' : summary.skillRollModifier > 0 ? 'positive' : ''">
            {{ summary.skillRollModifier >= 0 ? '+' : '' }}{{ credits(summary.skillRollModifier) }}%
          </strong>
        </div>
      </div>
    </aside>
    </div>

    <footer>
      <p><strong>Rules note:</strong> This is a table aid, not a replacement for the rulebook. The G.M. still assigns spell chains, effects, gems, limitations, and final rulings.</p>
    </footer>
  </main>
</template>

<style scoped src="../tw-calculator.css"></style>
