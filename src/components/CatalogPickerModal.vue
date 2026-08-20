<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import CatalogEntryDetails from './CatalogEntryDetails.vue'
import {
  catalogFilter,
  catalogSearch,
  defaultCatalogOptions,
  normalizeCatalogSelection,
  validateCatalogOptions,
} from '../lib/catalogPicker.js'
import { groupArmoryCatalog } from '../lib/armoryCatalog.js'
import { resolveCatalogAssetUrl } from '../lib/catalogAssets.js'
const props = defineProps({
  open: Boolean,
  entries: { type: Array, default: () => [] },
  searchFields: { type: Array, default: () => ['name', 'description'] },
  filters: { type: Array, default: () => [] },
  title: { type: String, default: 'Choose from catalog' },
})
const emit = defineEmits(['close', 'confirm'])
const dialog = ref(null)
const search = ref('')
const selectedId = ref('')
const filterValues = ref({})
const values = ref({})
let restore = null
let previousBodyOverflow = null
const results = computed(() =>
  catalogFilter(
    catalogSearch(props.entries, search.value, props.searchFields),
    filterValues.value,
  ),
)
const filtersActive = computed(
  () =>
    Boolean(search.value) || Object.values(filterValues.value).some(Boolean),
)
const categoryGroups = computed(() => groupArmoryCatalog(results.value))
const selected = computed(() =>
  props.entries.find((e) => e.id === selectedId.value),
)
const invalid = computed(() =>
  validateCatalogOptions(selected.value, values.value),
)
function clear() {
  search.value = ''
  selectedId.value = ''
  filterValues.value = {}
  values.value = {}
}
function choose(entry) {
  selectedId.value = entry.id
  values.value = defaultCatalogOptions(entry)
}
function close() {
  emit('close')
}
function restoreDocumentScroll() {
  if (previousBodyOverflow == null) return
  document.body.style.overflow = previousBodyOverflow
  previousBodyOverflow = null
}
function confirm() {
  if (selected.value && !invalid.value.length)
    emit('confirm', normalizeCatalogSelection(selected.value, values.value))
}
function keydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }
  if (event.key !== 'Tab') return
  const nodes = [
    ...dialog.value.querySelectorAll(
      'button,input,select,textarea,[tabindex]:not([tabindex="-1"])',
    ),
  ].filter((n) => !n.disabled)
  if (!nodes.length) return
  const first = nodes[0],
    last = nodes[nodes.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
watch(
  () => props.open,
  async (open) => {
    if (open) {
      restore = document.activeElement
      previousBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      clear()
      if (props.entries[0]) choose(props.entries[0])
      await nextTick()
      dialog.value?.querySelector('input,button')?.focus()
    } else {
      restoreDocumentScroll()
      restore?.focus()
    }
  },
)
watch(results, (entries) => {
  if (!props.open || entries.some((entry) => entry.id === selectedId.value))
    return
  if (entries[0]) choose(entries[0])
  else selectedId.value = ''
})
onBeforeUnmount(() => {
  restoreDocumentScroll()
  restore?.focus()
})
</script>
<template>
  <Teleport to="body"
    ><div
      v-if="open"
      class="catalog-picker-backdrop"
      @mousedown.self="close"
    >
      <section
        ref="dialog"
        class="catalog-picker"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        @keydown="keydown"
      >
        <header>
          <h2>{{ title }}</h2>
          <button
            type="button"
            aria-label="Close catalog"
            @click="close"
          >
            Close
          </button>
        </header>
        <div class="catalog-picker-body">
          <aside class="catalog-picker-index">
            <label for="catalog-picker-search">Search equipment</label>
            <input
              id="catalog-picker-search"
              v-model="search"
              type="search"
              placeholder="Name, category, or entry text…"
              autocomplete="off"
            />
            <label
              v-for="filter in filters"
              :key="filter.id"
              class="catalog-picker-filter"
              >{{ filter.label
              }}<select v-model="filterValues[filter.id]">
                <option value="">All</option>
                <option
                  v-for="option in filter.options"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select></label
            >
            <p class="catalog-picker-result-count">
              {{ results.length }} of {{ entries.length }} entries
            </p>
            <nav
              class="catalog-picker-tree"
              aria-label="Catalog categories"
            >
              <p
                v-if="!results.length"
                class="catalog-picker-empty"
              >
                No entries match that search.
              </p>
              <details
                v-for="group in categoryGroups"
                :key="group.category"
                :open="filtersActive"
              >
                <summary>
                  <span>{{ group.category }}</span>
                  <span>{{ group.count }}</span>
                </summary>
                <details
                  v-for="subgroup in group.subcategories"
                  :key="subgroup.subcategory"
                  :open="filtersActive"
                >
                  <summary>
                    <span>{{ subgroup.subcategory }}</span>
                    <span>{{ subgroup.entries.length }}</span>
                  </summary>
                  <div class="catalog-picker-tree-entries">
                    <button
                      v-for="entry in subgroup.entries"
                      :key="entry.id"
                      type="button"
                      :class="{ active: selectedId === entry.id }"
                      :aria-pressed="selectedId === entry.id"
                      @click="choose(entry)"
                    >
                      {{ entry.name }}
                    </button>
                  </div>
                </details>
                <div class="catalog-picker-tree-entries">
                  <button
                    v-for="entry in group.entries"
                    :key="entry.id"
                    type="button"
                    :class="{ active: selectedId === entry.id }"
                    :aria-pressed="selectedId === entry.id"
                    @click="choose(entry)"
                  >
                    {{ entry.name }}
                  </button>
                </div>
              </details>
            </nav>
          </aside>
          <article
            v-if="selected"
            class="catalog-picker-selection"
          >
            <img
              v-if="selected.image"
              class="catalog-picker-image"
              :src="resolveCatalogAssetUrl(selected.image)"
              :alt="selected.name"
            />
            <CatalogEntryDetails :entry="selected" />
            <section
              v-if="selected.options?.length"
              class="catalog-picker-options"
            >
              <h4>Add to character</h4>
              <label
                v-for="option in selected.options || []"
                :key="option.id"
                >{{ option.label
                }}<select
                  v-if="option.type === 'select'"
                  v-model="values[option.id]"
                >
                  <option value="">Choose</option>
                  <option
                    v-for="item in option.choices"
                    :key="item.value"
                    :value="item.value"
                  >
                    {{ item.label }}
                  </option></select
                ><select
                  v-else-if="option.type === 'multi-select'"
                  v-model="values[option.id]"
                  multiple
                >
                  <option
                    v-for="item in option.choices"
                    :key="item.value"
                    :value="item.value"
                  >
                    {{ item.label }}
                  </option></select
                ><input
                  v-else-if="option.type === 'boolean'"
                  v-model="values[option.id]"
                  type="checkbox" /><input
                  v-else
                  v-model="values[option.id]"
                  :type="option.type === 'number' ? 'number' : 'text'"
              /></label>
              <p
                v-if="invalid.length"
                role="alert"
              >
                Complete all required options.
              </p>
            </section>
          </article>
          <p v-else>Select an entry to view details.</p>
        </div>
        <footer>
          <button
            type="button"
            @click="clear"
          >
            Clear</button
          ><button
            type="button"
            @click="close"
          >
            Cancel</button
          ><button
            type="button"
            :disabled="!selected || invalid.length"
            @click="confirm"
          >
            Add
          </button>
        </footer>
      </section>
    </div></Teleport
  >
</template>
<style>
.catalog-picker-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: stretch end;
  padding: 0;
  background: #000b;
}
.catalog-picker {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: min(90rem, calc(100% - 3rem));
  height: 100vh;
  height: 100dvh;
  padding: 1rem clamp(1rem, 2vw, 1.5rem);
  border: 1px solid var(--color-border);
  border-radius: 16px 0 0 16px;
  background: #07122d;
  box-shadow: -1.5rem 0 4rem rgba(0, 0, 0, 0.45);
  animation: catalog-sheet-enter 160ms ease-out;
}
.catalog-picker > header,
.catalog-picker > footer {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
}
.catalog-picker > header {
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}
.catalog-picker > header h2 {
  margin: 0;
}
.catalog-picker > footer {
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}
.catalog-picker-body {
  display: grid;
  grid-template-columns: minmax(15rem, 20rem) minmax(0, 1fr);
  min-height: 0;
  gap: 1.25rem;
  margin: 1rem 0;
  overflow: hidden;
}
.catalog-picker-index {
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
  overflow: hidden;
}
.catalog-picker-index > label {
  margin-bottom: 0.45rem;
  font-weight: 800;
}
.catalog-picker-index > input,
.catalog-picker-index > select {
  width: 100%;
  min-height: 2.75rem;
  padding: 0.65rem 0.8rem;
}
.catalog-picker-filter {
  margin-top: 0.75rem;
}
.catalog-picker-result-count {
  margin: 0.55rem 0 0.8rem;
  color: var(--color-text-muted);
  font-size: 0.82rem;
}
.catalog-picker-tree {
  min-height: 0;
  padding-right: 0.25rem;
  overflow-y: auto;
  scrollbar-color: var(--color-accent) var(--color-input);
}
.catalog-picker-tree details {
  border-top: 1px solid var(--color-border);
}
.catalog-picker-tree summary {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.8rem 0.25rem;
  color: var(--color-accent-bright);
  background: var(--color-surface);
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}
.catalog-picker-tree details details {
  margin-left: 0.45rem;
  border-top-color: rgba(77, 163, 255, 0.2);
}
.catalog-picker-tree details details summary {
  padding-block: 0.65rem;
  color: var(--color-blue);
  font-size: 0.72rem;
}
.catalog-picker-tree summary span:last-child {
  color: var(--color-text-muted);
}
.catalog-picker-tree-entries {
  padding-bottom: 0.35rem;
}
.catalog-picker-tree-entries button {
  width: 100%;
  padding: 0.6rem 0.7rem;
  border-radius: 7px;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.86rem;
  font-weight: 650;
  line-height: 1.25;
  text-align: left;
}
.catalog-picker-tree-entries button:hover {
  background: rgba(77, 163, 255, 0.1) !important;
  color: var(--color-text);
}
.catalog-picker-tree-entries button.active {
  background: rgba(242, 140, 40, 0.16);
  color: var(--color-text);
  box-shadow: inset 3px 0 var(--color-accent);
}
.catalog-picker article label {
  display: block;
  margin-top: 0.6rem;
}
.catalog-picker-selection {
  min-width: 0;
  padding: clamp(1rem, 3vw, 2rem);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
  overflow-y: auto;
}
.catalog-picker-image {
  display: block;
  width: min(100%, 42rem);
  max-height: 20rem;
  margin: 0 auto 1.25rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  object-fit: contain;
  background: var(--color-input);
}
.catalog-picker-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--color-border);
}
.catalog-picker-options h4,
.catalog-picker-options [role='alert'] {
  grid-column: 1 / -1;
  margin: 0;
}
.catalog-picker-options label {
  margin-top: 0 !important;
}
.catalog-picker-empty {
  padding: 1rem 0.25rem;
}
@media (max-width: 650px) {
  .catalog-picker-backdrop {
    place-items: end stretch;
    padding-top: 3rem;
  }
  .catalog-picker {
    width: 100%;
    height: calc(100vh - 3rem);
    height: calc(100dvh - 3rem);
    border-radius: 16px 16px 0 0;
  }
  .catalog-picker-body {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }
  .catalog-picker-index {
    max-height: 24rem;
  }
  .catalog-picker-selection {
    overflow: visible;
  }
}
@keyframes catalog-sheet-enter {
  from {
    opacity: 0.65;
    transform: translateX(1.5rem);
  }
}
@media (max-width: 650px) {
  @keyframes catalog-sheet-enter {
    from {
      opacity: 0.65;
      transform: translateY(1.5rem);
    }
  }
}
@media (prefers-reduced-motion: reduce) {
  .catalog-picker {
    animation: none;
  }
}
</style>
