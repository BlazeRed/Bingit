<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { LayoutGrid, List } from '@lucide/vue'

import ErrorNote from '@/components/ErrorNote.vue'
import LibraryEntry from '@/components/LibraryEntry.vue'
import TitlePanel from '@/components/TitlePanel.vue'
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
const router = useRouter()

// Wide screens show the chosen title beside the list.
const wide = window.matchMedia?.('(min-width: 64rem)')
const isWide = ref(wide?.matches ?? false)
const onResize = (event: MediaQueryListEvent) => (isWide.value = event.matches)
wide?.addEventListener('change', onResize)
onUnmounted(() => wide?.removeEventListener('change', onResize))

const selected = computed(() => (isWide.value ? library.byId[Number(route.query.item)] : undefined))

function select(event: MouseEvent) {
  const modified = event.ctrlKey || event.metaKey || event.shiftKey || event.altKey
  const link = (event.target as HTMLElement).closest('.entry__link')
  const id = link?.closest('li')?.dataset.id
  if (!isWide.value || modified || !id) return
  // RouterLink leaves a prevented click alone.
  event.preventDefault()
  void router.replace({ query: { item: id } })
}

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
</script>

<template>
  <div class="split">
    <main class="library">
      <header class="library__header">
        <h1>Library</h1>
        <nav class="library__secondary" aria-label="Other statuses">
          <RouterLink
            v-for="bucket in buckets.secondary"
            :key="bucket"
            :to="linkTo(selection.type, bucket)"
            :aria-current="selection.bucket === bucket ? 'page' : undefined"
          >
            {{ BUCKETS[bucket].label }} {{ count(bucket) }}
          </RouterLink>
        </nav>
      </header>

      <ErrorNote v-if="library.error" :message="library.error" @retry="library.sync(true)" />
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
          v-for="bucket in buckets.primary"
          :key="bucket"
          :to="linkTo(selection.type, bucket)"
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
      <ul v-else-if="visible.length" :class="layout" @click.capture="select">
        <li v-if="layout === 'list'" class="columns" aria-hidden="true">
          <span>Title</span><span>Progress</span><span>Next</span><span>Rating</span>
        </li>
        <LibraryEntry
          v-for="item in visible"
          :key="item.id"
          :item="item"
          :layout="layout"
          :selected="selected?.id === item.id"
          @watch="(title, episodes) => library.act({ kind: 'watch', episodes, item: title })"
        />
      </ul>
      <p v-else class="muted">
        {{ search ? 'No title matches your filter.' : 'Nothing here yet.' }}
      </p>
    </main>

    <TitlePanel v-if="selected" :key="selected.id" :item="selected" />
  </div>
</template>

<style scoped>
.split {
  display: flex;
  align-items: flex-start;
}

.library {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: var(--content-max);
  padding: var(--space-6) var(--space-5);
}

.library__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.library__secondary {
  display: flex;
  gap: var(--space-3);
}

.library__secondary a {
  display: inline-flex;
  align-items: center;
  min-height: var(--tap-min);
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  text-decoration: none;
}

.library__secondary a + a::before {
  content: '·';
  margin-right: var(--space-3);
}

.library__secondary a[aria-current] {
  color: var(--color-text);
  font-weight: var(--weight-semibold);
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
</style>
