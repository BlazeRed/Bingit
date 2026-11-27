<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'

import AddedToast from '@/components/AddedToast.vue'
import AppNav from '@/components/AppNav.vue'
import AppUpdate from '@/components/AppUpdate.vue'
import SearchBar from '@/components/SearchBar.vue'
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
  trackOnline()
  if (auth.status === 'signedIn') void library.send()
}

/** The signed-out home page fills the screen. */
const isLanding = computed(() => route.name === 'home' && auth.status !== 'signedIn')

const isOnline = ref(navigator.onLine)
const trackOnline = () => (isOnline.value = navigator.onLine)

// Keyboard and screen reader users start at the new page, not on the old link.
const content = useTemplateRef('content')
watch(
  () => route.name,
  async (_name, previous) => {
    if (previous === undefined) return
    await nextTick()
    content.value?.focus({ preventScroll: true })
  },
)

async function goToSearch() {
  await router.push({ name: 'search', query: route.name === 'search' ? route.query : {} })
  await nextTick()
  document.getElementById('search-input')?.focus()
}

/** `/` jumps to search, unless the user is typing. */
function onSlash(event: KeyboardEvent) {
  const target = event.target as HTMLElement
  const isTyping = target.closest('input, textarea, select') !== null
  if (event.key !== '/' || isTyping || auth.status !== 'signedIn') return
  event.preventDefault()
  void goToSearch()
}

onMounted(() => {
  window.addEventListener('keydown', onSlash)
  document.addEventListener('visibilitychange', syncOnReturn)
  window.addEventListener('online', sendWhenOnline)
  window.addEventListener('offline', trackOnline)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onSlash)
  document.removeEventListener('visibilitychange', syncOnReturn)
  window.removeEventListener('online', sendWhenOnline)
  window.removeEventListener('offline', trackOnline)
})
</script>

<template>
  <a class="skip" href="#content" @click.prevent="content?.focus()">Skip to content</a>
  <AppNav v-if="auth.status === 'signedIn'" />

  <WriteFailures v-if="auth.status === 'signedIn'" />
  <AddedToast v-if="auth.status === 'signedIn'" />
  <AppUpdate />

  <div class="frame" :class="{ shell: auth.status === 'signedIn', landing: isLanding }">
    <SearchBar v-if="auth.status === 'signedIn' && route.name !== 'search'" @open="goToSearch" />

    <p v-if="!isOnline" class="offline" role="status">
      You are offline. Changes are saved and sent later.
    </p>

    <div id="content" ref="content" tabindex="-1">
      <!-- Detail pages are rebuilt per title or person; other views keep their state. -->
      <RouterView v-slot="{ Component }">
        <!-- Search keeps its filters and results while a title is open. -->
        <KeepAlive :include="auth.status === 'signedIn' ? ['SearchView'] : []">
          <component :is="Component" :key="route.meta.perPath ? route.path : route.name" />
        </KeepAlive>
      </RouterView>
    </div>

    <!-- Attribution required by Simkl, TMDB and AniList terms. See docs/simkl-api-research.md.
         The Me page shows it in its About card. -->
    <footer v-if="route.name !== 'me'" class="attribution">
      Movie, TV and anime data from <a href="https://simkl.com">Simkl</a>. Extra metadata from
      <a href="https://www.themoviedb.org">TMDB</a> and <a href="https://anilist.co">AniList</a>.
      This product uses the TMDB API but is not endorsed or certified by TMDB.
    </footer>
  </div>
</template>

<style scoped>
.skip {
  position: absolute;
  top: var(--space-2);
  left: var(--space-2);
  z-index: 5;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-action);
  color: var(--color-on-action);
}

.skip:not(:focus) {
  transform: translateY(-200%);
}

#content:focus {
  outline: none;
}

.offline {
  padding: var(--space-2) var(--space-5);
  background: var(--color-highlight);
  color: var(--color-on-highlight);
  font-size: var(--text-sm);
}

/* The attribution ends the page, also when the content is short. It scrolls with it. */
.frame {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

#content {
  flex: 1;
}

.shell {
  padding-bottom: calc(var(--nav-h) + env(safe-area-inset-bottom));
}

.attribution {
  padding: var(--space-4) var(--space-5);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.landing {
  background: linear-gradient(
    160deg,
    color-mix(in srgb, var(--brand-velvet-rose) 28%, var(--color-bg)),
    color-mix(in srgb, var(--brand-apricot) 12%, var(--color-bg)) 30%,
    var(--color-bg) 60%
  );
}

.landing #content {
  display: flex;
  flex-direction: column;
}

.landing .attribution {
  width: 100%;
  max-width: var(--content-max);
  margin-inline: auto;
}

@media (min-width: 64rem) {
  .shell {
    padding: 0 0 0 var(--sidebar-w);
  }
}
</style>
