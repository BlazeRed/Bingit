<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue'

import BottomSheet from './BottomSheet.vue'
import ChoiceList, { type ChoiceGroup } from './ChoiceList.vue'
import SearchField from './SearchField.vue'

/** A button that shows the chosen value and opens the choices in a bottom sheet. */
const props = defineProps<{
  groups: ChoiceGroup[]
  label: string
  title: string
  icon: Component
  /** Set it to add a text filter, for long lists. */
  searchLabel?: string
}>()
const model = defineModel<string>({ required: true })

const isOpen = ref(false)
const search = ref('')
watch(isOpen, () => (search.value = ''))

const chosen = computed(
  () => props.groups.flatMap((g) => g.options).find((o) => o.value === model.value)?.label,
)
const matches = computed(() => {
  const needle = search.value.trim().toLocaleLowerCase()
  return props.groups.map((group) => ({
    ...group,
    options: group.options.filter((o) => o.label.toLocaleLowerCase().includes(needle)),
  }))
})
</script>

<template>
  <button type="button" class="filter" aria-haspopup="dialog" @click="isOpen = true">
    <span class="filter__icon"><component :is="icon" :size="18" aria-hidden="true" /></span>
    <span class="filter__text">
      <span class="filter__label">{{ label }}</span>
      <span class="filter__value">{{ chosen ?? '…' }}</span>
    </span>
  </button>

  <BottomSheet
    v-model:open="isOpen"
    :title="title"
    :description="`Choose the ${title.toLocaleLowerCase()} of the titles shown.`"
    close-label="Close"
    :fit="!searchLabel"
  >
    <div v-if="searchLabel" class="filter-sheet__search">
      <SearchField v-model="search" :aria-label="searchLabel" :placeholder="searchLabel" />
    </div>
    <div class="filter-sheet__list">
      <ChoiceList
        v-model="model"
        :groups="matches"
        :label="title"
        :columns="searchLabel ? 2 : 1"
        @pick="isOpen = false"
      />
    </div>
  </BottomSheet>
</template>

<style scoped>
.filter {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  min-width: 0;
  min-height: 3.5rem;
  padding: 0 var(--space-3);
  border: 0;
  border-radius: var(--radius-lg);
  background: var(--color-highlight);
  color: var(--color-on-highlight);
  text-align: left;
  cursor: pointer;
}

.filter__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--radius-full);
  background: var(--color-surface);
}

.filter__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: var(--leading-snug);
}

.filter__label {
  font-size: var(--text-xs);
}

.filter__value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: var(--weight-semibold);
}

.filter-sheet__search {
  margin: var(--space-3) var(--space-5) 0;
}

.filter-sheet__list {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: var(--space-4) var(--space-5) calc(var(--space-5) + env(safe-area-inset-bottom));
}
</style>
