<script setup lang="ts">
import { computed, ref } from 'vue'
import { ListboxContent, ListboxItem, ListboxItemIndicator, ListboxRoot } from 'reka-ui'
import { Check, Trash2 } from '@lucide/vue'

import BottomSheet from './BottomSheet.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import type { SimklStatus } from '@/api/simkl-types'
import { BUCKETS, bucketsFor } from '@/library/browse'
import type { MediaType } from '@/library/item'
import type { Change } from '@/library/ops'

const props = defineProps<{ type: MediaType; status: SimklStatus; title: string }>()
const emit = defineEmits<{ change: [change: Change] }>()
const isOpen = defineModel<boolean>('open', { required: true })

const isConfirming = ref(false)

const options = computed(() => {
  const { primary, archive } = bucketsFor(props.type)
  return [...primary, ...archive].map((bucket) => BUCKETS[bucket])
})

function pick(status: unknown) {
  if (status && status !== props.status) {
    emit('change', { kind: 'status', to: status as SimklStatus })
  }
  isOpen.value = false
}

function remove() {
  isOpen.value = false
  emit('change', { kind: 'remove' })
}
</script>

<template>
  <BottomSheet
    v-model:open="isOpen"
    title="Library status"
    :description="`Move or remove ${title}.`"
    close-label="Close"
    fit
  >
    <div class="status">
      <p class="muted">{{ title }}</p>
      <!-- A listbox, not radios: the arrow keys must not save each option they pass. -->
      <ListboxRoot :model-value="status" @update:model-value="pick">
        <ListboxContent class="card-list" aria-label="Status">
          <ListboxItem
            v-for="option in options"
            :key="option.status"
            class="status__option"
            :value="option.status"
          >
            {{ option.label }}
            <ListboxItemIndicator>
              <Check :size="18" aria-hidden="true" />
            </ListboxItemIndicator>
          </ListboxItem>
        </ListboxContent>
      </ListboxRoot>

      <button type="button" class="button button--danger-outline" @click="isConfirming = true">
        <Trash2 :size="16" aria-hidden="true" />Remove from library
      </button>
      <ConfirmDialog
        v-model:open="isConfirming"
        title="Remove from library?"
        :description="`Simkl also deletes the watch history and rating of ${title}.`"
        action="Remove"
        @confirm="remove"
      />
    </div>
  </BottomSheet>
</template>

<!-- Not scoped: the sheet and the dialog are rendered in <body>. -->
<style>
.status {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5) calc(var(--space-6) + env(safe-area-inset-bottom));
}

.status__option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 3.25rem;
  padding: 0 var(--space-4);
  cursor: pointer;
}

.status__option + .status__option {
  border-top: 1px solid var(--color-border-subtle);
}

.status__option[data-highlighted] {
  background: var(--color-surface-sunken);
}

.status__option[data-state='checked'] {
  background: var(--color-wash);
  color: var(--color-on-wash);
  font-weight: var(--weight-semibold);
}
</style>
