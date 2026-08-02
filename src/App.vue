<script setup>
import { computed, reactive, watch } from 'vue'
import { RIFTS_GEMS, RIFTS_ULTIMATE_SPELLS } from './spells.js'

const makeSpell = (primary = false) => ({
  id: crypto.randomUUID(),
  name: '',
  ppe: 0,
  ppeText: '',
  searchOpen: false,
  primary,
})

const makeChain = (index = 1) => ({
  id: crypto.randomUUID(),
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
  notes: '',
  chains: [makeChain(1)],
})

const saved = localStorage.getItem('rifts-tw-device')
if (saved) {
  try { Object.assign(state, JSON.parse(saved)) } catch { /* ignore malformed saves */ }
}
let saveTimer
watch(state, () => {
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    localStorage.setItem('rifts-tw-device', JSON.stringify(state))
  }, 200)
}, { deep: true, flush: 'post' })


const normalized = value => String(value || '').toLowerCase()
const searchableSpells = RIFTS_ULTIMATE_SPELLS.map(spell => ({ spell, searchName: normalized(spell.name) }))
const spellByName = new Map(searchableSpells.map(({ spell, searchName }) => [searchName, spell]))
const spellSearchCache = new Map()
function matchingSpells(spell) {
  const query = normalized(spell.name).trim()
  const cached = spellSearchCache.get(query)
  if (cached) return cached
  const matches = query
    ? searchableSpells.filter(item => item.searchName.includes(query)).slice(0, 30).map(item => item.spell)
    : RIFTS_ULTIMATE_SPELLS.slice(0, 30)
  if (spellSearchCache.size >= 100) spellSearchCache.clear()
  spellSearchCache.set(query, matches)
  return matches
}
function selectSpell(spell, selected) {
  spell.name = selected.name
  spell.ppe = selected.ppe
  spell.ppeText = selected.ppeText || String(selected.ppe)
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

const clampNumber = (value, min = 0) => Math.max(min, Number(value) || 0)
const round = value => Math.round((value + Number.EPSILON) * 100) / 100
const creditFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const credits = value => creditFormatter.format(value)

function requiredGemCost(chain, primaryGemCarats = chain.primaryGemCarats) {
  return chain.spells.reduce((total, spell, index) => {
    const gemPrice = clampNumber(gemForSpell(spell)?.pricePerCarat)
    const carats = index === 0 ? clampNumber(primaryGemCarats) : 1
    return total + gemPrice * carats
  }, 0)
}

function chainBasePpe(chain, primaryGemCarats = chain.primaryGemCarats) {
  const spellPpe = chain.spells.reduce((sum, spell) => sum + clampNumber(spell.ppe), 0)
  const carats = Math.max(0.5, clampNumber(primaryGemCarats, 0.5))
  let result = spellPpe * clampNumber(state.deviceLevel, 1) * 10 / carats
  if (state.singleUse) result /= 10
  if (chain.mode === 'ley-only') result *= 1.5
  if (chain.mode === 'ley-hybrid') result *= 2
  return result
}

const chainResults = computed(() => state.chains.map(chain => {
  const ppeConstruction = chainBasePpe(chain)
  const activation = state.singleUse || chain.mode === 'ley-only' ? 0 : ppeConstruction / 20
  const gemCost = requiredGemCost(chain) * (state.singleUse ? 0.25 : 1)
  return { chain, ppeConstruction, activation, gemCost }
}))

const basePpeConstruction = computed(() => chainResults.value.reduce((sum, row) => sum + row.ppeConstruction, 0))
const storageModifier = computed(() => basePpeConstruction.value * clampNumber(state.storagePpe) * clampNumber(state.storagePercentPerPoint) / 100)
const modifiedPpeConstruction = computed(() => {
  const beforeGeneralModifier = basePpeConstruction.value + storageModifier.value
  return beforeGeneralModifier * (1 + Number(state.constructionModifierPercent || 0) / 100)
})
const gemTotal = computed(() => chainResults.value.reduce((sum, row) => sum + row.gemCost, 0))
const constructionCredits = computed(() => modifiedPpeConstruction.value * 10 * clampNumber(state.deviceLevel, 1) + gemTotal.value + clampNumber(state.formCost))

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
      const activation = state.singleUse || chain.mode === 'ley-only' ? 0 : ppeConstruction / 20
      return { ppeConstruction, activation }
    })
    const basePpe = projectedChains.reduce((sum, row) => sum + row.ppeConstruction, 0)
    const storage = basePpe * clampNumber(state.storagePpe) * clampNumber(state.storagePercentPerPoint) / 100
    const modifiedPpe = (basePpe + storage) * (1 + Number(state.constructionModifierPercent || 0) / 100)
    const projectedGemTotal = state.chains.reduce((sum, chain, index) =>
      sum + requiredGemCost(chain, index === 0 ? carat : chain.primaryGemCarats), 0) * (state.singleUse ? 0.25 : 1)
    return {
      price: modifiedPpe * 10 * clampNumber(state.deviceLevel, 1) + projectedGemTotal + clampNumber(state.formCost),
      activation: projectedChains.reduce((sum, row) => sum + row.activation, 0),
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
    const step = (normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10) * magnitude
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
const constructionHours = computed(() => {
  let hours
  if (state.existingTechnology) {
    hours = modifiedPpeConstruction.value * clampNumber(state.deviceLevel, 1)
    if (state.creatorHasMechanicalSkill) hours /= 2
  } else {
    hours = modifiedPpeConstruction.value / 10 * clampNumber(state.deviceLevel, 1)
  }
  if (state.singleUse) hours /= 2
  hours *= 1 - Math.min(35, clampNumber(state.assistantTimeReduction)) / 100
  return hours
})
const totalActivation = computed(() => chainResults.value.reduce((sum, row) => sum + row.activation, 0))

function addChain() { state.chains.push(makeChain(state.chains.length + 1)) }
function removeChain(id) { if (state.chains.length > 1) state.chains = state.chains.filter(chain => chain.id !== id) }
function addSpell(chain) { chain.spells.push(makeSpell(false)) }
function removeSpell(chain, id) { if (chain.spells.length > 1) chain.spells = chain.spells.filter(spell => spell.id !== id) }
function reset() {
  window.clearTimeout(saveTimer)
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
const summary = computed(() => ({
  ppeConstruction: round(modifiedPpeConstruction.value),
  activationPpe: round(totalActivation.value),
  constructionHours: round(constructionHours.value),
  constructionCredits: round(constructionCredits.value),
  gemsCredits: round(gemTotal.value),
}))
</script>

<template>
  <main>
    <header class="hero">
      <div>
        <p class="eyebrow">Rifts Ultimate Edition</p>
        <h1>Techno-Wizard Device Calculator</h1>
        <p>Build spell chains and estimate P.P.E., activation, construction time, and credit cost.</p>
      </div>
      <div class="actions">
        <button @click="exportJson">Export JSON</button>
        <button class="secondary" @click="reset">Reset</button>
      </div>
    </header>

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
            </div>
            <div class="ppe-field">
              <label class="inline">P.P.E.<input v-model.number="spell.ppe" type="number" min="0" /></label>
              <span v-if="spell.ppeText && spell.ppeText !== String(spell.ppe)" class="ppe-note">Book: {{ spell.ppeText }}</span>
            </div>
            <button class="icon danger" :disabled="chain.spells.length === 1" @click="removeSpell(chain, spell.id)">×</button>
          </div>
        </div>
        <button class="secondary" @click="addSpell(chain)">Add secondary spell</button>

        <div class="chain-result">
          <span>Construction P.P.E. <strong>{{ credits(chainResults[chainIndex].ppeConstruction) }}</strong></span>
          <span>Activation <strong>{{ credits(chainResults[chainIndex].activation) }} P.P.E.</strong></span>
        </div>
      </article>
      <button class="add-function" @click="addChain">+ Add function / spell chain</button>
    </section>

    <section class="panel grid modifiers">
      <label>P.P.E. storage<input v-model.number="state.storagePpe" type="number" min="0" /></label>
      <label>Construction increase per stored P.P.E. (%)<input v-model.number="state.storagePercentPerPoint" type="number" min="0" step="0.1" /></label>
      <label>Assistant time reduction (%)<input v-model.number="state.assistantTimeReduction" type="number" min="0" max="35" /></label>
      <label>Other P.P.E. construction modifier (%)<input v-model.number="state.constructionModifierPercent" type="number" step="1" /></label>
      <label class="wide">Notes<textarea v-model="state.notes" rows="3" /></label>
    </section>

    <section class="results">
      <div><span>Total construction P.P.E.</span><strong>{{ credits(summary.ppeConstruction) }}</strong></div>
      <div><span>Total activation P.P.E.</span><strong>{{ credits(summary.activationPpe) }}</strong></div>
      <div><span>Construction time</span><strong>{{ credits(summary.constructionHours) }} hours</strong></div>
      <div><span>Construction cost</span><strong>{{ credits(summary.constructionCredits) }} credits</strong></div>
    </section>

    <section class="panel price-chart">
      <h2>Total price and activation cost by primary gem size</h2>
      <p class="chart-context">Varies Function 1's primary gem; other functions remain at their entered carat values.</p>
      <svg
        :viewBox="`0 0 ${chart.width} ${chart.height}`"
        role="img"
        aria-labelledby="price-chart-title price-chart-description"
      >
        <title id="price-chart-title">Total item price and activation cost by primary gem carats</title>
        <desc id="price-chart-description">Total construction price on the left axis and activation P.P.E. on the right axis, from zero to six primary gem carats in half-carat increments.</desc>

        <g v-for="tick in chart.yTicks" :key="`y-${tick.value}`">
          <line class="chart-grid" :x1="chart.margin.left" :x2="chart.margin.left + chart.plotWidth" :y1="tick.y" :y2="tick.y" />
          <text class="chart-label" :x="chart.margin.left - 12" :y="tick.y + 4" text-anchor="end">{{ credits(tick.value) }}</text>
        </g>
        <g v-for="tick in chart.xTicks" :key="`x-${tick.value}`">
          <line class="chart-grid" :x1="tick.x" :x2="tick.x" :y1="chart.margin.top" :y2="chart.margin.top + chart.plotHeight" />
          <text class="chart-label" :x="tick.x" :y="chart.margin.top + chart.plotHeight + 24" text-anchor="middle">{{ tick.value }}</text>
        </g>
        <g v-for="tick in chart.activationTicks" :key="`activation-y-${tick.value}`">
          <text class="chart-label chart-label-activation" :x="chart.margin.left + chart.plotWidth + 12" :y="tick.y + 4">{{ credits(tick.value) }}</text>
        </g>

        <line class="chart-axis" :x1="chart.margin.left" :x2="chart.margin.left" :y1="chart.margin.top" :y2="chart.margin.top + chart.plotHeight" />
        <line class="chart-axis chart-axis-activation" :x1="chart.margin.left + chart.plotWidth" :x2="chart.margin.left + chart.plotWidth" :y1="chart.margin.top" :y2="chart.margin.top + chart.plotHeight" />
        <line class="chart-axis" :x1="chart.margin.left" :x2="chart.margin.left + chart.plotWidth" :y1="chart.margin.top + chart.plotHeight" :y2="chart.margin.top + chart.plotHeight" />
        <polyline class="chart-line" :points="chart.points.map(point => `${point.x},${point.priceY}`).join(' ')" />
        <polyline class="chart-line chart-line-activation" :points="chart.points.map(point => `${point.x},${point.activationY}`).join(' ')" />
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
        <text class="chart-axis-title" :transform="`translate(18 ${chart.margin.top + chart.plotHeight / 2}) rotate(-90)`" text-anchor="middle">Total price (credits)</text>
        <text class="chart-axis-title chart-axis-title-activation" :transform="`translate(${chart.width - 18} ${chart.margin.top + chart.plotHeight / 2}) rotate(90)`" text-anchor="middle">Activation cost (P.P.E.)</text>
      </svg>
    </section>

    <footer>
      <p><strong>Rules note:</strong> This is a table aid, not a replacement for the rulebook. The G.M. still assigns spell chains, effects, gems, limitations, and final rulings.</p>
    </footer>
  </main>
</template>
