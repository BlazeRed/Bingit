<script setup lang="ts">
import { LibraryBig } from '@lucide/vue'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import ContinueCard from './ContinueCard.vue'
import { inProgress } from '@/home/continue'
import { useLibraryStore } from '@/stores/library'

const MAX = 5

const library = useLibraryStore()
const shows = computed(() => inProgress(library.items))
</script>

<template>
  <section class="continue">
    <div class="continue__header">
      <h2>Continue watching</h2>
      <RouterLink v-if="shows.length > MAX" class="action-link" :to="{ name: 'library' }">
        <LibraryBig :size="16" aria-hidden="true" />All {{ shows.length }}
      </RouterLink>
    </div>
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
  </section>
</template>

<style scoped>
.continue {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.continue__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
    grid-template-columns: repeat(auto-fill, minmax(10.25rem, 1fr));
    gap: var(--space-3);
    overflow: visible;
    border: 0;
    background: transparent;
  }

  li + li {
    border-top: 1px solid var(--color-border);
  }
}
</style>
