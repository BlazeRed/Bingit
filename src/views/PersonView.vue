<script setup lang="ts">
import { useRoute } from 'vue-router'

import { getPerson } from '@/api/people'
import ProfilePage from '@/components/ProfilePage.vue'
import { useAsync } from '@/composables/useAsync'

// App.vue keys this view by path.
const id = String(useRoute().params.id)
const { data, error } = useAsync(() => id, getPerson)
</script>

<template>
  <ProfilePage
    :profile="data"
    :error="error"
    source="TMDB"
    :source-url="`https://www.themoviedb.org/person/${id}`"
  />
</template>
