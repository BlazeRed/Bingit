<script setup lang="ts">
import { Search } from '@lucide/vue'

// Reka UI has no plain text input: this is the native one, with an icon.
defineOptions({ inheritAttrs: false })
const model = defineModel<string>({ required: true })
</script>

<template>
  <div class="search">
    <Search :size="18" aria-hidden="true" />
    <input v-model="model" type="search" autocomplete="off" v-bind="$attrs" />
  </div>
</template>

<style scoped>
.search {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  padding-left: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-text-muted);
}

.search:focus-within {
  border-color: var(--color-focus);
  box-shadow: 0 0 0 1px var(--color-focus);
}

input {
  flex: 1;
  width: 100%;
  min-width: 0;
  min-height: var(--control-h);
  padding: 0 var(--space-3) 0 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--color-text);
}
</style>
