<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'

import { useLibraryStore } from '@/stores/library'

const VISIBLE_MS = 6000

const library = useLibraryStore()
const latest = computed(() => library.added.at(-1))
const shown = ref<number>()
let timer: ReturnType<typeof setTimeout> | undefined

watch(
  () => library.added.length,
  (length, before) => {
    clearTimeout(timer)
    // Only a new add shows the message; an undo hides it.
    shown.value = length > before ? latest.value?.id : undefined
    timer = setTimeout(() => (shown.value = undefined), VISIBLE_MS)
  },
)

onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <!-- Always present, so that screen readers announce the message. -->
  <div role="status">
    <p v-if="latest && shown === latest.id" class="toast">
      <span>Added to Watchlist</span>
      <button type="button" @click="library.undoAdd(latest.id)">Undo</button>
    </p>
  </div>
</template>

<style scoped>
.toast {
  position: fixed;
  right: var(--space-5);
  bottom: calc(var(--nav-h) + var(--space-4));
  left: var(--space-5);
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-1) var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-text);
  color: var(--color-bg);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
}

button {
  min-height: var(--tap-min);
  padding: 0 var(--space-2);
  border: 0;
  background: transparent;
  color: inherit;
  font-weight: var(--weight-semibold);
  cursor: pointer;
}

@media (min-width: 64rem) {
  .toast {
    right: var(--space-5);
    bottom: var(--space-5);
    left: auto;
    gap: var(--space-6);
  }
}
</style>
