<script setup>
defineProps({
  entry: { type: Object, required: true },
  headingLevel: { type: String, default: 'h3' },
  compact: Boolean,
})

function sourceBook(entry) {
  return typeof entry.source === 'string'
    ? entry.source
    : entry.source?.book || ''
}

function sourceCitation(entry) {
  const packagePages = entry.source?.pages
  if (!entry.page && packagePages) return `pp. ${packagePages}`
  return entry.page ? `p. ${entry.page}` : ''
}
</script>

<template>
  <section
    class="catalog-entry-details"
    :class="{ compact }"
  >
    <header>
      <div class="catalog-entry-meta">
        <p class="eyebrow">
          {{ entry.subcategory || entry.category }}
        </p>
        <p
          v-if="entry.source"
          class="source-chip"
        >
          {{ sourceBook(entry)
          }}<template v-if="sourceCitation(entry)">
            {{ sourceCitation(entry) }}</template
          >
        </p>
      </div>
      <component :is="headingLevel">{{ entry.name }}</component>
    </header>
    <section
      v-if="entry.statistics?.length"
      class="catalog-game-statistics"
      aria-label="Game statistics"
    >
      <h4>Game Statistics</h4>
      <dl class="catalog-statistics-grid">
        <div
          v-for="(statistic, index) in entry.statistics"
          :key="`${statistic.label}-${index}`"
          class="catalog-statistic-card"
          :class="{ wide: String(statistic.value).length > 75 }"
        >
          <dt>{{ statistic.label }}</dt>
          <dd>{{ statistic.value }}</dd>
          <dd
            v-if="statistic.details"
            class="catalog-statistic-details"
          >
            {{ statistic.details }}
          </dd>
        </div>
      </dl>
    </section>
    <div
      v-if="entry.description"
      class="catalog-entry-copy"
    >
      <h4>Sourcebook entry</h4>
      <p>{{ entry.description }}</p>
    </div>
  </section>
</template>

<style>
.catalog-entry-details {
  min-width: 0;
}
.catalog-entry-details > header {
  display: grid;
  gap: 0.85rem;
  margin-bottom: 1.5rem;
}
.catalog-entry-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}
.catalog-entry-meta p,
.catalog-entry-details h3,
.catalog-entry-details h4 {
  margin: 0;
}
.catalog-entry-meta .source-chip {
  padding: 0.35rem 0.6rem;
  border: 1px solid rgba(77, 163, 255, 0.35);
  border-radius: 999px;
  background: rgba(77, 163, 255, 0.08);
  color: var(--color-text-muted);
  font-size: 0.78rem;
  line-height: 1.35;
  text-align: right;
}
.catalog-entry-details > header h3 {
  font-size: clamp(1.65rem, 4vw, 2.65rem);
  line-height: 1.05;
}
.catalog-game-statistics {
  margin: 0 0 1.75rem;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  background: var(--color-border);
}
.catalog-game-statistics h4 {
  padding: 0.75rem 1rem;
  background: rgba(255, 145, 31, 0.12);
  color: var(--color-accent-bright);
  font-size: 1.15rem;
}
.catalog-statistics-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  margin: 1px 0 0;
  background: var(--color-border);
}
.catalog-statistic-card {
  min-width: 0;
  padding: 0.75rem 1rem;
  background: var(--color-input);
}
.catalog-statistic-card.wide {
  grid-column: 1 / -1;
}
.catalog-statistic-card dt {
  color: var(--color-accent-bright);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}
.catalog-statistic-card dd {
  margin: 0.3rem 0 0;
  line-height: 1.48;
  overflow-wrap: anywhere;
  white-space: pre-line;
}
.catalog-entry-copy {
  max-width: 78ch;
}
.catalog-entry-copy p {
  margin: 0;
  line-height: 1.68;
  white-space: pre-line;
}
.catalog-entry-details.compact .catalog-game-statistics {
  padding: 0;
}
.catalog-entry-details.compact > header {
  margin-bottom: 0.85rem;
}
.catalog-entry-details.compact > header h3 {
  font-size: 1.2rem;
}
.catalog-entry-details.compact .catalog-statistics-grid {
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
}
@media (max-width: 650px) {
  .catalog-statistics-grid {
    grid-template-columns: 1fr;
  }
  .catalog-statistic-card.wide {
    grid-column: auto;
  }
}
</style>
