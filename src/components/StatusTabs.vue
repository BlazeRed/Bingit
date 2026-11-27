<script setup lang="ts">
import { TabsList, TabsTrigger } from 'reka-ui'

import { BUCKETS, type Bucket } from '@/library/browse'
import type { MediaType } from '@/library/item'
import { useLibraryStore } from '@/stores/library'

const props = defineProps<{ type: MediaType; buckets: Bucket[]; label: string }>()
const library = useLibraryStore()

const count = (bucket: Bucket) =>
  library.items.filter((item) => item.type === props.type && item.status === BUCKETS[bucket].status)
    .length
</script>

<template>
  <TabsList class="tabs" :aria-label="label">
    <TabsTrigger v-for="bucket in buckets" :key="bucket" :value="bucket">
      {{ BUCKETS[bucket].label }} <span class="mono">{{ count(bucket) }}</span>
    </TabsTrigger>
  </TabsList>
</template>

<style scoped>
.tabs {
  display: flex;
  column-gap: var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

button {
  display: flex;
  /* The smaller count shares the baseline of the label. `wrap` lets the line be centered. */
  flex-wrap: wrap;
  place-content: center;
  align-items: baseline;
  gap: var(--space-2);
  min-height: var(--tap-min);
  padding: 0;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--color-text-muted);
  font-weight: var(--weight-medium);
  cursor: pointer;
}

button[data-state='active'] {
  border-bottom-color: var(--color-action);
  color: var(--color-text);
  font-weight: var(--weight-semibold);
}

span {
  font-size: var(--text-xs);
}
</style>
