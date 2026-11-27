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
    <div class="guest__hero">
      <div class="guest__brand">
        <!-- public/icons/icon.svg, inline so that it follows the theme. -->
        <svg viewBox="0 0 512 512" aria-hidden="true">
          <rect class="logo-bg" width="512" height="512" rx="112" />
          <path class="logo-play" d="M196 140v184l152-92z" stroke-width="28" />
          <rect class="logo-track" x="136" y="368" width="240" height="24" rx="12" />
          <rect class="logo-bar" x="136" y="368" width="150" height="24" rx="12" />
        </svg>
        <h1>Bingit</h1>
      </div>
      <p class="guest__tagline">Track it. Binge it. Sync it.</p>
      <p class="muted">
        Free, open-source tracker for movies, TV and anime. Your data stays on Simkl.
      </p>
      <ErrorNote v-if="auth.error" :message="auth.error" @retry="auth.signIn" />
      <!-- Hidden, not removed, while the session is checked: nothing moves afterwards. -->
      <div class="guest__actions" :class="{ 'guest__actions--waiting': auth.status === 'loading' }">
        <button type="button" class="button" @click="auth.signIn">Sign in with Simkl</button>
        <p class="muted">
          No account?
          <a href="https://simkl.com" target="_blank" rel="noopener">Create one on Simkl</a>
        </p>
      </div>
    </div>
    <MostWatched is-guest />
  </main>
</template>

<style scoped>
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

/* Fills the screen: the posters sit at the bottom, the hero in the space above. */
.guest {
  flex: 1;
  gap: var(--space-6);
  width: 100%;
  max-width: var(--content-max);
  margin-inline: auto;
}

.guest__hero {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-3);
  justify-content: center;
}

.guest__brand {
  display: flex;
  gap: var(--space-4);
  align-items: center;
}

/* Scales with the name beside it. */
.guest__brand svg {
  flex: none;
  width: var(--text-hero);
  height: var(--text-hero);
}

.logo-bg {
  fill: var(--color-logo-bg);
}

.logo-play {
  fill: var(--color-logo-play);
  stroke: var(--color-logo-play);
  stroke-linejoin: round;
}

.logo-track {
  fill: var(--color-logo-track);
}

.logo-bar {
  fill: var(--color-logo-bar);
}

.guest .guest__hero h1 {
  font-size: var(--text-hero);
}

.guest__tagline {
  white-space: nowrap;
  font-size: var(--text-tagline);
  font-weight: var(--weight-title);
  line-height: var(--leading-snug);
  letter-spacing: var(--tracking-title);
}

.guest__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-3);
  text-align: center;
}

.guest__actions--waiting {
  visibility: hidden;
}

@media (min-width: 64rem) {
  .guest__actions {
    align-items: flex-start;
    text-align: start;
  }

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
