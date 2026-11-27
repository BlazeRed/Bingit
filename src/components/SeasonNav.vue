<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { RouterLink } from 'vue-router'
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import { Check } from '@lucide/vue'

export interface SeasonCard {
  /** The title of an anime season, or the number of a TV season. */
  id: number
  number: number
  year: number | null
  isDone: boolean
}

const props = defineProps<{
  seasons: SeasonCard[]
  current: number
  /** Anime: each season is its own title, with its own page. */
  linked?: boolean
}>()
const emit = defineEmits<{ select: [id: number] }>()

/** A second press on the selected season sends nothing. */
function select(id: unknown) {
  if (typeof id === 'number') emit('select', id)
}

// `replace`: "back" leaves the series, not the last season looked at.
const itemProps = (id: number) =>
  props.linked
    ? {
        replace: true,
        to: { name: 'title', params: { type: 'anime', id } },
        'aria-current': id === props.current ? ('page' as const) : undefined,
      }
    : { value: id }

// A late season starts out of view.
const nav = useTemplateRef('nav')
onMounted(() =>
  nav.value
    ?.querySelector('[aria-current], [data-state="on"]')
    ?.scrollIntoView?.({ block: 'nearest', inline: 'center' }),
)
</script>

<template>
  <nav ref="nav" aria-label="Seasons">
    <component
      :is="linked ? 'div' : ToggleGroupRoot"
      class="seasons"
      v-bind="linked ? {} : { type: 'single', modelValue: current, 'onUpdate:modelValue': select }"
    >
      <component
        :is="linked ? RouterLink : ToggleGroupItem"
        v-for="season in seasons"
        :key="season.id"
        class="season"
        v-bind="itemProps(season.id)"
      >
        <span class="season__name">
          Season {{ season.number }}
          <template v-if="season.isDone">
            <Check :size="16" aria-hidden="true" />
            <span class="visually-hidden">seen</span>
          </template>
        </span>
        <span class="season__year">{{ season.year ?? 'TBA' }}</span>
      </component>
    </component>
  </nav>
</template>

<!-- Not scoped: Reka and the router render these elements. -->
<style>
.seasons {
  /* Keeps the hidden "seen" texts in the row. Without it, those of the cards
     out of view widen the page, and the navigation bar with it. */
  position: relative;
  display: flex;
  gap: var(--space-2);
  margin: 0 calc(-1 * var(--space-5));
  padding: 2px var(--space-5);
  overflow-x: auto;
  scrollbar-width: none;
}

.season {
  display: flex;
  flex: none;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  min-height: 3.25rem;
  padding: var(--space-1) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-text);
  text-decoration: none;
  cursor: pointer;
}

.season[aria-current],
.season[data-state='on'] {
  border-color: var(--color-action);
  background: var(--color-action);
  color: var(--color-on-action);
}

.season__name {
  display: flex;
  gap: var(--space-1);
  align-items: center;
  font-weight: var(--weight-semibold);
}

.season__year {
  font-size: var(--text-xs);
}
</style>
