<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { LayoutGrid, List, RefreshCw } from '@lucide/vue'

import LibraryEntry from '@/components/LibraryEntry.vue'
import {
  browse,
  BUCKETS,
  bucketsFor,
  parseSelection,
  SORTS,
  TYPES,
  type Bucket,
  type SortKey,
} from '@/library/browse'
import { useLibraryStore } from '@/stores/library'

const library = useLibraryStore()
const route = useRoute()

const selection = computed(() => parseSelection(route.params.type, route.params.bucket))
const buckets = computed(() => bucketsFor(selection.value.type))

const search = ref('')
const sort = ref<SortKey>('added')
const layout = ref<'list' | 'grid'>(
  localStorage.getItem('bingit-layout') === 'grid' ? 'grid' : 'list',
)
watch(layout, (value) => localStorage.setItem('bingit-layout', value))

const visible = computed(() =>
  browse(library.items, selection.value.type, selection.value.bucket, search.value, sort.value),
)

const count = (bucket: Bucket) =>
  browse(library.items, selection.value.type, bucket, '', sort.value).length

const linkTo = (type: string, bucket?: Bucket) => ({
  name: 'library',
  params: { type, bucket },
})

const syncedAt = computed(
  () =>
    library.checkedAt &&
    new Date(library.checkedAt).toLocaleTimeString('en', { timeStyle: 'short' }),
)
</script>

<template>
  <main class="library">
    <header class="library__header">
      <h1>Library</h1>
      <button type="button" class="tool" :disabled="library.isSyncing" @click="library.sync(true)">
        <RefreshCw :size="18" aria-hidden="true" />
        {{ library.isSyncing ? 'Syncing…' : 'Sync now' }}
      </button>
    </header>
    <p v-if="syncedAt" class="muted">Last synced at {{ syncedAt }}</p>

    <p v-if="library.error" class="error" role="alert">{{ library.error }}</p>
    <p v-if="library.pending.length" class="muted" role="status">
      {{ library.pending.length }} changes waiting to be sent to Simkl.
    </p>

    <nav class="segmented" aria-label="Category">
      <RouterLink
        v-for="(label, type) in TYPES"
        :key="type"
        :to="linkTo(type)"
        :aria-current="selection.type === type ? 'page' : undefined"
      >
        {{ label }}
      </RouterLink>
    </nav>

    <nav class="tabs" aria-label="Status">
      <RouterLink
        v-for="bucket in [...buckets.primary, ...buckets.secondary]"
        :key="bucket"
        :to="linkTo(selection.type, bucket)"
        :class="{ tabs__secondary: buckets.secondary.includes(bucket) }"
        :aria-current="selection.bucket === bucket ? 'page' : undefined"
      >
        {{ BUCKETS[bucket].label }} <span class="mono">{{ count(bucket) }}</span>
      </RouterLink>
    </nav>

    <div class="toolbar">
      <input
        v-model="search"
        type="search"
        aria-label="Filter titles"
        placeholder="Filter titles"
      />
      <select v-model="sort" aria-label="Sort by">
        <option v-for="(option, key) in SORTS" :key="key" :value="key">{{ option.label }}</option>
      </select>
      <button
        type="button"
        class="tool"
        :aria-label="layout === 'list' ? 'Show as grid' : 'Show as list'"
        @click="layout = layout === 'list' ? 'grid' : 'list'"
      >
        <component :is="layout === 'list' ? LayoutGrid : List" :size="18" aria-hidden="true" />
      </button>
    </div>

    <p v-if="!library.isImported" role="status">
      {{ library.progress || (library.isSyncing ? 'Loading your library…' : 'No library yet.') }}
    </p>
    <ul v-else-if="visible.length" :class="layout">
      <LibraryEntry
        v-for="item in visible"
        :key="item.id"
        :item="item"
        :layout="layout"
        @watch="(title, episodes) => library.act({ kind: 'watch', episodes, item: title })"
      />
    </ul>
    <p v-else class="muted">
      {{ search ? 'No title matches your filter.' : 'Nothing here yet.' }}
    </p>
  </main>
</template>

<style scoped>
.library {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: var(--content-max);
  padding: var(--space-6) var(--space-5);
}

.library__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h1 {
  font-size: var(--text-xl);
}

.muted {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.error {
  color: var(--color-danger);
}

.segmented {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 3px;
  border-radius: var(--radius-lg);
  background: var(--color-surface-sunken);
}

.segmented a {
  display: grid;
  place-items: center;
  min-height: var(--control-h);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  font-weight: var(--weight-medium);
  text-decoration: none;
}

.segmented a[aria-current] {
  background: var(--color-surface-raised);
  box-shadow: var(--shadow-raised);
  color: var(--color-text);
  font-weight: var(--weight-semibold);
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  column-gap: var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

.tabs a {
  display: flex;
  flex: none;
  gap: var(--space-2);
  align-items: center;
  min-height: var(--tap-min);
  border-bottom: 2px solid transparent;
  color: var(--color-text-muted);
  font-weight: var(--weight-medium);
  text-decoration: none;
}

.tabs a[aria-current] {
  border-bottom-color: var(--color-action);
  color: var(--color-text);
  font-weight: var(--weight-semibold);
}

.tabs .tabs__secondary {
  font-size: var(--text-sm);
}

.tabs a:not(.tabs__secondary) + .tabs__secondary {
  margin-left: auto;
}

.tabs span {
  font-size: var(--text-xs);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.toolbar input {
  flex: 1 1 14rem;
}

.toolbar select {
  flex: 1 0 auto;
}

@media (min-width: 64rem) {
  .toolbar select {
    flex-grow: 0;
  }
}

input,
select,
.tool {
  min-height: var(--control-h);
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.tool {
  display: inline-flex;
  gap: var(--space-2);
  align-items: center;
  cursor: pointer;
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.list {
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--poster-card-w), 1fr));
  gap: var(--space-4) var(--space-3);
}
</style>
