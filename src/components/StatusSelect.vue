<script setup lang="ts">
import { computed } from 'vue'

import AppSelect from './AppSelect.vue'
import type { SimklStatus } from '@/api/simkl-types'
import { BUCKETS, bucketsFor } from '@/library/browse'
import type { MediaType } from '@/library/item'
import type { Change } from '@/library/ops'

const props = defineProps<{ type: MediaType; status?: SimklStatus }>()
const emit = defineEmits<{ change: [change: Change] }>()

const groups = computed(() => {
  const { primary, archive } = bucketsFor(props.type)
  const options = [...primary, ...archive].map((bucket) => ({
    value: BUCKETS[bucket].status as string,
    label: BUCKETS[bucket].label,
  }))
  const remove = { options: [{ value: 'remove', label: 'Remove from library' }] }
  return props.status ? [{ options }, remove] : [{ options }]
})

function pick(value: string) {
  if (value !== 'remove') {
    emit('change', { kind: 'status', to: value as SimklStatus })
  } else if (confirm('Remove this title? Simkl also deletes its watch history and rating.')) {
    emit('change', { kind: 'remove' })
  }
}
</script>

<template>
  <AppSelect
    class="status"
    :model-value="status ?? ''"
    :groups="groups"
    placeholder="Add to library…"
    aria-label="Library status"
    @update:model-value="pick"
  />
</template>

<style scoped>
.status {
  max-width: 13rem;
  min-height: var(--tap-min);
  border: 0;
  background: var(--color-wash);
  color: var(--color-on-wash);
  font-weight: var(--weight-semibold);
}
</style>
