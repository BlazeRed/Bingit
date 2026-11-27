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

defineProps<{
  title: string
  description: string
  closeLabel: string
  /** As tall as its content, not the usual tall sheet. */
  fit?: boolean
  /** A wider dialog on desktop. */
  wide?: boolean
}>()
const isOpen = defineModel<boolean>('open', { required: true })
</script>

<template>
  <DrawerRoot v-model:open="isOpen">
    <DrawerPortal>
      <DrawerOverlay class="sheet-overlay" />
      <DrawerContent class="sheet" :class="{ 'sheet--fit': fit, 'sheet--wide': wide }">
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

.sheet--fit {
  height: auto;
  max-height: 85dvh;
  overflow-y: auto;
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

/* Desktop: a dialog in the middle of the window. */
@media (min-width: 64rem) {
  .sheet {
    top: 50%;
    bottom: auto;
    max-width: 36rem;
    height: min(85dvh, 44rem);
    border-radius: var(--radius-xl);
    translate: 0 -50%;
    /* No swipe to follow with a mouse. */
    transform: none;
    animation: sheet-fade var(--duration-base) var(--ease-out);
  }

  .sheet:not(.sheet--fit) {
    overflow: hidden;
  }

  .sheet--wide {
    max-width: 56rem;
  }

  .sheet--fit {
    height: auto;
  }

  .sheet[data-state='closed'] {
    animation: dialog-out var(--duration-base) var(--ease-out) forwards;
  }

  /* Its own name: the dialog waits for it before it leaves the page. */
  @keyframes dialog-out {
    to {
      opacity: 0;
    }
  }
}
</style>
