<script setup>
import TwCalculator from './pages/tw-calculator/TwCalculator.vue'
</script>

<template>
  <nav class="app-ribbon" aria-label="Rifts Tool Suite pages">
    <div class="app-ribbon-inner">
      <a class="app-page-link active" href="#" aria-current="page" @click.prevent>
        <svg class="app-page-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14.5 3.5 20.5 9.5 9 21H3v-6L14.5 3.5Z" />
          <path d="m12.5 5.5 6 6M5.5 13.5l5 5M17 3v-2M21 7h2M19.5 4.5 21 3" />
        </svg>
        <span>TW Calculator</span>
      </a>
    </div>
  </nav>

  <TwCalculator />
</template>
