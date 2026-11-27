<script setup lang="ts">
import {
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerOverlay,
  DrawerPortal,
  DrawerRoot,
  DrawerTitle,
} from 'reka-ui'
import { X } from '@lucide/vue'

defineProps<{ title: string; description: string; closeLabel: string }>()
const isOpen = defineModel<boolean>('open', { required: true })
</script>

<template>
  <DrawerRoot v-model:open="isOpen">
    <DrawerPortal>
      <DrawerOverlay class="sheet-overlay" />
      <DrawerContent class="sheet">
        <header class="sheet__header">
          <DrawerTitle class="sheet__title">{{ title }}</DrawerTitle>
          <slot name="actions" />
          <DrawerClose class="icon-button" :aria-label="closeLabel">
            <X :size="20" aria-hidden="true" />
          </DrawerClose>
        </header>
        <DrawerDescription class="visually-hidden">{{ description }}</DrawerDescription>
        <slot />
      </DrawerContent>
    </DrawerPortal>
  </DrawerRoot>
</template>

<!-- Not scoped: the sheet is rendered outside this component, in <body>. -->
<style>
.sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 3;
  background: rgb(0 0 0 / 0.45);
  animation: sheet-fade var(--duration-base) var(--ease-out);
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
  /* The drawer sets this variable while the user swipes it down. */
  transform: translateY(var(--drawer-swipe-movement-y, 0));
  transition: transform var(--duration-base) var(--ease-out);
  animation: sheet-in var(--duration-base) var(--ease-out);
}

.sheet[data-swiping] {
  transition: none;
}

.sheet[data-state='closed'] {
  animation: sheet-out var(--duration-base) var(--ease-out) forwards;
}

.sheet-overlay[data-state='closed'] {
  animation: sheet-fade var(--duration-base) var(--ease-out) reverse forwards;
}

.sheet__header {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-3) var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

.sheet__title {
  margin-right: auto;
  font-size: var(--text-lg);
}

@keyframes sheet-in {
  from {
    transform: translateY(100%);
  }
}

@keyframes sheet-out {
  to {
    transform: translateY(100%);
  }
}

@keyframes sheet-fade {
  from {
    opacity: 0;
  }
}
</style>
