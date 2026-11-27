<script setup lang="ts">
import { computed } from 'vue'

import LibraryEntry from './LibraryEntry.vue'
import { browse, type Bucket, type Layout, type SortKey } from '@/library/browse'
import type { MediaType } from '@/library/item'
import { useLibraryStore } from '@/stores/library'

const props = defineProps<{
  type: MediaType
  bucket: Bucket
  search: string
  sort: SortKey
  layout: Layout
  selectedId?: number
}>()

const library = useLibraryStore()
const visible = computed(() =>
  browse(library.items, props.type, props.bucket, props.search, props.sort),
)
</script>

<template>
  <p v-if="!library.isImported" role="status">
    {{ library.progress || (library.isSyncing ? 'Loading your library…' : 'No library yet.') }}
  </p>
  <ul v-else-if="visible.length" :class="layout">
    <li v-if="layout === 'list'" class="columns" aria-hidden="true">
      <span>Title</span><span>Progress</span><span>Next</span><span>Rating</span>
    </li>
    <LibraryEntry
      v-for="item in visible"
      :key="item.id"
      :item="item"
      :layout="layout"
      :selected="selectedId === item.id"
      @watch="(title, episodes) => library.act({ kind: 'watch', episodes, item: title })"
    />
  </ul>
  <p v-else class="muted">
    {{ search ? 'No title matches your filter.' : 'Nothing here yet.' }}
  </p>
</template>

<style scoped>
/* Keyboard focus must not end up under the pinned header. */
ul :deep(a),
ul :deep(button) {
  scroll-margin-block: 15rem var(--nav-h);
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.columns {
  display: none;
}

.list {
  container-type: inline-size;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
}

@container (min-width: 38rem) {
  .columns {
    display: grid;
    grid-template-columns: var(--table-columns);
    gap: var(--space-3);
    padding: var(--space-2) var(--space-4);
    padding-right: calc(var(--space-4) + var(--space-3) + var(--table-action));
    border-bottom: 1px solid var(--color-border-subtle);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .columns span:first-child {
    padding-left: calc(var(--poster-list-w) + var(--space-3));
  }
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--poster-card-w), 1fr));
  gap: var(--space-4) var(--space-3);
}

/* Shorter rows with a mouse. */
@media (min-width: 64rem) {
  .list {
    --poster-list-w: 2rem;
  }

  .list :deep(.entry--list) {
    padding-block: var(--space-2);
  }
}
</style>
