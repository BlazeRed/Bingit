<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'

import AppNav from '@/components/AppNav.vue'
import WriteFailures from '@/components/WriteFailures.vue'
import { useAuthStore } from '@/stores/auth'
import { useLibraryStore } from '@/stores/library'

const auth = useAuthStore()
const library = useLibraryStore()
const route = useRoute()
const router = useRouter()

watch(
  () => auth.status,
  (status) => {
    // Changes saved while offline go out before the first check.
    if (status === 'signedIn') void library.sync().then(library.send)
    if (status === 'signedOut') library.reset()
  },
  { immediate: true },
)

// Pages with user data need a session.
watch(
  () => auth.status === 'signedOut' && route.meta.requiresAuth,
  (isBlocked) => {
    if (isBlocked) void router.replace({ name: 'home' })
  },
)

/** Check for changes when the user comes back to the tab (throttled by the engine). */
function syncOnReturn() {
  if (document.visibilityState === 'visible' && auth.status === 'signedIn') void library.sync()
}

function sendWhenOnline() {
  if (auth.status === 'signedIn') void library.send()
}

onMounted(() => {
  document.addEventListener('visibilitychange', syncOnReturn)
  window.addEventListener('online', sendWhenOnline)
})
onUnmounted(() => {
  document.removeEventListener('visibilitychange', syncOnReturn)
  window.removeEventListener('online', sendWhenOnline)
})
</script>

<template>
  <AppNav v-if="auth.status === 'signedIn'" />

  <WriteFailures v-if="auth.status === 'signedIn'" />

  <div :class="{ shell: auth.status === 'signedIn' }">
    <!-- A title page is rebuilt per title; other views keep their state. -->
    <RouterView v-slot="{ Component }">
      <component :is="Component" :key="route.name === 'title' ? route.path : route.name" />
    </RouterView>

    <!-- Attribution required by Simkl, TMDB and AniList terms. See docs/simkl-api-research.md -->
    <footer class="attribution">
      Movie, TV and anime data from <a href="https://simkl.com">Simkl</a>. Extra metadata from
      <a href="https://www.themoviedb.org">TMDB</a> and <a href="https://anilist.co">AniList</a>.
      This product uses the TMDB API but is not endorsed or certified by TMDB.
    </footer>
  </div>
</template>

<style scoped>
.shell {
  padding-bottom: calc(var(--nav-h) + env(safe-area-inset-bottom));
}

.attribution {
  padding: var(--space-4) var(--space-5);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

@media (min-width: 64rem) {
  .shell {
    padding: 0 0 0 var(--sidebar-w);
  }
}
</style>
