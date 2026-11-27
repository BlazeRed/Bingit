<script setup lang="ts">
import {
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectLabel,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui'
import { Check, ChevronDown } from '@lucide/vue'

export interface SelectGroupOptions {
  label?: string
  /** Reka does not accept an empty string as a value. */
  options: { value: string; label: string }[]
}

// Attributes (class, aria-label) belong to the trigger button.
defineOptions({ inheritAttrs: false })
defineProps<{ groups: SelectGroupOptions[]; placeholder?: string; disabled?: boolean }>()
const model = defineModel<string>({ required: true })
</script>

<template>
  <SelectRoot v-model="model" :disabled="disabled">
    <SelectTrigger class="select" v-bind="$attrs">
      <SelectValue class="select__value" :placeholder="placeholder" />
      <ChevronDown :size="16" aria-hidden="true" />
    </SelectTrigger>
    <SelectPortal>
      <SelectContent class="popup select__menu" position="popper" :side-offset="4">
        <SelectViewport>
          <SelectGroup v-for="(group, index) in groups" :key="group.label ?? index">
            <SelectLabel v-if="group.label" class="select__label">{{ group.label }}</SelectLabel>
            <SelectItem
              v-for="option in group.options"
              :key="option.value"
              class="select__item"
              :value="option.value"
            >
              <SelectItemText>{{ option.label }}</SelectItemText>
              <SelectItemIndicator>
                <Check :size="16" aria-hidden="true" />
              </SelectItemIndicator>
            </SelectItem>
          </SelectGroup>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>

<!-- Not scoped: the menu is rendered in <body>. -->
<style>
.select {
  display: inline-flex;
  gap: var(--space-2);
  justify-content: space-between;
  align-items: center;
  min-width: 0;
  min-height: var(--control-h);
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  font-size: var(--text-base);
  cursor: pointer;
}

.select[data-disabled] {
  opacity: 0.5;
  cursor: default;
}

.select__value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select svg {
  flex: none;
}

.select__menu {
  min-width: var(--reka-select-trigger-width);
  max-height: min(20rem, var(--reka-select-content-available-height));
  padding: var(--space-1);
}

.select__label {
  padding: var(--space-2) var(--space-3) var(--space-1);
  color: var(--color-text-muted);
  font-size: var(--text-xs);
}

.select__item {
  display: flex;
  gap: var(--space-4);
  justify-content: space-between;
  align-items: center;
  min-height: var(--control-h);
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  outline: none;
  cursor: pointer;
  user-select: none;
}

.select__item[data-highlighted] {
  background: var(--color-wash);
  color: var(--color-on-wash);
}

.select__item[data-state='checked'] {
  font-weight: var(--weight-semibold);
}
</style>
