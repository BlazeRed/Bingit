<script setup lang="ts">
import BottomSheet from './BottomSheet.vue'
import CalendarList from './CalendarList.vue'
import type { MediaType } from '@/library/item'

defineProps<{ initialType: MediaType }>()
const isOpen = defineModel<boolean>('open', { required: true })
</script>

<template>
  <BottomSheet
    v-model:open="isOpen"
    title="Calendar"
    description="Upcoming episodes and movie releases."
    close-label="Close calendar"
  >
    <CalendarList :initial-type="initialType" />
  </BottomSheet>
</template>
