<script setup lang="ts">
import { Search } from '@lucide/vue'

/** Wide screens: opens the Search page, where the real input is. */
const emit = defineEmits<{ open: [] }>()
</script>

<template>
  <div class="bar">
    <button type="button" @click="emit('open')">
      <Search :size="18" aria-hidden="true" />
      Search movies, TV, anime
      <kbd aria-hidden="true">/</kbd>
    </button>
  </div>
</template>

<style scoped>
.bar {
  display: none;
}

@media (min-width: 64rem) {
  .bar {
    display: flex;
    align-items: center;
    height: 4.25rem;
    padding: 0 var(--space-7);
    border-bottom: 1px solid var(--color-border);
  }

  button {
    display: flex;
    flex: 1;
    gap: var(--space-3);
    align-items: center;
    max-width: 32rem;
    height: var(--control-h);
    padding: 0 var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    color: var(--color-text-muted);
    text-align: left;
    cursor: text;
  }

  kbd {
    margin-left: auto;
    padding: 2px var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: var(--text-2xs);
  }
}
</style>
