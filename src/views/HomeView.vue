<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useLibraryStore } from '@/stores/library'

const auth = useAuthStore()
const library = useLibraryStore()

function signOut() {
  const unsent = library.pending.length
  const question = `${unsent} changes are not sent to Simkl yet. Sign out and lose them?`
  if (!unsent || confirm(question)) void auth.signOut()
}
</script>

<template>
  <main class="home">
    <h1>Bingit</h1>
    <p>Track it. Binge it. Sync it.</p>

    <p v-if="auth.error" class="error" role="alert">{{ auth.error }}</p>

    <template v-if="auth.status === 'signedIn'">
      <p v-if="auth.userName">Signed in as {{ auth.userName }}.</p>
      <button type="button" class="button" @click="signOut">Sign out</button>
    </template>
    <button
      v-else-if="auth.status === 'signedOut'"
      type="button"
      class="button"
      @click="auth.signIn"
    >
      Sign in with Simkl
    </button>
  </main>
</template>

<style scoped>
.home {
  display: grid;
  justify-items: start;
  gap: var(--space-4);
  padding: var(--space-8) var(--space-5);
}

.error {
  color: var(--color-danger);
}
</style>
