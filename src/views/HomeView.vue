<script setup lang="ts">
import { computed, ref } from 'vue'

import ContinueWatching from '@/components/ContinueWatching.vue'
import ErrorNote from '@/components/ErrorNote.vue'
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
</script>

<template>
  <main v-if="auth.status === 'signedIn'" class="page home">
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
  </main>

  <main v-else class="page guest">
    <h1>Bingit</h1>
    <p>Track it. Binge it. Sync it.</p>
    <p class="muted">
      A free, open-source tracker for movies, TV shows and anime. Your watchlist, history and
      ratings stay in your Simkl account.
    </p>
    <ErrorNote v-if="auth.error" :message="auth.error" @retry="auth.signIn" />
    <button
      v-if="auth.status === 'signedOut'"
      type="button"
      class="button action"
      @click="auth.signIn"
    >
      Sign in with Simkl
    </button>
    <MostWatched v-if="auth.status === 'signedOut'" is-guest />
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

.home__recent {
  display: none;
}

.guest {
  max-width: var(--content-max);
}

@media (min-width: 64rem) {
  .home {
    max-width: var(--content-max);
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
