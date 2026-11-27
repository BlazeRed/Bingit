<script setup lang="ts">
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import { Check } from '@lucide/vue'

export interface ChoiceGroup {
  label?: string
  options: { value: string; label: string }[]
}

defineProps<{ groups: ChoiceGroup[]; label: string; columns?: 1 | 2 }>()
const model = defineModel<string>({ required: true })
/** Also sent for the option already chosen, so a sheet can close. */
const emit = defineEmits<{ pick: [] }>()

function select(value: unknown) {
  if (value) model.value = value as string
  emit('pick')
}
</script>

<template>
  <ToggleGroupRoot
    class="choices"
    type="single"
    orientation="vertical"
    :model-value="model"
    :aria-label="label"
    @update:model-value="select"
  >
    <div v-for="(group, index) in groups" :key="group.label ?? index" class="choices__group">
      <h3 v-if="group.label" class="muted">{{ group.label }}</h3>
      <div class="choices__options" :class="{ 'choices__options--two': columns === 2 }">
        <ToggleGroupItem
          v-for="option in group.options"
          :key="option.value"
          class="choices__item"
          :value="option.value"
        >
          {{ option.label }}
          <Check v-if="option.value === model" :size="16" aria-hidden="true" />
        </ToggleGroupItem>
      </div>
    </div>
  </ToggleGroupRoot>
</template>

<style scoped>
.choices {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.choices__group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.choices__options {
  display: grid;
  gap: var(--space-2);
}

.choices__options--two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.choices__item {
  display: flex;
  gap: var(--space-2);
  justify-content: space-between;
  align-items: center;
  min-height: var(--tap-min);
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  font-weight: var(--weight-medium);
  text-align: left;
  cursor: pointer;
}

.choices__item[data-state='on'] {
  border-color: var(--color-action);
  background: var(--color-action);
  color: var(--color-on-action);
}

svg {
  flex: none;
}
</style>
