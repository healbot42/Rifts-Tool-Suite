<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { WATCHLIST_API, watchlistApi } from '../lib/watchlistApi.js'
import defaultProducts from '../../../data/deal-watchlist-products.json'

const products = ref([])
const owner = ref('')
const error = ref('')
const busy = ref(false)
const editingId = ref(null)
const blank = () => ({
  id: '',
  name: '',
  aliases: '',
  queries: '',
  quantity_wanted: 1,
  purchased_quantity: 0,
  msrp: '',
  percent_off_threshold: 25,
  hard_threshold: '',
  minimum_savings: 10,
  expected_models: '',
  minimum_models: '',
  required_terms: '',
  excluded_terms: '',
  enabled_conditions: [
    'New on sprue',
    'New in box',
    'New without box',
    'Assembled unpainted',
    'Primed',
    'Painted',
    'Partial / bits',
    'Unknown',
  ],
  enabled: true,
})
const form = reactive(blank())
const remaining = (product) =>
  Math.max(0, product.quantity_wanted - product.purchased_quantity)
const sortedProducts = computed(() =>
  [...products.value].sort(
    (a, b) =>
      Number(b.enabled) - Number(a.enabled) || a.name.localeCompare(b.name),
  ),
)
const listFields = ['aliases', 'queries', 'required_terms', 'excluded_terms']
const numberFields = [
  'quantity_wanted',
  'purchased_quantity',
  'msrp',
  'percent_off_threshold',
  'hard_threshold',
  'minimum_savings',
  'expected_models',
  'minimum_models',
]

function toForm(product) {
  const copy = { ...blank(), ...product }
  for (const key of listFields) copy[key] = (product[key] || []).join(', ')
  for (const key of Object.keys(copy)) form[key] = copy[key] ?? ''
  editingId.value = product.id
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function payload() {
  const value = { ...form }
  value.id = value.id
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  for (const key of listFields)
    value[key] = String(value[key])
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  for (const key of numberFields)
    value[key] = value[key] === '' ? null : Number(value[key])
  if (!value.queries.length) value.queries = [value.name.trim()]
  return value
}

function reset() {
  Object.assign(form, blank())
  editingId.value = null
}

async function load() {
  busy.value = true
  error.value = ''
  try {
    const result = await watchlistApi.list()
    products.value = result.products
    owner.value = result.owner
  } catch (cause) {
    error.value = cause.message
  } finally {
    busy.value = false
  }
}

async function save() {
  busy.value = true
  error.value = ''
  try {
    const value = payload()
    if (editingId.value && editingId.value !== value.id)
      await watchlistApi.remove(editingId.value)
    await watchlistApi.save(value)
    reset()
    await load()
  } catch (cause) {
    error.value = cause.message
    busy.value = false
  }
}

async function remove(product) {
  if (!window.confirm(`Remove ${product.name} from the watchlist?`)) return
  busy.value = true
  try {
    await watchlistApi.remove(product.id)
    if (editingId.value === product.id) reset()
    await load()
  } catch (cause) {
    error.value = cause.message
    busy.value = false
  }
}

async function importCurrentList() {
  busy.value = true
  error.value = ''
  try {
    for (const product of defaultProducts) await watchlistApi.save(product)
    await load()
  } catch (cause) {
    error.value = cause.message
    busy.value = false
  }
}

onMounted(load)
</script>

<template>
  <main class="watchlist-page">
    <header class="watchlist-heading">
      <div>
        <p class="eyebrow">Warhammer Deal Bot</p>
        <h1>Deal Watchlist</h1>
        <p>
          Add products, change targets, record purchases, or pause searches.
        </p>
      </div>
      <button
        type="button"
        :disabled="busy"
        @click="load"
      >
        Refresh
      </button>
    </header>
    <aside
      v-if="error"
      class="watchlist-error"
    >
      <strong>{{ error }}</strong>
      <p>
        If sign-in is required, open the protected API once, sign in, then
        return and refresh.
      </p>
      <a
        :href="`${WATCHLIST_API}/v1/watchlist`"
        target="_blank"
        rel="noopener"
        >Open Cloudflare sign-in</a
      >
    </aside>
    <p
      v-else-if="owner"
      class="watchlist-owner"
    >
      Signed in as {{ owner }}
    </p>

    <section class="watchlist-editor">
      <h2>{{ editingId ? 'Edit product' : 'Add product' }}</h2>
      <form @submit.prevent="save">
        <label
          ><span>Name</span
          ><input
            v-model="form.name"
            required
        /></label>
        <label
          ><span>ID</span
          ><input
            v-model="form.id"
            required
            placeholder="chaos-possessed"
        /></label>
        <label
          ><span>MSRP ($)</span
          ><input
            v-model="form.msrp"
            required
            type="number"
            min="0.01"
            step="0.01"
        /></label>
        <label
          ><span>Quantity wanted</span
          ><input
            v-model="form.quantity_wanted"
            type="number"
            min="0"
        /></label>
        <label
          ><span>Already purchased</span
          ><input
            v-model="form.purchased_quantity"
            type="number"
            min="0"
        /></label>
        <label
          ><span>Percent off target</span
          ><input
            v-model="form.percent_off_threshold"
            type="number"
            min="0"
            max="100"
        /></label>
        <label
          ><span>Maximum price ($)</span
          ><input
            v-model="form.hard_threshold"
            type="number"
            min="0"
            step="0.01"
        /></label>
        <label
          ><span>Minimum savings ($)</span
          ><input
            v-model="form.minimum_savings"
            type="number"
            min="0"
            step="0.01"
        /></label>
        <label
          ><span>Models in full kit</span
          ><input
            v-model="form.expected_models"
            type="number"
            min="1"
        /></label>
        <label
          ><span>Minimum useful models</span
          ><input
            v-model="form.minimum_models"
            type="number"
            min="1"
        /></label>
        <label class="wide"
          ><span>Other names, comma separated</span
          ><input v-model="form.aliases"
        /></label>
        <label class="wide"
          ><span>Search phrases, comma separated</span
          ><input v-model="form.queries"
        /></label>
        <label class="wide"
          ><span>Required words, comma separated</span
          ><input v-model="form.required_terms"
        /></label>
        <label class="wide"
          ><span>Excluded words, comma separated</span
          ><input v-model="form.excluded_terms"
        /></label>
        <label class="toggle"
          ><input
            v-model="form.enabled"
            type="checkbox"
          /><span>Search for this product</span></label
        >
        <div class="watchlist-actions">
          <button
            :disabled="busy"
            type="submit"
          >
            {{ editingId ? 'Save changes' : 'Add product' }}</button
          ><button
            v-if="editingId"
            type="button"
            class="secondary"
            @click="reset"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>

    <section class="watchlist-list">
      <header>
        <h2>Your products</h2>
        <span>{{ products.length }} total</span>
      </header>
      <div
        v-if="!products.length && !busy"
        class="watchlist-empty"
      >
        <p>
          No products saved yet. Import the bot's current 23-product list to
          start editing it here.
        </p>
        <button
          type="button"
          @click="importCurrentList"
        >
          Import current list
        </button>
      </div>
      <article
        v-for="product in sortedProducts"
        :key="product.id"
        :class="{ paused: !product.enabled }"
      >
        <div>
          <h3>{{ product.name }}</h3>
          <p>{{ product.id }}</p>
        </div>
        <dl>
          <div>
            <dt>MSRP</dt>
            <dd>${{ Number(product.msrp).toFixed(2) }}</dd>
          </div>
          <div>
            <dt>Wanted</dt>
            <dd>{{ product.quantity_wanted }}</dd>
          </div>
          <div>
            <dt>Purchased</dt>
            <dd>{{ product.purchased_quantity }}</dd>
          </div>
          <div>
            <dt>Remaining</dt>
            <dd>{{ remaining(product) }}</dd>
          </div>
        </dl>
        <span class="status">{{ product.enabled ? 'Active' : 'Paused' }}</span>
        <div class="watchlist-actions">
          <button
            type="button"
            @click="toForm(product)"
          >
            Edit</button
          ><button
            type="button"
            class="danger"
            @click="remove(product)"
          >
            Remove
          </button>
        </div>
      </article>
    </section>
  </main>
</template>
