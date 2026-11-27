<script setup lang="ts" generic="T extends string">
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'

defineProps<{ options: Record<T, string>; label: string }>()
const model = defineModel<T>({ required: true })

/** A second press on the selected option sends nothing: one option stays selected. */
function select(value: unknown) {
  if (value) model.value = value as T
}
</script>

<template>
  <ToggleGroupRoot
    class="segmented"
    type="single"
    :model-value="model"
    :aria-label="label"
    @update:model-value="select"
  >
    <ToggleGroupItem v-for="(text, value) in options" :key="value" :value="value">
      {{ text }}
    </ToggleGroupItem>
  </ToggleGroupRoot>
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

button[data-state='on'] {
  background: var(--color-action);
  box-shadow: var(--shadow-raised);
  color: var(--color-on-action);
  font-weight: var(--weight-semibold);
}
</style>
