<script setup lang="ts" generic="T extends string">
defineProps<{ options: Record<T, string>; label: string }>()
const model = defineModel<T>({ required: true })
</script>

<template>
  <div class="segmented" role="group" :aria-label="label">
    <button
      v-for="(text, value) in options"
      :key="value"
      type="button"
      :aria-pressed="model === value"
      @click="model = value as T"
    >
      {{ text }}
    </button>
  </div>
</template>

<style scoped>
.segmented {
  display: grid;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
  padding: 3px;
  border-radius: var(--radius-lg);
  background: var(--color-surface-sunken);
}

button {
  min-height: var(--control-h);
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-muted);
  font-weight: var(--weight-medium);
  cursor: pointer;
}

button[aria-pressed='true'] {
  background: var(--color-surface-raised);
  box-shadow: var(--shadow-raised);
  color: var(--color-text);
  font-weight: var(--weight-semibold);
}
</style>
