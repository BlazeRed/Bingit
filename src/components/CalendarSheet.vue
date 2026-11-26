<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { X } from '@lucide/vue'

import CalendarList from './CalendarList.vue'
import type { MediaType } from '@/library/item'

defineProps<{ initialType: MediaType }>()
const isOpen = defineModel<boolean>('open', { required: true })
</script>

<template>
  <DialogRoot v-model:open="isOpen">
    <DialogPortal>
      <DialogOverlay class="sheet-overlay" />
      <DialogContent class="sheet">
        <header class="sheet__header">
          <DialogTitle class="sheet__title">Calendar</DialogTitle>
          <DialogClose class="sheet__close" aria-label="Close calendar">
            <X :size="22" aria-hidden="true" />
          </DialogClose>
        </header>
        <DialogDescription class="visually-hidden">
          Upcoming episodes and movie releases.
        </DialogDescription>
        <div class="sheet__body">
          <CalendarList :initial-type="initialType" />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<!-- Not scoped: the sheet is rendered outside this component, in <body>. -->
<style>
.sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 3;
  background: rgb(0 0 0 / 0.45);
}

.sheet {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 4;
  display: flex;
  flex-direction: column;
  max-width: 40rem;
  height: 85dvh;
  margin-inline: auto;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  background: var(--color-bg);
  animation: sheet-in var(--duration-base) var(--ease-out);
}

.sheet__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

.sheet__title {
  font-size: var(--text-lg);
}

.sheet__close {
  display: grid;
  place-items: center;
  width: var(--tap-min);
  height: var(--tap-min);
  border: 0;
  border-radius: var(--radius-full);
  background: var(--color-surface-sunken);
  cursor: pointer;
}

.sheet__body {
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: var(--space-4) var(--space-5) calc(var(--space-6) + env(safe-area-inset-bottom));
}

@keyframes sheet-in {
  from {
    transform: translateY(100%);
  }
}
</style>
