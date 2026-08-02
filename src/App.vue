<script setup>
import { defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue'
import { pageFromHash } from './lib/navigation.js'

// Each tool is an isolated feature module and loads only when opened.
const TwCalculator = defineAsyncComponent(() => import('./pages/tw-calculator/index.js'))
const TwDeviceBrowser = defineAsyncComponent(() => import('./pages/tw-device-browser/index.js'))
const InitiativeTracker = defineAsyncComponent(() => import('./pages/initiative-tracker/index.js'))
const CharacterSheet = defineAsyncComponent(() => import('./pages/character-sheet/index.js'))

const activePage = ref(pageFromHash(window.location.hash))
const syncPageFromHash = () => { activePage.value = pageFromHash(window.location.hash) }

onMounted(() => window.addEventListener('hashchange', syncPageFromHash))
onBeforeUnmount(() => window.removeEventListener('hashchange', syncPageFromHash))
</script>

<template>
  <nav class="app-ribbon" aria-label="Rifts Tool Suite pages">
    <div class="app-ribbon-inner">
      <a class="app-page-link" :class="{ active: activePage === 'tw-calculator' }" href="#tw-calculator" :aria-current="activePage === 'tw-calculator' ? 'page' : undefined">
        <svg class="app-page-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 6V3l2-2M9 6h6M5 6h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
          <circle cx="8.5" cy="13.5" r="3" />
          <path d="m7 14 1.5-1.5 1.5 1M14 11h4M14 14h4M14 17h2" />
        </svg>
        <span>TW Calculator</span>
      </a>
      <a class="app-page-link" :class="{ active: activePage === 'tw-device-browser' }" href="#tw-device-browser" :aria-current="activePage === 'tw-device-browser' ? 'page' : undefined">
        <svg class="app-page-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 6h16v12H4zM7 9h7v6H7zM17 9v2M17 14v1M9 6V3l2-2M14 4h3" />
          <circle cx="17" cy="12" r="1" />
        </svg>
        <span>TW Devices</span>
      </a>
      <a class="app-page-link" :class="{ active: activePage === 'initiative-tracker' }" href="#initiative-tracker" :aria-current="activePage === 'initiative-tracker' ? 'page' : undefined">
        <svg class="app-page-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 5h14M7 12h14M7 19h14" />
          <circle cx="3" cy="5" r="1" />
          <circle cx="3" cy="12" r="1" />
          <circle cx="3" cy="19" r="1" />
          <path d="m17 2 2 3-2 3" />
        </svg>
        <span>Initiative Tracker</span>
      </a>
      <a class="app-page-link" :class="{ active: activePage === 'character-sheet' }" href="#character-sheet" :aria-current="activePage === 'character-sheet' ? 'page' : undefined">
        <svg class="app-page-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="7" r="4" />
          <path d="M4 21c.7-5 3.4-8 8-8s7.3 3 8 8M8 17l4 3 4-3" />
        </svg>
        <span>Character Sheet</span>
      </a>
    </div>
  </nav>

  <TwCalculator v-if="activePage === 'tw-calculator'" />
  <TwDeviceBrowser v-else-if="activePage === 'tw-device-browser'" />
  <InitiativeTracker v-else-if="activePage === 'initiative-tracker'" />
  <CharacterSheet v-else />
</template>
