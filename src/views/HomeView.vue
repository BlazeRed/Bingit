<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Search } from '@lucide/vue'

import ContinueWatching from '@/components/ContinueWatching.vue'
import MostWatched from '@/components/MostWatched.vue'
import NewThisWeek from '@/components/NewThisWeek.vue'
import RecentlyAdded from '@/components/RecentlyAdded.vue'
import { inProgress } from '@/home/continue'
import { useAuthStore } from '@/stores/auth'
import { useLibraryStore } from '@/stores/library'

const auth = useAuthStore()
const library = useLibraryStore()
const newEpisodes = ref(0)

const summary = computed(() => {
  const count = inProgress(library.items).length
  const word = newEpisodes.value === 1 ? 'episode' : 'episodes'
  return `${count} in progress · ${newEpisodes.value} new ${word} this week`
})

function signOut() {
  const unsent = library.pending.length
  const question = `${unsent} changes are not sent to Simkl yet. Sign out and lose them?`
  if (!unsent || confirm(question)) void auth.signOut()
}
</script>

<template>
  <main v-if="auth.status === 'signedIn'" class="page home">
    <RouterLink class="home__search" :to="{ name: 'search' }">
      <Search :size="18" aria-hidden="true" />Search movies, TV, anime
      <kbd>/</kbd>
    </RouterLink>

    <header>
      <h1>Up next</h1>
      <p v-if="library.isImported" class="muted">{{ summary }}</p>
    </header>

    <p v-if="auth.error" class="error" role="alert">{{ auth.error }}</p>
    <p v-if="library.error" class="error" role="alert">{{ library.error }}</p>

    <div class="home__grid">
      <ContinueWatching class="home__continue" />
      <div class="home__side">
        <NewThisWeek @count="(count) => (newEpisodes = count)" />
        <RecentlyAdded class="home__recent" />
      </div>
      <MostWatched class="home__top" />
    </div>

    <!-- Moves to the Me page in M5. -->
    <p class="muted">
      <template v-if="auth.userName">Signed in as {{ auth.userName }}. </template>
      <button type="button" class="home__signout" @click="signOut">Sign out</button>
    </p>
  </main>

  <main v-else class="page">
    <h1>Bingit</h1>
    <p>Track it. Binge it. Sync it.</p>
    <p v-if="auth.error" class="error" role="alert">{{ auth.error }}</p>
    <button
      v-if="auth.status === 'signedOut'"
      type="button"
      class="button action"
      @click="auth.signIn"
    >
      Sign in with Simkl
    </button>
  </main>
</template>

<style scoped>
.action {
  align-self: flex-start;
}

.home {
  gap: var(--space-6);
}

.home__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-6);
}

.home__search,
.home__recent {
  display: none;
}

.home__signout {
  min-height: var(--tap-min);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-link);
  text-decoration: underline;
  cursor: pointer;
}

@media (min-width: 64rem) {
  .home {
    max-width: var(--content-max);
  }

  .home__search {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    max-width: 32rem;
    height: var(--control-h);
    padding: 0 var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    color: var(--color-text-muted);
    text-decoration: none;
  }

  .home__search kbd {
    margin-left: auto;
    font-size: var(--text-2xs);
  }

  .home__grid {
    grid-template-columns: minmax(0, 1fr) 20rem;
    grid-template-rows: auto 1fr;
    grid-template-areas:
      'continue side'
      'top side';
    column-gap: var(--space-7);
    align-items: start;
  }

  .home__continue {
    grid-area: continue;
  }

  .home__side {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    grid-area: side;
  }

  .home__top {
    grid-area: top;
  }

  .home__recent {
    display: flex;
  }
}
</style>
