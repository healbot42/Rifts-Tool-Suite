<script setup>
import { computed, ref } from 'vue'
import catalog from '../data/tw-devices.json'
import { groupDevices, searchDevices } from '../lib/deviceSearch.js'
import DeviceWireframe from './DeviceWireframe.vue'

const query = ref('')
const selectedId = ref(catalog.devices[0]?.id ?? '')
const filteredDevices = computed(() => searchDevices(catalog.devices, query.value))
const groupedDevices = computed(() => groupDevices(filteredDevices.value))
const selectedDevice = computed(() => catalog.devices.find(device => device.id === selectedId.value) ?? filteredDevices.value[0] ?? null)

function selectDevice(device) {
  selectedId.value = device.id
  document.querySelector('.device-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <main class="device-browser-page">
    <header class="device-browser-header">
      <p class="eyebrow">Techno-Wizard archives</p>
      <h1>TW Device Catalog</h1>
      <p>Browse categorized Techno-Wizard devices compiled from the supplied Rifts sourcebooks.</p>
    </header>

    <div class="device-browser-layout">
      <aside class="device-index panel" aria-label="Techno-Wizard device index">
        <label for="device-search">Search devices</label>
        <input id="device-search" v-model="query" type="search" placeholder="Name, category, or entry text…" autocomplete="off">
        <p class="result-count" aria-live="polite">{{ filteredDevices.length }} of {{ catalog.devices.length }} devices</p>
        <nav class="category-list" aria-label="Device categories">
          <details v-for="group in groupedDevices" :key="group.category" open>
            <summary>{{ group.category }} <span>{{ group.devices.length }}</span></summary>
            <button
              v-for="device in group.devices"
              :key="device.id"
              type="button"
              class="device-index-button"
              :class="{ active: selectedDevice?.id === device.id }"
              :aria-current="selectedDevice?.id === device.id ? 'true' : undefined"
              @click="selectDevice(device)"
            >{{ device.name }}</button>
          </details>
          <p v-if="!groupedDevices.length" class="empty-state">No devices match that search.</p>
        </nav>
      </aside>

      <article v-if="selectedDevice" class="device-detail panel">
        <header class="device-detail-heading">
          <div class="device-detail-meta">
            <p class="eyebrow">{{ selectedDevice.category }}</p>
          <p class="source-chip">{{ selectedDevice.source }} · p. {{ selectedDevice.page }}</p>
          </div>
          <DeviceWireframe :key="selectedDevice.id" :device="selectedDevice" />
          <h2>{{ selectedDevice.name }}</h2>
        </header>
        <section class="game-statistics" aria-labelledby="device-statistics-heading">
          <h3 id="device-statistics-heading">Game Statistics</h3>
          <dl v-if="selectedDevice.statistics.length" class="statistics-grid">
            <div
              v-for="(statistic, index) in selectedDevice.statistics"
              :key="`${statistic.label}-${index}`"
              class="statistic-card"
              :class="{ wide: ['Powers / Effects', 'Modes', 'Construction Requirements', 'Penalties / Limitations'].includes(statistic.label) }"
            >
              <dt>{{ statistic.label }}</dt>
              <dd>{{ statistic.value }}</dd>
              <dd v-if="statistic.details" class="statistic-details"><strong>Effects:</strong> {{ statistic.details }}</dd>
            </div>
          </dl>
          <p v-else class="statistics-unavailable">This catalog entry refers to another sourcebook section and does not include a complete statistics block here.</p>
          <p class="statistics-note">Values are transcribed from the supplied sourcebook text. Consult the full entry below when scan text or formatting is ambiguous.</p>
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
