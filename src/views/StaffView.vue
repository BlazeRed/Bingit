<script setup lang="ts">
import { useRoute } from 'vue-router'

import { getStaff } from '@/api/people'
import ProfilePage from '@/components/ProfilePage.vue'
import { useAsync } from '@/composables/useAsync'

// App.vue keys this view by path.
const id = String(useRoute().params.id)
const { data, error } = useAsync(() => id, getStaff)
</script>

<template>
  <ProfilePage
    :profile="data"
    :error="error"
    source="AniList"
    :source-url="`https://anilist.co/staff/${id}`"
  />
</template>
