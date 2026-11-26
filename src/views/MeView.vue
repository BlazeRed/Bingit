<script setup lang="ts">
import { ref, watch } from 'vue'

import { version } from '../../package.json'
import BackupSection from '@/components/BackupSection.vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import StatsSection from '@/components/StatsSection.vue'
import SyncSection from '@/components/SyncSection.vue'
import { applyTheme, readTheme, THEMES, type Theme } from '@/lib/theme'
import { initials } from '@/me/format'
import { useAuthStore } from '@/stores/auth'
import { useLibraryStore } from '@/stores/library'

const auth = useAuthStore()
const library = useLibraryStore()

const theme = ref<Theme>(readTheme())
watch(theme, applyTheme)

function signOut() {
  const unsent = library.pending.length
  const question = `${unsent} changes are not sent to Simkl yet. Sign out and lose them?`
  if (!unsent || confirm(question)) void auth.signOut()
}
</script>

<template>
  <main class="page me">
    <header>
      <span class="avatar me__avatar" aria-hidden="true">{{ initials(auth.userName) }}</span>
      <div>
        <h1>{{ auth.userName || 'Me' }}</h1>
        <a
          v-if="auth.account"
          :href="`https://simkl.com/${auth.account.id}/`"
          target="_blank"
          rel="noopener"
        >
          View profile on Simkl →
        </a>
      </div>
    </header>

    <StatsSection />

    <section>
      <h2>Appearance</h2>
      <SegmentedControl v-model="theme" :options="THEMES" label="Theme" />
    </section>

    <SyncSection />
    <BackupSection />

    <section>
      <h2>About</h2>
      <p class="muted">
        Bingit <span class="mono">{{ version }}</span> · free and open source (<a
          href="https://github.com/BlazeRed/Bingit"
          target="_blank"
          rel="noopener"
          >GPL-3.0</a
        >)<br />
        Data from <a href="https://simkl.com">Simkl</a>,
        <a href="https://www.themoviedb.org">TMDB</a> and <a href="https://anilist.co">AniList</a>.
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </p>
    </section>

    <button type="button" class="field me__signout" @click="signOut">Sign out</button>
  </main>
</template>

<style scoped>
.me {
  gap: var(--space-6);
}

header {
  display: flex;
  gap: var(--space-4);
  align-items: center;
}

.me__avatar {
  width: 3.5rem;
  height: 3.5rem;
  font-size: var(--text-lg);
}

.me__signout {
  min-height: var(--tap-min);
  color: var(--color-danger);
  font-weight: var(--weight-semibold);
  cursor: pointer;
}
</style>

<!-- Shared by the sections of this page. -->
<style>
.me section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.me .card {
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
}
</style>
