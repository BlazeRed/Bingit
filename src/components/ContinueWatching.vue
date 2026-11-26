<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import ContinueCard from './ContinueCard.vue'
import { inProgress } from '@/home/continue'
import { useLibraryStore } from '@/stores/library'

const MAX = 6

const library = useLibraryStore()
const shows = computed(() => inProgress(library.items))
</script>

<template>
  <section class="continue">
    <h2>Continue watching</h2>
    <p v-if="!library.isImported" class="muted" role="status">
      {{ library.progress || 'Loading your library…' }}
    </p>
    <p v-else-if="!shows.length" class="muted">
      Nothing in progress.
      <RouterLink :to="{ name: 'search' }">Find something to watch</RouterLink>
    </p>
    <ul v-else>
      <ContinueCard v-for="item in shows.slice(0, MAX)" :key="item.id" :item="item" />
    </ul>
    <p v-if="shows.length > MAX" class="muted">
      <RouterLink :to="{ name: 'library' }">All {{ shows.length }} in your library</RouterLink>
    </p>
  </section>
</template>

<style scoped>
.continue {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

ul {
  margin: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  list-style: none;
}

li + li {
  border-top: 1px solid var(--color-border-subtle);
}

@media (min-width: 64rem) {
  ul {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-4);
    overflow: visible;
    border: 0;
    background: transparent;
  }

  li + li {
    border-top: 1px solid var(--color-border);
  }
}
</style>
