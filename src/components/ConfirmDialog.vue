<script setup lang="ts">
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
} from 'reka-ui'

/** Asks before an action that loses data. */
defineProps<{ title: string; description: string; action: string }>()
const emit = defineEmits<{ confirm: [] }>()
const isOpen = defineModel<boolean>('open', { required: true })

// There is no Reka trigger, so give the focus back to the button that opened the dialog.
let opener: HTMLElement | null = null
const remember = () => (opener = document.activeElement as HTMLElement | null)
</script>

<template>
  <AlertDialogRoot v-model:open="isOpen">
    <AlertDialogPortal>
      <AlertDialogOverlay class="confirm-overlay" />
      <AlertDialogContent
        class="confirm"
        @open-auto-focus="remember"
        @close-auto-focus="opener?.focus()"
      >
        <AlertDialogTitle class="confirm__title">{{ title }}</AlertDialogTitle>
        <AlertDialogDescription class="muted">{{ description }}</AlertDialogDescription>
        <div class="confirm__actions">
          <AlertDialogCancel class="button button--secondary">Cancel</AlertDialogCancel>
          <AlertDialogAction class="button button--danger" @click="emit('confirm')">
            {{ action }}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>

<!-- Not scoped: the dialog is rendered in <body>. -->
<style>
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
