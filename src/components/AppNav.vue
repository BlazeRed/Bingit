<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Bookmark, LibraryBig, Search, User } from '@lucide/vue'

import AppLogo from './AppLogo.vue'
import { initials, timeAgo } from '@/me/format'
import { useAuthStore } from '@/stores/auth'
import { useLibraryStore } from '@/stores/library'

const library = useLibraryStore()
const auth = useAuthStore()
</script>

<template>
  <nav class="nav" aria-label="Main">
    <p class="nav__brand"><AppLogo />Bingit</p>
    <RouterLink class="nav__link" :to="{ name: 'home' }">
      <Bookmark :size="22" aria-hidden="true" />Up next
    </RouterLink>
    <RouterLink class="nav__link" :to="{ name: 'library' }">
      <LibraryBig :size="22" aria-hidden="true" />Library
    </RouterLink>
    <RouterLink class="nav__link" :to="{ name: 'search' }">
      <Search :size="22" aria-hidden="true" />Search
    </RouterLink>
    <RouterLink class="nav__link" :to="{ name: 'me' }">
      <User :size="22" aria-hidden="true" />Me
    </RouterLink>

    <RouterLink v-if="auth.userName" class="nav__user" :to="{ name: 'me' }">
      <span class="avatar" aria-hidden="true">{{ initials(auth.userName) }}</span>
      <span>
        {{ auth.userName }}
        <span v-if="library.checkedAt" class="nav__synced mono">
          Synced {{ timeAgo(library.checkedAt) }}
        </span>
      </span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.nav {
  position: fixed;
  inset: auto 0 0;
  z-index: 1;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  padding-bottom: env(safe-area-inset-bottom);
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
}

.nav__brand,
.nav__user {
  display: none;
}

.nav__link {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  justify-content: center;
  align-items: center;
  height: var(--nav-h);
  color: var(--color-text-muted);
  font-size: var(--text-2xs);
  font-weight: var(--weight-medium);
  text-decoration: none;
}

.nav__link.router-link-active {
  color: var(--color-action);
}

@media (min-width: 64rem) {
  .nav {
    inset: 0 auto 0 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    width: var(--sidebar-w);
    padding: var(--space-6) var(--space-3);
    border-top: 0;
    border-right: 1px solid var(--color-border);
  }

  .nav__brand {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    margin-bottom: var(--space-5);
    padding: 0 var(--space-3);
    font-size: var(--text-lg);
    font-weight: var(--weight-title);
  }

  .nav__brand svg {
    width: 2rem;
    height: 2rem;
  }

  .nav__link {
    flex-direction: row;
    justify-content: flex-start;
    gap: var(--space-3);
    height: var(--control-h);
    padding: 0 var(--space-3);
    border-radius: var(--radius-md);
    color: var(--color-text);
    font-size: var(--text-base);
  }

  .nav__link.router-link-active {
    background: var(--color-wash);
    color: var(--color-on-wash);
  }

  .nav__user {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    margin-top: auto;
    padding: var(--space-3);
    border-radius: var(--radius-lg);
    background: var(--color-surface-sunken);
    color: var(--color-text);
    font-size: var(--text-sm);
    text-decoration: none;
  }

  .nav__synced {
    display: block;
    font-size: var(--text-2xs);
    color: var(--color-text-muted);
  }
}
</style>
