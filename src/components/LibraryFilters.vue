<script setup lang="ts">
import { computed, ref } from 'vue'
import { RotateCcw, SlidersHorizontal } from '@lucide/vue'

import BottomSheet from './BottomSheet.vue'
import ChoiceList from './ChoiceList.vue'
import SegmentedControl from './SegmentedControl.vue'
import { DEFAULT_SORT, SORTS, type Layout, type SortKey } from '@/library/browse'

const sort = defineModel<SortKey>('sort', { required: true })
const layout = defineModel<Layout>('layout', { required: true })

const isDefault = computed(() => sort.value === DEFAULT_SORT && layout.value === 'list')

function reset() {
  sort.value = DEFAULT_SORT
  layout.value = 'list'
}

const isOpen = ref(false)

const sortGroups = [
  {
    label: 'Sort by',
    options: Object.entries(SORTS).map(([value, { label }]) => ({ value, label })),
  },
]
const LAYOUTS: Record<Layout, string> = { list: 'List', grid: 'Grid' }
</script>

<template>
  <button
    type="button"
    class="icon-button"
    aria-label="Filters"
    aria-haspopup="dialog"
    @click="isOpen = true"
  >
    <SlidersHorizontal :size="20" aria-hidden="true" />
  </button>
  <BottomSheet
    v-model:open="isOpen"
    title="Filters"
    description="Sort order and layout of your titles."
    close-label="Close filters"
    fit
  >
    <div class="library-filters">
      <ChoiceList
        :model-value="sort"
        :groups="sortGroups"
        label="Sort by"
        @update:model-value="sort = $event as SortKey"
      />
      <SegmentedControl v-model="layout" :options="LAYOUTS" label="Layout" />
      <button
        type="button"
        class="action-link library-filters__reset"
        :disabled="isDefault"
        @click="reset"
      >
        <RotateCcw :size="16" aria-hidden="true" />
        Reset filters
      </button>
    </div>
  </BottomSheet>
</template>

<!-- Not scoped: the sheet is rendered in <body>. -->
<style>
.library-filters {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5) calc(var(--space-4) + env(safe-area-inset-bottom));
}

.library-filters__reset {
  align-self: center;
}

.library-filters__reset:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
