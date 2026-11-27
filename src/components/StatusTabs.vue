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
span {
  font-size: var(--text-xs);
}
</style>
