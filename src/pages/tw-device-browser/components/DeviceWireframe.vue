<script setup>
import { computed, nextTick, ref } from 'vue'
import { resolveDeviceImageUrl } from '../lib/deviceAssets.js'

const props = defineProps({ device: { type: Object, required: true } })

const expanded = ref(false)
const imageButton = ref(null)
const closeButton = ref(null)
const imageUrl = computed(() => resolveDeviceImageUrl(props.device.image))

function openImage() {
  expanded.value = true
  nextTick(() => closeButton.value?.focus())
}

function closeImage() {
  expanded.value = false
  nextTick(() => imageButton.value?.focus())
}
</script>

<template>
  <figure class="device-image">
    <button
      ref="imageButton"
      type="button"
      class="device-image-frame"
      :aria-label="`View a larger image of ${device.name}`"
      aria-haspopup="dialog"
      @click="openImage"
    >
      <img
        class="device-image-art"
        :src="imageUrl"
        :alt="`Original minimal line-art concept of ${device.name}`"
        width="1280"
        height="720"
        decoding="async"
      >
    </button>
    <figcaption>Click image to enlarge &middot; original AI-generated concept art</figcaption>
  </figure>

  <Teleport to="body">
    <div
      v-if="expanded"
      class="device-image-lightbox"
      @click="closeImage"
      @keydown.esc="closeImage"
    >
      <div
        class="device-image-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="`Larger image of ${device.name}`"
      >
        <button
          ref="closeButton"
          type="button"
          class="device-image-close"
          aria-label="Close larger image"
          @click.stop="closeImage"
        >
          &times;
        </button>
        <img
          class="device-image-expanded"
          :src="imageUrl"
          :alt="`Original minimal line-art concept of ${device.name}`"
          width="1280"
          height="720"
          @click.stop
        >
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.device-image { width: min(100%, 34rem); min-width: 0; margin: 0; }
.device-image-frame { display: grid; width: 100%; height: clamp(10rem, 24vw, 17rem); place-items: center; overflow: hidden; padding: clamp(.5rem, 1.5vw, 1rem); border: 1px solid var(--color-border); border-radius: 14px; background: #040b26; cursor: zoom-in; }
.device-image-frame:hover { border-color: var(--color-accent); }
.device-image-frame:focus-visible { outline: 3px solid var(--color-accent); outline-offset: 3px; }
.device-image-art { display: block; width: 92%; max-width: 100%; height: 92%; max-height: 100%; object-fit: contain; }
figcaption { margin-top: .45rem; color: var(--color-text-muted); font-size: .72rem; letter-spacing: .05em; text-align: right; text-transform: uppercase; }
.device-image-lightbox { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: clamp(1rem, 3vw, 2.5rem); background: rgba(2, 6, 20, .9); cursor: zoom-out; }
.device-image-dialog { position: relative; width: min(100%, 80rem); aspect-ratio: 16 / 9; }
.device-image-expanded { display: block; width: 100%; height: 100%; border: 1px solid var(--color-border); border-radius: 18px; background: #040b26; object-fit: contain; box-shadow: 0 1.5rem 5rem rgba(0, 0, 0, .55); cursor: default; }
.device-image-close { position: absolute; top: .75rem; right: .75rem; z-index: 1; width: 2.75rem; height: 2.75rem; padding: 0; border: 1px solid var(--color-border-strong); border-radius: 999px; background: rgba(10, 17, 37, .92); color: var(--color-text); font-size: 2rem; line-height: 1; cursor: pointer; }
.device-image-close:hover { border-color: var(--color-accent); background: var(--color-surface-raised); }
.device-image-close:focus-visible { outline: 3px solid var(--color-accent); outline-offset: 3px; }
</style>
