<script setup lang="ts">
defineProps<{ message: string }>()
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="note" role="alert">
    <p class="error">{{ message }}</p>
    <button type="button" class="field" @click="emit('retry')">Try again</button>
  </div>
</template>

<style scoped>
.note {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
}

button {
  cursor: pointer;
}
</style>
