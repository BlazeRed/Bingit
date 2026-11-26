<script setup lang="ts">
import { computed } from 'vue'

import type { SimklStatus } from '@/api/simkl-types'
import { BUCKETS, bucketsFor } from '@/library/browse'
import type { MediaType } from '@/library/item'
import type { Change } from '@/library/ops'

const props = defineProps<{ type: MediaType; status?: SimklStatus }>()
const emit = defineEmits<{ change: [change: Change] }>()

const options = computed(() => {
  const { primary, secondary } = bucketsFor(props.type)
  return [...primary, ...secondary].map((bucket) => BUCKETS[bucket])
})

function pick(event: Event) {
  const select = event.target as HTMLSelectElement
  if (select.value !== 'remove') {
    emit('change', { kind: 'status', to: select.value as SimklStatus })
  } else if (confirm('Remove this title? Simkl also deletes its watch history and rating.')) {
    emit('change', { kind: 'remove' })
  } else {
    select.value = props.status ?? ''
  }
}
</script>

<template>
  <select :value="status ?? ''" aria-label="Library status" @change="pick">
    <option value="" disabled>Add to library…</option>
    <option v-for="o in options" :key="o.status" :value="o.status">{{ o.label }}</option>
    <option v-if="status" value="remove">Remove from library</option>
  </select>
</template>

<style scoped>
select {
  min-height: var(--tap-min);
  padding: 0 var(--space-3);
  border: 0;
  border-radius: var(--radius-md);
  background: var(--color-wash);
  color: var(--color-on-wash);
  font-weight: var(--weight-semibold);
}
</style>
