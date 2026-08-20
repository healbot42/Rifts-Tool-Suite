<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { groupInvocationsByLevel } from '../../../data/magic/invocations.js'
import SpellDetails from './SpellDetails.vue'

const props = defineProps({
  open: Boolean,
  spells: { type: Array, default: () => [] },
  knownIds: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'add'])
const dialog = ref(null)
const search = ref('')
const level = ref('')
const selectedId = ref('')
let restore = null
let previousBodyOverflow = null

const known = computed(() => new Set(props.knownIds))
const results = computed(() =>
  props.spells.filter(
    (spell) =>
      (!search.value ||
        spell.name
          .toLocaleLowerCase()
          .includes(search.value.toLocaleLowerCase())) &&
      (!level.value || spell.level === Number(level.value)),
  ),
)
const groups = computed(() => groupInvocationsByLevel(results.value))
const selected = computed(() =>
  props.spells.find((spell) => spell.id === selectedId.value),
)

function close() {
  emit('close')
}
function choose(spell) {
  selectedId.value = spell.id
}
function add() {
  if (selected.value && !known.value.has(selected.value.id))
    emit('add', selected.value.id)
}
function restoreDocument() {
  if (previousBodyOverflow != null) {
    document.body.style.overflow = previousBodyOverflow
    previousBodyOverflow = null
  }
  restore?.focus()
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
      'button,input,select,[tabindex]:not([tabindex="-1"])',
    ),
  ].filter((node) => !node.disabled)
  if (!nodes.length) return
  const first = nodes[0]
  const last = nodes[nodes.length - 1]
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
    if (!open) {
      restoreDocument()
      return
    }
    restore = document.activeElement
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    search.value = ''
    level.value = ''
    selectedId.value = props.spells[0]?.id || ''
    await nextTick()
    dialog.value?.querySelector('input')?.focus()
  },
)
onBeforeUnmount(restoreDocument)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="spell-picker-backdrop"
      @mousedown.self="close"
    >
      <section
        ref="dialog"
        class="spell-picker-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Choose known spells"
        @keydown="keydown"
      >
        <header class="spell-modal-heading">
          <h2>Invocation Catalog</h2>
          <button
            type="button"
            @click="close"
          >
            Close
          </button>
        </header>
        <div class="spell-picker-controls">
          <label
            >Search
            <input
              v-model="search"
              type="search"
              placeholder="Spell name…"
          /></label>
          <label
            >Level
            <select v-model="level">
              <option value="">All levels</option>
              <option
                v-for="value in 15"
                :key="value"
                :value="value"
              >
                Level {{ value }}
              </option>
            </select></label
          >
        </div>
        <div class="spell-picker-body">
          <nav
            class="spell-picker-list"
            aria-label="Invocations"
          >
            <p v-if="!groups.length">No spells match those filters.</p>
            <section
              v-for="group in groups"
              :key="group.level"
            >
              <h3>Level {{ group.level }}</h3>
              <button
                v-for="spell in group.entries"
                :key="spell.id"
                type="button"
                :class="{ active: selectedId === spell.id }"
                @click="choose(spell)"
              >
                <span>{{ spell.name }}</span>
                <small>{{ spell.cost }}</small>
              </button>
            </section>
          </nav>
          <div class="spell-picker-preview">
            <SpellDetails
              v-if="selected"
              :spell="selected"
            />
            <button
              type="button"
              :disabled="!selected || known.has(selected.id)"
              @click="add"
            >
              {{
                selected && known.has(selected.id)
                  ? 'Already known'
                  : 'Add spell'
              }}
            </button>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>
