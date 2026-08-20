<script setup>
import { computed, ref } from 'vue'
import { armoryItems } from '../../../data/items/armory.js'
import {
  groupArmoryItems,
  resolveFilteredSelection,
  searchDevices,
} from '../lib/deviceSearch.js'
import DeviceWireframe from './DeviceWireframe.vue'

const query = ref('')
const selectedId = ref(armoryItems[0]?.id ?? '')
const filteredDevices = computed(() => searchDevices(armoryItems, query.value))
const groupedDevices = computed(() => groupArmoryItems(filteredDevices.value))
const selectedDevice = computed(() =>
  resolveFilteredSelection(filteredDevices.value, selectedId.value),
)

function selectDevice(device) {
  selectedId.value = device.id
  document
    .querySelector('.device-detail')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <main class="device-browser-page">
    <header class="device-browser-header">
      <p class="eyebrow">Rifts equipment archives</p>
      <h1>Armory</h1>
      <p>
        Browse equipment, weapons, armor, vehicles, and Techno-Wizard devices
        compiled from the supplied Rifts sourcebooks.
      </p>
    </header>

    <div class="device-browser-layout">
      <aside
        class="device-index panel"
        aria-label="Armory item index"
      >
        <label for="device-search">Search the armory</label>
        <input
          id="device-search"
          v-model="query"
          type="search"
          placeholder="Name, category, or entry text…"
          autocomplete="off"
        />
        <p
          class="result-count"
          aria-live="polite"
        >
          {{ filteredDevices.length }} of {{ armoryItems.length }} items
        </p>
        <nav
          class="category-list"
          aria-label="Armory categories"
        >
          <details
            v-for="group in groupedDevices"
            :key="group.category"
          >
            <summary>
              {{ group.category }}
              <span>{{
                group.groups.reduce(
                  (sum, entry) => sum + entry.devices.length,
                  0,
                )
              }}</span>
            </summary>
            <button
              v-for="device in group.directDevices"
              :key="device.id"
              type="button"
              class="device-index-button direct-category-item"
              :class="{ active: selectedDevice?.id === device.id }"
              :aria-current="
                selectedDevice?.id === device.id ? 'true' : undefined
              "
              @click="selectDevice(device)"
            >
              {{ device.name }}
            </button>
            <template v-if="group.groups.length > 1">
              <details
                v-for="subgroup in group.groups"
                :key="subgroup.subcategory"
                class="armory-subgroup"
              >
                <summary>
                  {{ subgroup.subcategory }}
                  <span>{{ subgroup.devices.length }}</span>
                </summary>
                <button
                  v-for="device in subgroup.devices"
                  :key="device.id"
                  type="button"
                  class="device-index-button"
                  :class="{ active: selectedDevice?.id === device.id }"
                  :aria-current="
                    selectedDevice?.id === device.id ? 'true' : undefined
                  "
                  @click="selectDevice(device)"
                >
                  {{ device.name }}
                </button>
              </details>
            </template>
          </details>
          <p
            v-if="!groupedDevices.length"
            class="empty-state"
          >
            No armory items match that search.
          </p>
        </nav>
      </aside>

      <article
        v-if="selectedDevice"
        class="device-detail panel"
      >
        <header class="device-detail-heading">
          <div class="device-detail-meta">
            <p class="eyebrow">{{ selectedDevice.category }}</p>
            <p class="source-chip">
              {{ selectedDevice.source }} · p. {{ selectedDevice.page }}
            </p>
          </div>
          <DeviceWireframe
            v-if="selectedDevice.image"
            :key="selectedDevice.id"
            :device="selectedDevice"
          />
          <h2>{{ selectedDevice.name }}</h2>
        </header>
        <section
          class="game-statistics"
          aria-labelledby="device-statistics-heading"
        >
          <h3 id="device-statistics-heading">Game Statistics</h3>
          <dl
            v-if="selectedDevice.statistics.length"
            class="statistics-grid"
          >
            <div
              v-for="(statistic, index) in selectedDevice.statistics"
              :key="`${statistic.label}-${index}`"
              class="statistic-card"
              :class="{
                wide: [
                  'Powers / Effects',
                  'Modes',
                  'Construction Requirements',
                  'Penalties / Limitations',
                ].includes(statistic.label),
              }"
            >
              <dt>{{ statistic.label }}</dt>
              <dd>{{ statistic.value }}</dd>
              <dd
                v-if="statistic.details"
                class="statistic-details"
              >
                <strong>Effects:</strong> {{ statistic.details }}
              </dd>
            </div>
          </dl>
          <p
            v-else
            class="statistics-unavailable"
          >
            This catalog entry refers to another sourcebook section and does not
            include a complete statistics block here.
          </p>
          <p class="statistics-note">
            Values are transcribed from the supplied sourcebook text. Consult
            the full entry below when scan text or formatting is ambiguous.
          </p>
        </section>
        <div class="entry-copy">
          <h3>Sourcebook entry</h3>
          <p>{{ selectedDevice.description }}</p>
        </div>
      </article>
    </div>
  </main>
</template>

<style scoped src="../tw-device-browser.css"></style>
