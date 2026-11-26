# Bingit — project plan

Free, open-source (GPL-3.0) web app to track movies, TV shows and anime on top of Simkl. Static SPA, no own backend, hosted on Netlify free tier. English only.

API facts and limits: see [simkl-api-research.md](./simkl-api-research.md). Technical architecture: [ARCHITECTURE.md](./ARCHITECTURE.md).

## 1. Decisions

| Topic | Decision |
|---|---|
| Scope | Movies, TV, anime — all three from v1 |
| Framework | Vue 3.5 + Vite + TypeScript |
| UI primitives | Reka UI (headless) |
| Styling | Own design tokens as CSS custom properties + scoped CSS in SFCs. No Tailwind, no "Reka Industrial" style |
| Icons | Lucide (`lucide-vue-next`) |
| Routing | vue-router, HTML5 history |
| State | Pinia |
| Persistence | IndexedDB via `idb-keyval` |
| Simkl client | small typed `fetch` wrapper + hand-written types for the endpoints used |
| Simkl auth | AUTH V2, auth code + PKCE, public client (no secret). Hand-written with Web Crypto |
| Extra metadata | TMDB API v3 for movies/TV (cast, crew, people, backdrops, logos, videos, watch providers) + AniList GraphQL for anime (characters, voice actors, staff, relations, airing countdown) — both from day one |
| Tests | Vitest + Vue Test Utils (logic first: sync engine, PKCE, write queue) |
| Lint/format | ESLint flat config (`eslint-plugin-vue`, `typescript-eslint`) + Prettier |
| Tooling | npm, Node 24 LTS |
| Hosting/CI | Netlify (build from `main`), GitHub Actions for lint + typecheck + test |
| i18n | None. English strings inline |
| License | GPL-3.0 |
| Later | PWA (`vite-plugin-pwa`), Playwright e2e, TanStack Query if caching gets complex |

## 2. Architecture

```
Browser (SPA)
 ├─ UI (Vue + Reka UI + tokens)
 ├─ Pinia stores ── library / auth / ui
 ├─ Sync engine ── activities gate → delta pull → IndexedDB
 ├─ Write queue ── batched POSTs, 1 req/s, optimistic updates
 ├─ Simkl client ─→ api.simkl.com (CORS)        [user data, catalog]
 │                └→ data.simkl.in (static JSON) [trending, calendar]
 ├─ TMDB client  ─→ api.themoviedb.org          [cast, people, art, videos]
 ├─ AniList      ─→ graphql.anilist.co          [anime characters, staff, relations]
 └─ Images       ─→ wsrv.nl ← simkl.in / image.tmdb.org
```

### Source layout (initial, grows only when needed)

```
src/
  main.ts  App.vue  router.ts
  styles/        tokens.css, base.css
  api/           simkl.ts, simkl-types.ts, tmdb.ts, anilist.ts, images.ts
  auth/          pkce.ts, session.ts
  sync/          engine.ts, write-queue.ts
  stores/        auth.ts, library.ts
  components/    shared UI built on Reka UI
  views/         one file per route
```

## 3. Data layer

### Auth
1. Generate `code_verifier` + S256 `code_challenge`, store verifier + `state` in `sessionStorage`.
2. Redirect to `https://simkl.com/oauth/authorize` (V2) with `client_id`, `redirect_uri`, `scope=media:read media:write`, PKCE params.
3. `/callback` route checks `state`, exchanges code at token endpoint.
4. Keep `access_token` (7 d) in memory only; store `refresh_token` (180 d sliding) in IndexedDB and refresh on each app load.
5. Refresh on 401 or before expiry. Sign-out → revoke endpoint + wipe IndexedDB.
- Redirect URIs to register: `http://localhost/callback` (Simkl ignores the port for loopback addresses), `https://<site>.netlify.app/callback` (+ custom domain later). Deploy previews: login unsupported unless URL registered.

### Sync engine (quota is 500 req/day on Simkl Free)
- On sign-in: snapshot `/sync/activities` → pull `/sync/all-items/{shows,movies,anime}` sequentially → store items + snapshot in IndexedDB.
- On app start / tab focus (min interval ~5 min): 1 call to `/sync/activities`; if `all` unchanged → done. Else pull only moved buckets with `date_from`.
- Deletions: periodic `extended=simkl_ids_only` diff (e.g. once a day).
- Episode-level data (`extended=full`, `episode_watched_at=yes`) fetched lazily per show on detail page, not in bulk.
- Budget target: typical session < 20 user-data requests.

### Writes
- Every action (status change, mark watched, rate) → optimistic update in store → enqueue.
- Queue merges pending items per endpoint into one array POST, sends max 1 POST/s, retries with backoff on 429/5xx, rolls back + toast on hard failure.
- Queue is persisted in IndexedDB, so marks made offline are sent when back online.

### Catalog
- `GET /movies|tv|anime/{id}` and episode lists: free + edge-cached → no `Authorization` header, parallel OK.
- Trending + calendar: static JSON from `data.simkl.in`.
- Search: sequential, debounced (≥ 400 ms, min 2 chars).
- `/users/{id}/stats`: only when user opens Stats page.

### TMDB
- Map via `ids.tmdb` from Simkl records; skip TMDB sections when missing (common for anime).
- Used for: cast/crew, person pages, backdrops/logos, videos, watch providers.
- Auth: TMDB v4 read access token in client build (public by nature in an SPA; can be regenerated if abused). Netlify Function proxy is the upgrade path if needed.
- Attribution: TMDB logo + "This product uses the TMDB API but is not endorsed or certified by TMDB." Watch providers require JustWatch attribution.

### AniList
- GraphQL at `https://graphql.anilist.co`, no key for public reads, CORS enabled. Free for non-commercial use.
- Map via `ids.anilist` from Simkl anime records.
- Used for: characters + voice actors, staff, studios, relations (prequel/sequel/side story), tags, banner image, next-episode airing countdown, recommendations.
- Limit 90 req/min (may drop to 30 when degraded) → one query per detail page, cache responses in IndexedDB (e.g. 24 h).
- Source priority for anime: AniList first, TMDB fills gaps. Movies/TV: TMDB only.
- Attribution: "Anime data from AniList" with link on anime detail pages.

### Config
- `.env` (not committed) / Netlify env: `VITE_SIMKL_CLIENT_ID`, `VITE_TMDB_TOKEN`, `VITE_APP_VERSION`. `.env.example` committed so forks register their own keys.

## 4. Features (v1)

| Route | Content |
|---|---|
| `/` (signed out) | Landing: what it is, sign in with Simkl, trending on Simkl |
| `/` (signed in) | Up next: continue watching (`next_to_watch`), new episodes this week (calendar ∩ library), most watched on Simkl this week |
| `/library/:type?/:status?` | Library by type × status, sort, filter, grid/list, local search |
| `/movie/:id`, `/tv/:id`, `/anime/:id` | Detail: art, info, ratings, status picker, rating, mark watched, seasons/episodes with per-episode toggles, cast (TMDB) or characters/staff/relations (AniList for anime), trailers, similar, "View on Simkl" |
| `/person/:tmdbId` | TMDB person + credits, linked to Simkl items where mapped |
| `/staff/:anilistId` | AniList staff / voice actor + roles, linked to Simkl items where mapped |
| `/search` | Text search across types |
| `/discover` | Trending, best, premieres, airing, genres |
| `/calendar` | Upcoming episodes / releases, filter "my shows" |
| `/stats` | User stats (on demand) |
| `/me` | Profile, stats on demand, theme, sync status + quota, export (JSON, CSV), restore from Bingit JSON, clear local data, about, sign out |
| `/callback` | OAuth return |

Later (PRO/VIP-gated on Simkl): custom lists, favorites, rewatches. Shown only when the account supports them.

## 5. Non-functional

- **Accessibility:** Reka UI primitives, keyboard navigation, visible focus, WCAG AA contrast in both themes, `prefers-reduced-motion`.
- **Performance:** route-level code splitting, `loading="lazy"` images with fixed aspect ratio (no CLS), right poster size per context, virtualized long lists only if needed.
- **Security:** strict CSP in `netlify.toml` (`connect-src` limited to Simkl, TMDB, AniList, wsrv; `img-src` to image hosts), no `v-html` on API text, `state` check in OAuth.
- **Attribution:** Simkl links on cards/details + footer; trending titles name Simkl; TMDB notice in footer/about; AniList credit on anime pages.
- **Themes:** light + dark via tokens, follows system by default.

## 6. Netlify

`netlify.toml`:
- build `npm run build`, publish `dist`
- SPA fallback `/* /index.html 200`
- security headers (CSP, `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy`)
- long cache on `/assets/*` (hashed)

## 7. Milestones

| # | Milestone | Done when |
|---|---|---|
| M0 | Scaffold | Vite+Vue+TS, lint, test, CI, `netlify.toml`, LICENSE, README; deploys blank page |
| D | Design | Tokens (color, type, spacing, radius, elevation, motion), component inventory, wireframes for Home, Library, Detail |
| M1 | Auth + clients | Sign in/out works on localhost and Netlify; typed Simkl + TMDB + AniList clients |
| M2 | Sync + Library | Initial + delta sync into IndexedDB; Library view |
| M3 | Detail + actions | Detail pages, write queue, status/rating/episode toggles |
| M4 | Discover | Search, Discover, Calendar, Person |
| M5 | Home + polish | Up next, Me (stats, settings, export + restore), a11y pass, empty/error states |
| M6 | Extras | PWA, PRO features, importers (IMDb, Letterboxd, Trakt, MAL), e2e tests |

## 8. Design decisions (in progress)

Mocks: https://claude.ai/artifact/JEtasoiffwbezLvff3tG9m (page "Calm palettes").

- Mobile-first, usable on desktop. Tracking-first, not browse-first.
- Core flow: search → add to Watchlist; mark episode / season / "up to here"; rating 1–10.
- Nav: Up next · Library · Search · Me. Library = category (Movies / TV / Anime) × bucket (Watchlist / Watching / Seen); Paused + Dropped secondary. Movies have no Watching bucket.
- Style: "Calm" — light + dark themes, list-first, small artwork; detail page gets a backdrop band.
- Palette: "Combination" — mulberry #4B1D3F (light-mode action), apricot #F4A988 (dark-mode action, next-episode/rating highlight), velvet rose #C97B84 (progress, status). Neutrals tinted toward mulberry.
- Font: Geist (UI) + Geist Mono (episode codes, runtimes, ratings), self-hosted via `@fontsource-variable` (no Google Fonts request).
- Tokens: `src/styles/tokens.css` (semantic color, type, spacing, radius, sizes, motion; light + dark).
- Up next = home screen: Continue watching (`next_to_watch`, one-tap ✓), New this week (calendar ∩ my shows), "Most watched on Simkl this week" (trending files, Movies/TV/Anime, quick + Watchlist). Trending files are free and don't use the daily quota.
- Me: profile + link to Simkl, export (Bingit JSON + CSV) and restore from Bingit JSON (details: ARCHITECTURE.md §13), stats on demand ("Load my stats" — expensive call), theme System/Light/Dark, sync status + Sync now, Simkl requests used today (from `X-RateLimit-*` headers), clear local data, about/attribution, sign out.
- Desktop (≥ ~1024px): left sidebar replaces bottom nav (+ Library category shortcuts with counts), search in top bar (`/` shortcut). Library = table rows + detail side panel (master-detail). Up next = 3-col continue-watching cards, 6-col most-watched grid, right column for new episodes + recently added.

## 9. Open items

- App name / domain (repo is "Bingit").
- Register Simkl app (V2, "Mobile, desktop & browser apps") and TMDB key — owner: you.

## 10. Data sources considered and skipped

| Source | Why skipped |
|---|---|
| Jikan (unofficial MAL) | Overlaps AniList; Simkl already returns MAL scores; scraper-based |
| TVmaze | Overlaps TMDB + Simkl calendar. Revisit if airtimes are unreliable |
| TheTVDB v4 | Paid key |
| OMDb | RT/Metacritic scores nice-to-have; key would be public. Maybe later |
| Fanart.tv | TMDB has logos. Maybe later |
