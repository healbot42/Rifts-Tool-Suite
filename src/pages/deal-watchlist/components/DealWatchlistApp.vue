<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { WATCHLIST_API, watchlistApi } from '../lib/watchlistApi.js'
import defaultProducts from '../../../data/deal-watchlist-products.json'
import catalog from '../../../data/warhammer-product-catalog.json'
import {
  CATALOG_FACTION_GROUPS,
  catalogProductVisible,
  watchlistDraft,
} from '../lib/catalog.js'

const products = ref([])
const owner = ref('')
const error = ref('')
const busy = ref(false)
const editingId = ref(null)
const editorOpen = ref(false)
const CATALOG_PAGE_SIZES = [12, 24, 48, 96]
const catalogPageSize = ref(CATALOG_PAGE_SIZES[0])
const catalogPage = ref(1)
const catalogOptions = reactive({
  query: '',
  system: 'All',
  faction: 'All',
  includeResin: false,
  includeCharacters: false,
  includeAccessories: false,
})
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
const matchingCatalogProducts = computed(() =>
  catalog.products.filter((product) =>
    catalogProductVisible(product, catalogOptions),
  ),
)
const catalogPageCount = computed(() =>
  Math.max(
    1,
    Math.ceil(matchingCatalogProducts.value.length / catalogPageSize.value),
  ),
)
const visibleCatalogProducts = computed(() =>
  matchingCatalogProducts.value.slice(
    (catalogPage.value - 1) * catalogPageSize.value,
    catalogPage.value * catalogPageSize.value,
  ),
)
const catalogRangeStart = computed(() =>
  visibleCatalogProducts.value.length
    ? (catalogPage.value - 1) * catalogPageSize.value + 1
    : 0,
)
const catalogRangeEnd = computed(() =>
  Math.min(
    catalogPage.value * catalogPageSize.value,
    matchingCatalogProducts.value.length,
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
  editorOpen.value = true
  requestAnimationFrame(() =>
    document
      .querySelector('.watchlist-editor')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
  )
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
  editorOpen.value = false
}

function useCatalogProduct(product) {
  Object.assign(form, blank(), watchlistDraft(product))
  editingId.value = null
  editorOpen.value = true
  requestAnimationFrame(() =>
    document
      .querySelector('.watchlist-editor')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
  )
}

function addCustomProduct() {
  Object.assign(form, blank())
  editingId.value = null
  editorOpen.value = true
  requestAnimationFrame(() =>
    document
      .querySelector('.watchlist-editor')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
  )
}

function goToCatalogPage(page) {
  catalogPage.value = Math.min(Math.max(1, page), catalogPageCount.value)
  requestAnimationFrame(() =>
    document
      .querySelector('.watchlist-catalog')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
  )
}

watch(catalogOptions, () => {
  catalogPage.value = 1
})
watch(catalogPageSize, () => {
  catalogPage.value = 1
})

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
      <div class="watchlist-heading-actions">
        <button
          type="button"
          class="secondary"
          :disabled="busy"
          @click="load"
        >
          Refresh
        </button>
        <button
          type="button"
          @click="addCustomProduct"
        >
          Add custom product
        </button>
      </div>
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

    <div class="watchlist-layout">
      <section class="watchlist-catalog">
        <header>
          <div>
            <p class="eyebrow">Official product discovery</p>
            <h2>Browse the miniature catalog</h2>
          </div>
          <span>{{ matchingCatalogProducts.length }} matches</span>
        </header>
        <div class="catalog-filters">
          <label class="wide">
            <span>Search products or factions</span>
            <input
              v-model="catalogOptions.query"
              placeholder="Possessed, Word Bearers…"
            />
          </label>
          <label>
            <span>Game</span>
            <select v-model="catalogOptions.system">
              <option>All</option>
              <option>Warhammer 40,000</option>
              <option>Horus Heresy</option>
            </select>
          </label>
          <label>
            <span>Faction</span>
            <select v-model="catalogOptions.faction">
              <option value="All">All factions</option>
              <optgroup
                v-for="group in CATALOG_FACTION_GROUPS"
                :key="group.label"
                :label="group.label"
              >
                <option
                  v-for="option in group.options"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </optgroup>
            </select>
          </label>
          <label class="toggle">
            <input
              v-model="catalogOptions.includeCharacters"
              type="checkbox"
            />
            <span>Show characters and single models</span>
          </label>
          <label class="toggle">
            <input
              v-model="catalogOptions.includeResin"
              type="checkbox"
            />
            <span>Show suspected resin kits</span>
          </label>
          <label class="toggle">
            <input
              v-model="catalogOptions.includeAccessories"
              type="checkbox"
            />
            <span>Show weapons and upgrade sets</span>
          </label>
        </div>
        <p class="catalog-note">
          Showing {{ catalogRangeStart }}–{{ catalogRangeEnd }} of
          {{ matchingCatalogProducts.length }} matches. Prices are official US
          MSRP where available.
        </p>
        <div class="catalog-grid">
          <article
            v-for="product in visibleCatalogProducts"
            :key="product.product_code"
          >
            <img
              v-if="product.image_url"
              :src="product.image_url"
              :alt="product.name"
              loading="lazy"
            />
            <div>
              <p class="eyebrow">
                {{ product.system }} · {{ product.faction }}
              </p>
              <h3>{{ product.name }}</h3>
              <p
                v-if="product.suspected_resin"
                class="catalog-warning"
              >
                Suspected resin
              </p>
              <p v-if="product.msrp">
                US MSRP: ${{ Number(product.msrp).toFixed(2) }}
              </p>
              <div class="watchlist-actions">
                <button
                  type="button"
                  @click="useCatalogProduct(product)"
                >
                  Add to watchlist
                </button>
                <a
                  :href="product.url"
                  target="_blank"
                  rel="noopener"
                  >Warhammer page</a
                >
              </div>
            </div>
          </article>
        </div>
        <nav
          v-if="matchingCatalogProducts.length"
          class="catalog-pagination"
          aria-label="Catalog pages"
        >
          <label>
            <span>Items per page</span>
            <select v-model="catalogPageSize">
              <option
                v-for="size in CATALOG_PAGE_SIZES"
                :key="size"
                :value="size"
              >
                {{ size }}
              </option>
            </select>
          </label>
          <button
            type="button"
            class="secondary"
            :disabled="catalogPage === 1"
            aria-label="First catalog page"
            @click="goToCatalogPage(1)"
          >
            First
          </button>
          <button
            type="button"
            class="secondary"
            :disabled="catalogPage === 1"
            @click="goToCatalogPage(catalogPage - 1)"
          >
            Previous
          </button>
          <span>Page {{ catalogPage }} of {{ catalogPageCount }}</span>
          <button
            type="button"
            class="secondary"
            :disabled="catalogPage === catalogPageCount"
            @click="goToCatalogPage(catalogPage + 1)"
          >
            Next
          </button>
          <button
            type="button"
            class="secondary"
            :disabled="catalogPage === catalogPageCount"
            aria-label="Last catalog page"
            @click="goToCatalogPage(catalogPageCount)"
          >
            Last
          </button>
        </nav>
      </section>

      <section
        v-if="editorOpen"
        class="watchlist-editor"
      >
        <header>
          <h2>{{ editingId ? 'Edit product' : 'Add product' }}</h2>
          <button
            type="button"
            class="secondary"
            @click="reset"
          >
            Close
          </button>
        </header>
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
          <div class="watchlist-product-heading">
            <h3>{{ product.name }}</h3>
            <span class="status">{{
              product.enabled ? 'Active' : 'Paused'
            }}</span>
          </div>
          <p class="watchlist-product-summary">
            <strong>${{ Number(product.msrp).toFixed(2) }}</strong> MSRP
            <span aria-hidden="true">&middot;</span>
            <strong>{{ remaining(product) }}</strong> remaining
            <template v-if="product.purchased_quantity">
              <span aria-hidden="true">&middot;</span>
              {{ product.purchased_quantity }} bought
            </template>
          </p>
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
    </div>
  </main>
</template>
