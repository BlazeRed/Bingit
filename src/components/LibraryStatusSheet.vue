<script setup lang="ts">
import { computed } from 'vue'
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
  AlertDialogTrigger,
  ListboxContent,
  ListboxItem,
  ListboxItemIndicator,
  ListboxRoot,
} from 'reka-ui'
import { Check, Trash2 } from '@lucide/vue'

import BottomSheet from './BottomSheet.vue'
import type { SimklStatus } from '@/api/simkl-types'
import { BUCKETS, bucketsFor } from '@/library/browse'
import type { MediaType } from '@/library/item'
import type { Change } from '@/library/ops'

const props = defineProps<{ type: MediaType; status: SimklStatus; title: string }>()
const emit = defineEmits<{ change: [change: Change] }>()
const isOpen = defineModel<boolean>('open', { required: true })

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

      <AlertDialogRoot>
        <AlertDialogTrigger class="button button--danger-outline">
          <Trash2 :size="16" aria-hidden="true" />Remove from library
        </AlertDialogTrigger>
        <AlertDialogPortal>
          <AlertDialogOverlay class="confirm-overlay" />
          <AlertDialogContent class="confirm">
            <AlertDialogTitle class="confirm__title">Remove from library?</AlertDialogTitle>
            <AlertDialogDescription class="muted">
              Simkl also deletes the watch history and rating of {{ title }}.
            </AlertDialogDescription>
            <div class="confirm__actions">
              <AlertDialogCancel class="button button--secondary">Cancel</AlertDialogCancel>
              <AlertDialogAction class="button button--danger" @click="remove">
                Remove
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialogRoot>
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

.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 5;
  background: rgb(0 0 0 / 0.45);
}

.confirm {
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: 6;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: min(22rem, calc(100vw - 2 * var(--space-5)));
  padding: var(--space-5);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  transform: translate(-50%, -50%);
}

.confirm__title {
  font-size: var(--text-lg);
}

.confirm__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  margin-top: var(--space-2);
}
</style>
