<script setup>
defineProps({ device: { type: Object, required: true } })
</script>

<template>
  <figure class="device-image">
    <div class="device-image-frame">
      <img
        :src="device.image"
        :alt="`Original minimal line-art concept of ${device.name}`"
        width="1280"
        height="720"
        decoding="async"
      >
    </div>
    <figcaption>Original AI-generated concept art · styled for the Rifts Tool Suite theme</figcaption>
  </figure>
</template>

<style scoped>
.device-image { min-width: 0; margin: 0; }
.device-image-frame { display: grid; width: 100%; aspect-ratio: 16 / 9; place-items: center; overflow: hidden; padding: clamp(.5rem, 2vw, 1.25rem); border: 1px solid var(--color-border); border-radius: 18px; background: var(--color-input); }
img { display: block; width: 92%; max-width: 100%; height: 92%; max-height: 100%; object-fit: contain; }
figcaption { margin-top: .45rem; color: var(--color-text-muted); font-size: .72rem; letter-spacing: .05em; text-align: right; text-transform: uppercase; }
</style>
