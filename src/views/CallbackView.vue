<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

onMounted(async () => {
  const query = new URLSearchParams(location.search)
  await auth.completeSignIn(query)
  // Replace removes the one-time code from the address bar and history.
  await router.replace({ name: 'home' })
  // After a failed sign-in, show the previous state next to the error.
  if (auth.status === 'loading') await auth.restore()
})
</script>

<template>
  <main class="callback">
    <p role="status">Signing in…</p>
  </main>
</template>

<style scoped>
.callback {
  padding: var(--space-8) var(--space-5);
}
</style>
