<script setup lang="ts">
import { ExternalLink, LogOut } from '@lucide/vue'
import { ref, watch } from 'vue'

import { version } from '../../package.json'
import BackupSection from '@/components/BackupSection.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import InstallSection from '@/components/InstallSection.vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import StatsSection from '@/components/StatsSection.vue'
import SyncSection from '@/components/SyncSection.vue'
import { applyTheme, readTheme, THEMES, type Theme } from '@/lib/theme'
import { initials, plural } from '@/me/format'
import { useAuthStore } from '@/stores/auth'
import { useLibraryStore } from '@/stores/library'

const auth = useAuthStore()
const library = useLibraryStore()

const theme = ref<Theme>(readTheme())
watch(theme, applyTheme)

const isConfirming = ref(false)
function signOut() {
  if (library.pending.length) isConfirming.value = true
  else void auth.signOut()
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
          class="action-link"
          :href="`https://simkl.com/${auth.account.id}/`"
          target="_blank"
          rel="noopener"
        >
          <ExternalLink :size="16" aria-hidden="true" />View profile on Simkl
        </a>
      </div>
    </header>

    <StatsSection />

    <section>
      <h2>Appearance</h2>
      <SegmentedControl v-model="theme" :options="THEMES" label="Theme" />
    </section>

    <InstallSection />
    <SyncSection />
    <BackupSection />

    <section>
      <h2>About</h2>
      <div class="card-list">
        <div class="row row--stack">
          <p class="row__text">
            <strong
              >Bingit <span class="mono">{{ version }}</span></strong
            >
            <span class="muted">
              Free and open source (<a
                href="https://github.com/BlazeRed/Bingit"
                target="_blank"
                rel="noopener"
                >GPL-3.0</a
              >)
            </span>
          </p>
        </div>
        <div class="row row--stack">
          <a class="me__tmdb" href="https://www.themoviedb.org" target="_blank" rel="noopener">
            <img src="/tmdb.svg" alt="The Movie Database (TMDB)" width="123" height="16" />
          </a>
          <p class="muted">
            Data from <a href="https://simkl.com">Simkl</a>,
            <a href="https://www.themoviedb.org">TMDB</a> and
            <a href="https://anilist.co">AniList</a>. This product uses the TMDB API but is not
            endorsed or certified by TMDB.
          </p>
        </div>
      </div>
    </section>

    <button type="button" class="button button--danger-outline" @click="signOut">
      <LogOut :size="16" aria-hidden="true" />Sign out
    </button>
    <ConfirmDialog
      v-model:open="isConfirming"
      title="Sign out?"
      :description="`${plural(library.pending.length, 'change')} not sent to Simkl yet will be lost.`"
      action="Sign out"
      @confirm="auth.signOut()"
    />
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

.me__tmdb {
  align-self: flex-start;
}

@media (min-width: 64rem) {
  .me {
    display: block;
    max-width: var(--content-max);
    columns: 2;
    column-gap: var(--space-6);
  }

  .me > * {
    break-inside: avoid;
    margin-bottom: var(--space-6);
  }

  .me > header {
    column-span: all;
  }
}
</style>

<!-- Shared by the sections of this page. -->
<style>
.me section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* One line of a card: text, then a control or an icon. */
.me .row {
  display: flex;
  gap: var(--space-3);
  justify-content: space-between;
  align-items: center;
  min-height: 3.5rem;
  padding: var(--space-3) var(--space-4);
}

.me .row + .row {
  border-top: 1px solid var(--color-border-subtle);
}

/* A title with its explanation under it. */
.me .row__text {
  display: flex;
  flex-direction: column;
}

.me .row strong {
  font-weight: var(--weight-medium);
}

.me .row--stack {
  flex-direction: column;
  gap: var(--space-2);
  align-items: stretch;
  justify-content: center;
}

/* The whole row is the control. */
.me .row--button {
  width: 100%;
  border-width: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.me .row--button:hover {
  background: var(--color-surface-sunken);
}

.me .row--button:disabled {
  opacity: 0.5;
  cursor: default;
}

/* Inside the card, which clips an outer outline. */
.me .row--button:focus-visible,
.me .row--button:focus-within {
  outline: 2px solid var(--color-focus);
  outline-offset: -2px;
}

.me .row > .action-link {
  flex: none;
}

.me .row > svg {
  flex: none;
  color: var(--color-link);
}
</style>
