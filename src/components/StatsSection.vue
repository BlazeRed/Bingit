<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'

import { getUserStats } from '@/api/simkl'
import type { SimklStats } from '@/api/simkl-types'
import { SignedOutError } from '@/auth/session'
import { messageOf } from '@/lib/errors'
import { summarize } from '@/me/format'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const stats = shallowRef<SimklStats>()
const isLoading = ref(false)
const error = ref('')

const summary = computed(() => stats.value && summarize(stats.value))
const count = (value: number) => value.toLocaleString('en')

async function load() {
  if (!auth.account) return
  isLoading.value = true
  error.value = ''
  try {
    stats.value = await getUserStats(auth.account.id)
  } catch (cause) {
    if (cause instanceof SignedOutError) auth.expire(cause.message)
    else error.value = messageOf(cause)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <section>
    <h2>Your stats</h2>
    <div class="card">
      <template v-if="summary">
        <p>
          <span class="muted">Time watched</span>
          <strong class="total">{{ summary.total }}</strong>
        </p>
        <dl>
          <div>
            <dt>Movies</dt>
            <dd class="mono">{{ count(summary.movies) }}</dd>
          </div>
          <div>
            <dt>TV episodes</dt>
            <dd class="mono">{{ count(summary.tvEpisodes) }}</dd>
          </div>
          <div>
            <dt>Anime eps</dt>
            <dd class="mono">{{ count(summary.animeEpisodes) }}</dd>
          </div>
        </dl>
        <p class="muted">Last 7 days: {{ summary.lastWeek }}</p>
      </template>
      <template v-else>
        <p class="muted">
          Simkl calculates stats from your whole history each time, so they load only when you ask.
        </p>
        <button type="button" class="button" :disabled="isLoading || !auth.account" @click="load">
          {{ isLoading ? 'Loading…' : 'Load my stats' }}
        </button>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
      </template>
    </div>
  </section>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
}

.total {
  display: block;
  font-size: var(--text-2xl);
  line-height: var(--leading-tight);
}

dl {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
  margin: 0;
}

dl div {
  display: flex;
  flex-direction: column-reverse;
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  background: var(--color-surface-sunken);
}

dt {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

dd {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--weight-semibold);
}
</style>
