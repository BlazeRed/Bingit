<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TabsContent, TabsRoot } from 'reka-ui'
import { Archive } from '@lucide/vue'

import BottomSheet from '@/components/BottomSheet.vue'
import ErrorNote from '@/components/ErrorNote.vue'
import LibraryFilters from '@/components/LibraryFilters.vue'
import LibraryList from '@/components/LibraryList.vue'
import SearchField from '@/components/SearchField.vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import StatusTabs from '@/components/StatusTabs.vue'
import TitlePanel from '@/components/TitlePanel.vue'
import {
  bucketsFor,
  DEFAULT_SORT,
  parseSelection,
  TYPES,
  type Bucket,
  type Layout,
  type SortKey,
} from '@/library/browse'
import type { MediaType } from '@/library/item'
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

const show = (type: MediaType, bucket?: Bucket) =>
  router.push({ name: 'library', params: { type, bucket } })

// The archive lives in the URL, so "back" from a title opens it again.
const archived = computed(() => buckets.value.archive.find((b) => b === route.query.archive))
const showArchive = (archive?: string | number) =>
  router.replace({ query: { ...route.query, archive } })
const isArchiveOpen = computed({
  get: () => archived.value !== undefined,
  set: (isOpen) => void showArchive(isOpen ? buckets.value.archive[0] : undefined),
})

const search = ref('')
const archiveSearch = ref('')
const sort = ref<SortKey>(DEFAULT_SORT)
const layout = ref<Layout>(localStorage.getItem('bingit-layout') === 'grid' ? 'grid' : 'list')
watch(layout, (value) => localStorage.setItem('bingit-layout', value))
</script>

<template>
  <div class="split">
    <main class="library">
      <TabsRoot
        class="library__tabs"
        :model-value="selection.bucket"
        @update:model-value="show(selection.type, $event as Bucket)"
      >
        <div class="library__header">
          <div class="library__bar">
            <h1>Library</h1>
            <LibraryFilters v-model:sort="sort" v-model:layout="layout" />
            <button
              type="button"
              class="icon-button"
              aria-label="Archive"
              aria-haspopup="dialog"
              @click="isArchiveOpen = true"
            >
              <Archive :size="20" aria-hidden="true" />
            </button>
          </div>
          <SegmentedControl
            :model-value="selection.type"
            :options="TYPES"
            label="Category"
            @update:model-value="show($event)"
          />
          <SearchField v-model="search" aria-label="Filter titles" placeholder="Filter titles" />
          <StatusTabs :type="selection.type" :buckets="buckets.primary" label="Status" />
        </div>

        <ErrorNote v-if="library.error" :message="library.error" @retry="library.sync(true)" />
        <p v-if="library.pending.length" class="muted" role="status">
          {{ library.pending.length }} changes waiting to be sent to Simkl.
        </p>

        <TabsContent :value="selection.bucket" @click.capture="select">
          <LibraryList
            :type="selection.type"
            :bucket="selection.bucket"
            :search="search"
            :sort="sort"
            :layout="layout"
            :selected-id="selected?.id"
          />
        </TabsContent>
      </TabsRoot>
    </main>

    <TitlePanel v-if="selected" :key="selected.id" :item="selected" />

    <BottomSheet
      v-model:open="isArchiveOpen"
      title="Archive"
      :description="`${TYPES[selection.type]} you have seen, paused or dropped.`"
      close-label="Close archive"
    >
      <template #actions>
        <LibraryFilters v-model:sort="sort" v-model:layout="layout" />
      </template>
      <div class="sheet__search">
        <SearchField
          v-model="archiveSearch"
          aria-label="Filter archived titles"
          placeholder="Filter titles"
        />
      </div>
      <TabsRoot
        v-if="archived"
        class="archive"
        :model-value="archived"
        @update:model-value="showArchive"
      >
        <StatusTabs :type="selection.type" :buckets="buckets.archive" label="Archive status" />
        <!-- One panel per tab: each one starts at the top. -->
        <TabsContent :key="archived" class="archive__list" :value="archived">
          <LibraryList
            :type="selection.type"
            :bucket="archived"
            :search="archiveSearch"
            :sort="sort"
            :layout="layout"
          />
        </TabsContent>
      </TabsRoot>
    </BottomSheet>
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
  max-width: var(--content-max);
  padding: 0 var(--space-5) var(--space-6);
}

.library__tabs {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.library__header {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  /* Full width, so rows do not show at the sides while they scroll under. */
  margin-inline: calc(-1 * var(--space-5));
  padding: var(--space-4) var(--space-5) 0;
  background: var(--color-bg);
}

.library__bar {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

h1 {
  margin-right: auto;
  font-size: var(--text-xl);
}

.sheet__search {
  margin: var(--space-3) var(--space-5) 0;
}

.archive {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.archive > .tabs {
  padding: 0 var(--space-5);
}

.archive__list {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: var(--space-4) var(--space-5) calc(var(--space-4) + env(safe-area-inset-bottom));
}
</style>
