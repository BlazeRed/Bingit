<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { Check, ChevronLeft, Ellipsis, ExternalLink, Play, Plus } from '@lucide/vue'

import EpisodeList from '@/components/EpisodeList.vue'
import ErrorNote from '@/components/ErrorNote.vue'
import LibraryStatusSheet from '@/components/LibraryStatusSheet.vue'
import PeopleList from '@/components/PeopleList.vue'
import PosterGrid, { type PosterCard } from '@/components/PosterGrid.vue'
import RatingPicker from '@/components/RatingPicker.vue'
import SeasonNav, { type SeasonCard } from '@/components/SeasonNav.vue'
import WatchProviders from '@/components/WatchProviders.vue'
import { posterUrl } from '@/api/images'
import { BUCKETS } from '@/library/browse'
import type { Episodes } from '@/library/episodes'
import { simklPageUrl } from '@/library/item'
import { plural } from '@/me/format'
import { useLibraryStore } from '@/stores/library'
import {
  currentSeason,
  nextEpisode,
  relationTag,
  ROUTE_TYPES,
  routeType,
  sameStory,
  seasonProgress,
} from '@/title/model'
import { useTitleActions } from '@/title/useTitleActions'
import { useTitleDetail } from '@/title/useTitleDetail'

// App.vue keys this view by path, so the params never change under it.
const route = useRoute()
const type = ROUTE_TYPES[routeType(String(route.params.type))]
const id = Number(route.params.id)

const library = useLibraryStore()
const { detail, seasons, cast, anime, watchOptions, chain, error, warnings, load } = useTitleDetail(
  type,
  id,
)

const { item, subject, isMovie, watched, isHistoryUnknown, act } = useTitleActions(
  type,
  id,
  detail,
  seasons,
)

/** English first; the original title goes under it. */
const name = computed(() => detail.value?.en_title || detail.value?.title)
const originalName = computed(() =>
  detail.value?.title === name.value ? undefined : detail.value?.title,
)

watch(name, (loaded) => {
  if (loaded) document.title = `${loaded} · Bingit`
})

const router = useRouter()

/** Back to where the user came from; a direct visit goes to the Library. */
function goBack() {
  if (window.history.state?.back) router.back()
  else void router.push({ name: 'library' })
}

const isStatusOpen = ref(false)
const statusLabel = computed(
  () => Object.values(BUCKETS).find((b) => b.status === item.value?.status)?.label,
)

const formatDate = (date?: string | null) =>
  date ? new Date(date).toLocaleDateString('en', { dateStyle: 'medium' }) : undefined

const facts = computed(() => {
  const d = detail.value
  if (!d) return ''
  const runtime = d.runtime && `${d.runtime} min`
  if (isMovie.value) {
    return [formatDate(d.released ?? d.first_aired) ?? d.year, runtime].filter(Boolean).join(' · ')
  }
  const count = seasons.value.length
  const parts =
    type === 'anime'
      ? [d.season_name_year || d.year, d.total_episodes && `${d.total_episodes} eps`]
      : [d.year, count && plural(count, 'season')]
  return [...parts, runtime].filter(Boolean).join(' · ')
})

const pad = (n: number) => String(n).padStart(2, '0')

/** AniList knows the hour of anime episodes; Simkl dates cover the TV shows. */
const nextAiring = computed(() => {
  const fromAniList = anime.value?.nextAiring
  const next = nextEpisode(seasons.value)
  if (!fromAniList && !next) return ''
  const code = fromAniList
    ? `E${pad(fromAniList.episode)}`
    : `S${pad(next!.season)}E${pad(next!.episode)}`
  const date = fromAniList ? new Date(fromAniList.airingAt * 1000) : next!.date
  const when = date.toLocaleString('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${code} airs ${when}`
})

const scores = computed(() => {
  const ratings = detail.value?.ratings ?? {}
  return (
    [
      ['Simkl', ratings.simkl],
      ['IMDb', ratings.imdb],
      ['MAL', ratings.mal],
    ] as const
  ).flatMap(([source, score]) => (score?.rating ? [{ source, value: score.rating }] : []))
})

const hasEpisodes = computed(() => !isMovie.value && seasons.value.length > 0)

/** A started series opens on its episodes. The choice stays in the URL for "back". */
const tab = computed({
  get: () => {
    const allowed = hasEpisodes.value ? ['episodes', 'info', 'related'] : ['info', 'related']
    const chosen = String(route.query.tab)
    if (allowed.includes(chosen)) return chosen
    return hasEpisodes.value && item.value?.watchedCount ? 'episodes' : 'info'
  },
  set: (value) => void router.replace({ query: { ...route.query, tab: value } }),
})
const TABS = { episodes: 'Episodes', info: 'Info', related: 'Related' }
const tabs = computed(() =>
  Object.entries(TABS).filter(([key]) => key !== 'episodes' || hasEpisodes.value),
)

/** A TV show holds its seasons; the page shows one of them. */
const pickedSeason = ref<number>()
const shownSeason = computed(
  () => pickedSeason.value ?? currentSeason(seasons.value, watched.value),
)

function pickSeason(number: number) {
  pickedSeason.value = number
  tab.value = 'episodes'
}

function mark(change: { kind: 'watch' | 'unwatch'; episodes: Episodes }) {
  // The page stays on this season, also after its last episode.
  pickedSeason.value = shownSeason.value
  act(change)
}

/** One row for both: linked titles for anime, the seasons of the show for TV. */
const seasonCards = computed<SeasonCard[]>(() => {
  if (type === 'anime') {
    return chain.value.map((season, index) => ({
      ...season,
      number: index + 1,
      isDone: library.byId[season.id]?.status === 'completed',
    }))
  }
  if (seasons.value.length < 2) return []
  return seasons.value.map((season) => {
    const aired = season.episodes[0]?.date
    const progress = seasonProgress(season, watched.value)
    return {
      id: season.number,
      number: season.number,
      year: aired ? new Date(aired).getFullYear() : null,
      isDone: progress.watched === progress.total,
    }
  })
})

const progress = computed(() => {
  if (isMovie.value || !item.value) return null
  const { watchedCount, totalCount } = item.value
  const whole = `${watchedCount}/${totalCount}`
  const season =
    type === 'tv' && seasons.value.length > 1
      ? seasons.value.find((s) => s.number === shownSeason.value)
      : undefined
  const part = season
    ? seasonProgress(season, watched.value)
    : { watched: watchedCount, total: totalCount }
  return {
    percent: part.total ? Math.min(100, (part.watched / part.total) * 100) : 0,
    label: season
      ? `Season ${season.number}: ${part.watched}/${part.total} · Total ${whole}`
      : `${whole} episodes`,
  }
})

/** Some Simkl texts contain `<br>` tags. Shown as line breaks, never as HTML. */
const overview = computed(() => detail.value?.overview?.replace(/<br\s*\/?>/gi, '\n'))
const isExpanded = ref(false)
// ponytail: guesses from the length whether three lines cut the text; measure if it misfires.
const isLong = computed(() => (overview.value?.length ?? 0) > 150)

const details = computed(() => {
  const d = detail.value
  const status = d?.status && (d.status === 'tba' ? 'To be announced' : capitalize(d.status))
  return [
    ['Genres', d?.genres?.join(', ')],
    ['Status', status],
    ['Network', d?.network],
    ['Studio', d?.studios?.map((studio) => studio.name).join(', ')],
    [isMovie.value ? 'Released' : 'First aired', formatDate(d?.released ?? d?.first_aired)],
  ].filter((row): row is [string, string] => Boolean(row[1]))
})

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

const story = computed<PosterCard[]>(() =>
  (detail.value ? sameStory(detail.value, chain.value) : []).map((r) => ({
    id: r.ids.simkl,
    type: 'anime',
    title: r.en_title || r.title,
    year: r.year,
    poster: r.poster,
    tag: relationTag(r),
  })),
)

const similar = computed<PosterCard[]>(() =>
  (detail.value?.users_recommendations ?? [])
    .slice(0, 12)
    .map(({ ids, type, title, year, poster }) => ({ id: ids.simkl, type, title, year, poster })),
)
</script>

<template>
  <main class="title">
    <div class="title__bar">
      <button type="button" class="icon-button title__back" aria-label="Back" @click="goBack">
        <ChevronLeft :size="22" aria-hidden="true" />
      </button>
      <div v-if="item" class="title__menu">
        <p class="title__status">
          <span class="visually-hidden">Library status:</span> {{ statusLabel }}
        </p>
        <button
          type="button"
          class="icon-button"
          aria-label="Library options"
          aria-haspopup="dialog"
          @click="isStatusOpen = true"
        >
          <Ellipsis :size="22" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div v-if="error || !detail || !subject" class="title__body">
      <ErrorNote v-if="error" :message="error" @retry="load" />
      <p v-else role="status">Loading…</p>
    </div>

    <div v-else class="title__body">
      <header class="title__header">
        <img
          v-if="detail.poster"
          class="title__poster"
          :src="posterUrl(detail.poster, '_ca')"
          alt=""
          width="190"
          height="279"
        />
        <span v-else class="title__poster" />
        <div class="title__heading">
          <h1>{{ name }}</h1>
          <p v-if="originalName" class="muted">{{ originalName }}</p>
          <p class="muted mono">{{ facts }}</p>
          <p v-if="nextAiring" class="title__next">{{ nextAiring }}</p>
          <ul v-if="detail.genres?.length" class="title__genres" aria-label="Genres">
            <li v-for="genre in detail.genres.slice(0, 3)" :key="genre">{{ genre }}</li>
          </ul>
        </div>
      </header>

      <div v-if="seasonCards.length || progress" class="title__season">
        <SeasonNav
          v-if="seasonCards.length"
          :seasons="seasonCards"
          :current="type === 'anime' ? id : shownSeason!"
          :linked="type === 'anime'"
          @select="pickSeason"
        />
        <div v-if="progress" class="title__progress">
          <span class="title__track"><span :style="{ width: `${progress.percent}%` }" /></span>
          <span class="muted mono">{{ progress.label }}</span>
        </div>
      </div>

      <button
        v-if="!item"
        type="button"
        class="button title__action"
        @click="act({ kind: 'status', to: 'plantowatch' })"
      >
        <Plus :size="18" aria-hidden="true" />Add to Watchlist
      </button>
      <button
        v-if="isMovie && item?.status !== 'completed'"
        type="button"
        class="button title__action"
        :class="{ 'button--secondary': !item }"
        @click="act({ kind: 'watch' })"
      >
        <Check :size="18" aria-hidden="true" />Mark watched
      </button>

      <div class="title__ratings">
        <dl v-if="scores.length" class="title__scores">
          <div v-for="score in scores" :key="score.source">
            <dt>{{ score.source }}</dt>
            <dd class="mono">{{ score.value }}</dd>
          </div>
        </dl>
        <RatingPicker
          :rating="item?.rating ?? null"
          @rate="(rating) => act({ kind: 'rate', rating })"
        />
      </div>

      <p v-if="library.pendingIds.has(id)" class="muted" role="status">Waiting to send…</p>
      <p v-for="warning in warnings" :key="warning" class="muted" role="status">{{ warning }}</p>

      <TabsRoot v-model="tab" class="title__tabs">
        <TabsList class="tabs" aria-label="Title sections">
          <TabsTrigger v-for="[key, label] in tabs" :key="key" :value="key">
            {{ label }}
          </TabsTrigger>
        </TabsList>

        <TabsContent v-if="hasEpisodes" value="episodes" class="title__panel">
          <p v-if="isHistoryUnknown" class="muted">
            Watched episodes of dropped titles are not synced.
          </p>
          <EpisodeList
            :seasons="seasons"
            :watched="watched"
            :season="shownSeason"
            @watch="(episodes) => mark({ kind: 'watch', episodes })"
            @unwatch="(episodes) => mark({ kind: 'unwatch', episodes })"
          />
        </TabsContent>

        <TabsContent value="info" class="title__panel">
          <section v-if="overview">
            <h2>Overview</h2>
            <p class="title__overview" :class="{ 'title__overview--cut': isLong && !isExpanded }">
              {{ overview }}
            </p>
            <button
              v-if="isLong"
              type="button"
              class="action-link"
              :aria-expanded="isExpanded"
              @click="isExpanded = !isExpanded"
            >
              {{ isExpanded ? 'Less' : 'More' }}
            </button>
          </section>

          <WatchProviders v-if="watchOptions" :options="watchOptions" />

          <PeopleList v-if="cast.length" title="Cast · TMDB" :people="cast" profile="person" />
          <PeopleList
            v-if="anime?.characters.length"
            title="Characters and voice actors"
            :people="anime.characters"
            profile="staff"
          />
          <PeopleList
            v-if="anime?.staff.length"
            title="Staff"
            :people="anime.staff"
            profile="staff"
          />

          <section v-if="details.length">
            <h2>Details</h2>
            <dl class="title__details">
              <div v-for="[label, value] in details" :key="label">
                <dt>{{ label }}</dt>
                <dd>{{ value }}</dd>
              </div>
            </dl>
          </section>

          <section v-if="detail.trailers?.length">
            <h2>Trailers</h2>
            <ul class="title__trailers">
              <li v-for="trailer in detail.trailers.slice(0, 4)" :key="trailer.youtube">
                <a
                  :href="`https://www.youtube.com/watch?v=${encodeURIComponent(trailer.youtube)}`"
                  target="_blank"
                  rel="noopener"
                  :aria-label="`${trailer.name || 'Trailer'} on YouTube`"
                >
                  <img
                    :src="`https://i.ytimg.com/vi/${encodeURIComponent(trailer.youtube)}/mqdefault.jpg`"
                    alt=""
                    width="320"
                    height="180"
                    loading="lazy"
                  />
                  <Play :size="28" fill="currentColor" aria-hidden="true" />
                </a>
              </li>
            </ul>
          </section>

          <div>
            <a class="action-link" :href="simklPageUrl(subject)" target="_blank" rel="noopener">
              <ExternalLink :size="16" aria-hidden="true" />View on Simkl
            </a>
            <p v-if="anime" class="muted">
              Anime data from
              <a href="https://anilist.co" target="_blank" rel="noopener">AniList</a>
            </p>
          </div>
        </TabsContent>

        <TabsContent value="related" class="title__panel">
          <PosterGrid v-if="story.length" title="Same story" :cards="story" />
          <PosterGrid v-if="similar.length" title="Similar titles" :cards="similar" />
          <p v-if="!story.length && !similar.length" class="muted">No related title.</p>
        </TabsContent>
      </TabsRoot>

      <LibraryStatusSheet
        v-if="item"
        v-model:open="isStatusOpen"
        :type="isMovie ? 'movies' : type"
        :status="item.status"
        :title="name ?? item.title"
        @change="act"
      />
    </div>
  </main>
</template>

<style scoped>
.title {
  max-width: 48rem;
  padding-bottom: var(--space-6);
}

.title__bar {
  display: flex;
  justify-content: space-between;
  padding: max(var(--space-3), env(safe-area-inset-top)) var(--space-5) var(--space-3);
}

/* Optical centre: the arms of a chevron weigh more than its tip, so it looks pushed right. */
.title__back svg {
  translate: -1px 0;
}

.title__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: 0 var(--space-5);
}

.title__header {
  display: flex;
  gap: var(--space-4);
}

.title__poster {
  flex: none;
  width: 7rem;
  height: 10.5rem;
  border-radius: var(--radius-md);
  object-fit: cover;
  background: var(--color-surface-sunken);
}

.title__heading {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-1);
  min-width: 0;
}

h1 {
  font-size: var(--text-lg);
  overflow-wrap: anywhere;
}

h2 {
  margin-bottom: var(--space-3);
  font-size: var(--text-md);
}

.title__next {
  color: var(--color-on-highlight);
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
}

.title__genres {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin: var(--space-1) 0 0;
  padding: 0;
  list-style: none;
}

.title__genres li {
  padding: 2px var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  color: var(--color-text-muted);
  font-size: var(--text-xs);
}

.title__menu {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

/* Information only: the status changes from the "⋯" button beside it. */
.title__status {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--color-wash);
  color: var(--color-on-wash);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
}

.title__season {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* What others think and what you think, in one place. */
.title__ratings {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
}

.title__scores {
  display: grid;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
  margin: 0;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
  text-align: center;
}

.title__scores > div + div {
  border-left: 1px solid var(--color-border);
}

.title__scores dt {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
}

.title__scores dd {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--weight-semibold);
}

.title__action {
  display: inline-flex;
  gap: var(--space-2);
  justify-content: center;
  align-items: center;
}

.title__progress {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.title__track {
  height: 6px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--color-track);
}

.title__track span {
  display: block;
  height: 100%;
  background: var(--color-progress);
}

.title__tabs,
.title__panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

/* `hidden` must win over the flex layout. */
.title__panel[hidden] {
  display: none;
}

.title__overview {
  white-space: pre-line;
}

.title__overview--cut {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.title__details {
  margin: 0;
  padding: 0 var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
}

.title__details > div {
  display: flex;
  gap: var(--space-4);
  justify-content: space-between;
  padding: var(--space-3) 0;
}

.title__details > div + div {
  border-top: 1px solid var(--color-border-subtle);
}

.title__details dt {
  color: var(--color-text-muted);
}

.title__details dd {
  margin: 0;
  text-align: right;
}

.title__trailers {
  display: flex;
  gap: var(--space-3);
  margin: 0 calc(-1 * var(--space-5));
  padding: 2px var(--space-5);
  overflow-x: auto;
  list-style: none;
}

.title__trailers a {
  position: relative;
  display: grid;
  place-items: center;
  width: 11rem;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: var(--brand-mulberry);
  color: #fff;
}

.title__trailers img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.title__trailers svg {
  position: relative;
  filter: drop-shadow(0 1px 4px rgb(0 0 0 / 0.7));
}
</style>
