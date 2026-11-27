<script setup lang="ts">
import { computed } from 'vue'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { RotateCcw, SlidersHorizontal } from '@lucide/vue'

import AppSelect from './AppSelect.vue'
import SegmentedControl from './SegmentedControl.vue'
import { DEFAULT_SORT, SORTS, type Layout, type SortKey } from '@/library/browse'

const sort = defineModel<SortKey>('sort', { required: true })
const layout = defineModel<Layout>('layout', { required: true })

const isDefault = computed(() => sort.value === DEFAULT_SORT && layout.value === 'list')

function reset() {
  sort.value = DEFAULT_SORT
  layout.value = 'list'
}

const sortGroups = [
  { options: Object.entries(SORTS).map(([value, { label }]) => ({ value, label })) },
]
const LAYOUTS: Record<Layout, string> = { list: 'List', grid: 'Grid' }
</script>

<template>
  <PopoverRoot>
    <PopoverTrigger class="icon-button" aria-label="Filters">
      <SlidersHorizontal :size="20" aria-hidden="true" />
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent class="popup filters" align="end" :side-offset="8" :collision-padding="12">
        <AppSelect
          :model-value="sort"
          :groups="sortGroups"
          aria-label="Sort by"
          @update:model-value="sort = $event as SortKey"
        />
        <SegmentedControl v-model="layout" :options="LAYOUTS" label="Layout" />
        <button
          type="button"
          class="action-link filters__reset"
          :disabled="isDefault"
          @click="reset"
        >
          <RotateCcw :size="16" aria-hidden="true" />
          Reset filters
        </button>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

<!-- Not scoped: the panel is rendered in <body>. -->
<style>
.filters {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: min(20rem, calc(100vw - 2 * var(--space-5)));
  padding: var(--space-3);
}

.filters__reset {
  align-self: center;
}

.filters__reset:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
