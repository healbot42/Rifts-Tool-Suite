<script setup>
defineProps({ spell: { type: Object, required: true } })
</script>

<template>
  <article class="spell-details">
    <header>
      <div>
        <p class="eyebrow">Level {{ spell.level }} invocation</p>
        <h3>{{ spell.name }}</h3>
      </div>
      <strong>{{ spell.cost }}</strong>
    </header>
    <p class="spell-source">
      {{ spell.source.book }} p{{
        spell.source.pages[0] === spell.source.pages[1] ? '.' : 'p.'
      }}
      {{ spell.source.pages[0]
      }}<template v-if="spell.source.pages[0] !== spell.source.pages[1]"
        >–{{ spell.source.pages[1] }}</template
      >
    </p>
    <div class="spell-description">{{ spell.description }}</div>
  </article>
</template>
