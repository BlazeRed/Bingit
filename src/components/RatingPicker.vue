<script setup lang="ts">
defineProps<{ rating: number | null }>()
const emit = defineEmits<{ rate: [rating: number | null] }>()
</script>

<template>
  <div class="rating" role="group" aria-labelledby="rating-label">
    <p id="rating-label" class="rating__label">
      Your rating
      <span class="mono">{{ rating === null ? 'not rated' : `${rating}/10` }}</span>
    </p>
    <button
      v-for="n in 10"
      :key="n"
      type="button"
      class="mono"
      :class="{ 'rating--below': rating !== null && n < rating }"
      :aria-pressed="n === rating"
      :aria-label="`Rate ${n} out of 10`"
      @click="emit('rate', n)"
    >
      {{ n }}
    </button>
    <button v-if="rating !== null" type="button" class="rating__clear" @click="emit('rate', null)">
      Clear
    </button>
  </div>
</template>

<style scoped>
.rating {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 2.5rem));
  gap: var(--space-1);
}

button {
  padding: 0;
  min-height: var(--control-h);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;
}

.rating--below {
  border-color: var(--color-highlight);
  background: var(--color-highlight);
  color: var(--color-on-highlight);
}

button[aria-pressed='true'] {
  border-color: var(--color-action);
  background: var(--color-action);
  color: var(--color-on-action);
}

.rating__label {
  grid-column: 1 / -1;
  margin-bottom: var(--space-1);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.rating__clear {
  grid-column: 1 / -1;
  justify-self: start;
  padding: 0 var(--space-3);
  font-size: var(--text-sm);
}
</style>
