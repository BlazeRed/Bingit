<script setup lang="ts">
import { RatingItem, RatingItemIndicator, RatingRoot } from 'reka-ui'
import { Star } from '@lucide/vue'

defineProps<{ rating: number | null }>()
const emit = defineEmits<{ rate: [rating: number | null] }>()
</script>

<template>
  <div class="rating">
    <p class="rating__label">
      <strong>Your rating</strong>
      <span class="muted mono">{{ rating === null ? 'Tap to rate' : `${rating}/10` }}</span>
    </p>
    <!-- Five stars with halves: the 1 to 10 scale of Simkl. `clearable`: tap again to remove. -->
    <RatingRoot
      v-slot="{ items }"
      class="rating__stars"
      aria-label="Your rating"
      :model-value="(rating ?? 0) / 2"
      :step="0.5"
      clearable
      @update:model-value="(stars) => emit('rate', stars ? Number(stars) * 2 : null)"
    >
      <RatingItem
        v-for="item in items"
        :key="item"
        v-slot="{ steps }"
        as="span"
        class="rating__item"
        :item="item"
      >
        <RatingItemIndicator
          v-for="step in steps"
          :key="step"
          as="button"
          :step="step"
          class="rating__step"
          :aria-label="`Rate ${step * 2} out of 10`"
        >
          <span class="rating__star">
            <Star :size="32" :stroke-width="1.5" aria-hidden="true" />
          </span>
        </RatingItemIndicator>
      </RatingItem>
    </RatingRoot>
  </div>
</template>

<style scoped>
.rating {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-3);
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-4);
}

.rating__label {
  display: flex;
  flex-direction: column;
}

.rating__stars {
  display: flex;
}

/* `:deep`: Reka renders these elements, so the scope of this component does not reach them. */
.rating__stars :deep(.rating__item) {
  position: relative;
  width: 2.25rem;
  height: var(--tap-min);
}

/* The halves of a star lie on top of each other; the narrower one is above. */
.rating__stars :deep(.rating__step) {
  position: absolute;
  inset: 0 auto 0 0;
  z-index: var(--reka-rating-item-step-z-index);
  display: flex;
  align-items: center;
  width: var(--reka-rating-item-step-width);
  padding: 0;
  overflow: hidden;
  border: 0;
  background: transparent;
  color: var(--color-progress);
  opacity: var(--reka-rating-item-step-opacity);
  cursor: pointer;
}

.rating__stars :deep(.rating__star) {
  display: grid;
  flex: none;
  place-items: center;
  width: 2.25rem;
}

.rating__stars :deep([data-state='active'] svg) {
  fill: currentColor;
}
</style>
