<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import EpisodeList from '@/components/EpisodeList.vue'
import PeopleList from '@/components/PeopleList.vue'
import RatingPicker from '@/components/RatingPicker.vue'
import StatusSelect from '@/components/StatusSelect.vue'
import ErrorNote from '@/components/ErrorNote.vue'
import { fanartUrl, posterUrl } from '@/api/images'
import { simklPageUrl } from '@/library/item'
import { useLibraryStore } from '@/stores/library'
import { ROUTE_TYPES, routeType } from '@/title/model'
import { useTitleActions } from '@/title/useTitleActions'
import { useTitleDetail } from '@/title/useTitleDetail'

// App.vue keys this view by path, so the params never change under it.
const route = useRoute()
const type = ROUTE_TYPES[routeType(String(route.params.type))]
const id = Number(route.params.id)

const library = useLibraryStore()
const { detail, seasons, cast, anime, error, warnings, load } = useTitleDetail(type, id)

const { item, subject, isMovie, watched, isHistoryUnknown, act } = useTitleActions(
  type,
  id,
  detail,
  seasons,
)

watch(detail, (loaded) => {
  if (loaded) document.title = `${loaded.title} · Bingit`
})

const facts = computed(() => {
  const d = detail.value
  if (!d) return ''
  const length = d.runtime && `${d.runtime} min`
  return [d.year, d.network, length].filter(Boolean).join(' · ')
})

const scores = computed(() => {
  const ratings = detail.value?.ratings ?? {}
  const sources = [
    ['Simkl', ratings.simkl],
    ['IMDb', ratings.imdb],
    ['MAL', ratings.mal],
  ] as const
  return sources
    .filter(([, score]) => score?.rating)
    .map(([name, score]) => `${name} ${score!.rating}`)
})

/** Some Simkl texts contain `<br>` tags. Shown as line breaks, never as HTML. */
const overview = computed(() => detail.value?.overview?.replace(/<br\s*\/?>/gi, '\n'))

const nextAiring = computed(() => {
  const next = anime.value?.nextAiring
  if (!next) return ''
  const when = new Date(next.airingAt * 1000).toLocaleString('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  return `Episode ${next.episode} airs ${when}`
})
</script>

<template>
  <main class="title">
    <ErrorNote v-if="error" :message="error" @retry="load" />
    <p v-else-if="!detail || !subject" role="status">Loading…</p>

    <template v-else>
      <img
        v-if="detail.fanart"
        class="title__art"
        :src="fanartUrl(detail.fanart)"
        alt=""
        width="960"
        height="540"
      />

      <header class="title__header">
        <img
          v-if="detail.poster"
          class="title__poster"
          :src="posterUrl(detail.poster, '_ca')"
          alt=""
          width="190"
          height="279"
        />
        <div>
          <h1>{{ detail.title }}</h1>
          <p v-if="detail.en_title && detail.en_title !== detail.title" class="muted">
            {{ detail.en_title }}
          </p>
          <p class="muted mono">{{ facts }}</p>
          <p class="muted">{{ [...(detail.genres ?? []), ...scores].join(' · ') }}</p>
        </div>
      </header>

      <div class="title__actions">
        <StatusSelect :type="isMovie ? 'movies' : type" :status="item?.status" @change="act" />
        <button
          v-if="isMovie && item?.status !== 'completed'"
          type="button"
          class="button"
          @click="act({ kind: 'watch' })"
        >
          Mark watched
        </button>
        <span v-if="!isMovie && item" class="muted mono">
          {{ item.watchedCount }}/{{ item.totalCount }} episodes
        </span>
        <span v-if="library.pendingIds.has(id)" class="muted" role="status">
          Waiting to send…
        </span>
      </div>

      <RatingPicker
        :rating="item?.rating ?? null"
        @rate="(rating) => act({ kind: 'rate', rating })"
      />

      <p v-if="overview" class="title__overview">{{ overview }}</p>
      <p v-if="nextAiring" class="muted">{{ nextAiring }}</p>
      <p v-for="warning in warnings" :key="warning" class="muted" role="status">
        {{ warning }}
      </p>

      <template v-if="!isMovie && seasons.length">
        <p v-if="isHistoryUnknown" class="muted">
          Watched episodes of dropped titles are not synced.
        </p>
        <EpisodeList
          :seasons="seasons"
          :watched="watched"
          @watch="(episodes) => act({ kind: 'watch', episodes })"
          @unwatch="(episodes) => act({ kind: 'unwatch', episodes })"
        />
      </template>

      <PeopleList v-if="cast.length" title="Cast · TMDB" :people="cast" profile="person" />
      <PeopleList
        v-if="anime?.characters.length"
        title="Characters and voice actors"
        :people="anime.characters"
        profile="staff"
      />
      <PeopleList v-if="anime?.staff.length" title="Staff" :people="anime.staff" profile="staff" />

      <section v-if="anime?.relations.length">
        <h2>Related</h2>
        <ul class="links">
          <li v-for="related in anime.relations" :key="related.id">
            <RouterLink
              v-if="related.isAnime"
              :to="{ name: 'find', params: { source: 'anilist', id: related.id } }"
            >
              {{ related.title }}
            </RouterLink>
            <a v-else :href="related.url" target="_blank" rel="noopener">
              {{ related.title }}
            </a>
            <span class="muted">{{ related.relation }}</span>
          </li>
        </ul>
      </section>

      <section v-if="detail.trailers?.length">
        <h2>Trailers</h2>
        <ul class="links">
          <li v-for="trailer in detail.trailers.slice(0, 4)" :key="trailer.youtube">
            <a
              :href="`https://www.youtube.com/watch?v=${encodeURIComponent(trailer.youtube)}`"
              target="_blank"
              rel="noopener"
            >
              {{ trailer.name || 'Trailer' }}
            </a>
            <span class="muted">YouTube</span>
          </li>
        </ul>
      </section>

      <section v-if="detail.users_recommendations?.length">
        <h2>Similar titles</h2>
        <ul class="links">
          <li v-for="other in detail.users_recommendations.slice(0, 8)" :key="other.ids.simkl">
            <RouterLink
              :to="{
                name: 'title',
                params: { type: routeType(other.type), id: other.ids.simkl },
              }"
            >
              {{ other.title }}
            </RouterLink>
            <span class="muted mono">{{ other.year }}</span>
          </li>
        </ul>
      </section>

      <p>
        <a :href="simklPageUrl(subject)" target="_blank" rel="noopener">View on Simkl →</a>
      </p>
      <p v-if="anime" class="muted">
        Anime data from <a href="https://anilist.co" target="_blank" rel="noopener">AniList</a>
      </p>
    </template>
  </main>
</template>

<style scoped>
.title {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-width: 48rem;
  padding: var(--space-6) var(--space-5);
}

.title__art {
  width: 100%;
  height: 12rem;
  border-radius: var(--radius-xl);
  object-fit: cover;
}

.title__header {
  display: flex;
  gap: var(--space-4);
  align-items: flex-start;
}

.title__poster {
  flex: none;
  width: 6rem;
  height: auto;
  border-radius: var(--radius-lg);
}

h1 {
  font-size: var(--text-xl);
}

h2 {
  margin-bottom: var(--space-3);
  font-size: var(--text-md);
}

.title__overview {
  white-space: pre-line;
}

.muted {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.error {
  color: var(--color-danger);
}

.title__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
}

.links {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.links li {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: baseline;
}
</style>
