<script setup lang="ts">
import { useLibraryStore } from '@/stores/library'

const library = useLibraryStore()
</script>

<template>
  <div class="failures" role="alert">
    <div v-for="(failure, index) in library.failures" :key="index" class="failure">
      <p>{{ failure.message }} The change was undone.</p>
      <button type="button" @click="library.retry(failure)">Retry</button>
      <button type="button" @click="library.dismiss(failure)">Dismiss</button>
    </div>
  </div>
</template>

<style scoped>
.failures {
  position: fixed;
  right: var(--space-4);
  bottom: calc(var(--nav-h) + var(--space-3));
  left: var(--space-4);
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.failure {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
}

p {
  flex: 1 1 14rem;
}

button {
  min-height: var(--control-h);
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  cursor: pointer;
}

@media (min-width: 64rem) {
  .failures {
    bottom: var(--space-4);
    left: auto;
    max-width: 32rem;
  }
}
</style>
