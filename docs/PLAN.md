# Bingit — project plan

Free, open-source (GPL-3.0) web app to track movies, TV shows and anime on top of Simkl. Static SPA, hosted on Netlify free tier; the only server code is a TMDB proxy function. English only; anime use their English title.

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
| PWA | `vite-plugin-pwa`: installable, offline start (M6) |
| Later | Playwright e2e, TanStack Query if caching gets complex |

## 2. Architecture

```
Browser (SPA)
 ├─ UI (Vue + Reka UI + tokens)
 ├─ Pinia stores ── library / auth / ui
 ├─ Sync engine ── activities gate → delta pull → IndexedDB
 ├─ Write queue ── batched POSTs, 1 req/s, optimistic updates
 ├─ Simkl client ─→ api.simkl.com (CORS)        [user data, catalog]
 │                └→ data.simkl.in (static JSON) [trending, calendar]
 ├─ TMDB client  ─→ /api/tmdb (Netlify Function) ─→ api.themoviedb.org [cast, people, art, videos]
 ├─ AniList      ─→ graphql.anilist.co          [anime characters, staff, relations]
 └─ Images       ─→ wsrv.nl ← simkl.in / image.tmdb.org
```

### Source layout

```
src/
  main.ts  App.vue  router/
  styles/        tokens.css, base.css (shared page parts)
  api/           simkl, tmdb, anilist, catalog, discover, people, images
  auth/          pkce, session
  db/            capped response cache
  sync/          engine, write-queue
  stores/        auth, library
  library/       item model, filtering, pending changes (pure logic)
  home/  title/  discover/    pure logic per screen
  composables/   useAsync
  components/    UI parts; Reka UI where a primitive is needed
  views/         one file per route
netlify/functions/  tmdb proxy
```

## 3. Data layer

### Auth
1. Generate `code_verifier` + S256 `code_challenge`, store verifier + `state` in `sessionStorage`.
2. Redirect to `https://simkl.com/oauth2/authorize` with `client_id`, `redirect_uri`, `scope=media:read media:write`, PKCE params.
3. `/callback` route checks `state` and `iss`, exchanges code at `https://api.simkl.com/oauth2/token`.
4. Store `access_token` (7 d) and `refresh_token` (180 d sliding) in IndexedDB, shared by all tabs.
5. Refresh on 401 or before expiry, under a Web Lock. Sign-out → revoke endpoint + wipe IndexedDB.
- Redirect URIs to register: `http://localhost/callback` (Simkl ignores the port for loopback addresses), `https://<site>.netlify.app/callback` (+ custom domain later). Deploy previews: login unsupported unless URL registered.

### Sync engine (quota is 500 req/day on Simkl Free)
- First import after sign-in, then deltas gated by `/sync/activities` (on app start, tab focus at most every ~5 min, and "Sync now"). Details: ARCHITECTURE.md §6.
- Deletions: id-only diff when `removed_from_list` moves.
- Watched episode numbers come with the sync (`extended=full`) except for completed and dropped titles.
- Budget target: typical session < 20 user-data requests.

### Writes
- Every action (status change, mark watched, rate) → optimistic update in store → enqueue.
- Queue merges pending items per endpoint into one array POST, sends max 1 POST/s, retries with backoff on 429/5xx, rolls back + toast on hard failure.
- Queue is persisted in IndexedDB, so marks made offline are sent when back online.

### Catalog
- `GET /movies|tv|anime/{id}` and episode lists: free + edge-cached → no `Authorization` header, parallel OK.
- Trending + calendar: static JSON from `data.simkl.in`.
- Search: sequential, debounced (≥ 400 ms, min 3 chars).
- `/users/{id}/stats`: only on explicit request (Me page).

### TMDB
- Map via `ids.tmdb` from Simkl records; skip TMDB sections when missing (common for anime).
- Used for: cast/crew, person pages, backdrops/logos, videos, watch providers.
- Auth: TMDB v4 read access token stays server-side. `netlify/functions/tmdb.ts` adds it; it forwards only GET `movie|tv|person/{id}` (sub-resources via `append_to_response`) and caches responses on Netlify's CDN. A new TMDB endpoint needs a new allowed path. In dev, the Vite proxy does the same job (no allowlist).
- Attribution: TMDB logo + "This product uses the TMDB API but is not endorsed or certified by TMDB." Watch providers require JustWatch attribution. Country comes from the browser language; anime only when `anime_type` is TV or movie.

### AniList
- GraphQL at `https://graphql.anilist.co`, no key for public reads, CORS enabled. Free for non-commercial use.
- Map via `ids.anilist` from Simkl anime records.
- Used for: characters + voice actors, staff, studios, relations (prequel/sequel/side story), tags, banner image, next-episode airing countdown, recommendations.
- Limit 90 req/min (may drop to 30 when degraded) → one query per detail page, cache responses in IndexedDB (e.g. 24 h).
- Source priority for anime: AniList first, TMDB fills gaps. Movies/TV: TMDB only.
- Attribution: "Anime data from AniList" with link on anime detail pages.

### Config
- `.env` (not committed) / Netlify env: `VITE_SIMKL_CLIENT_ID` (public), `TMDB_TOKEN` (secret, never `VITE_`). The app version comes from `package.json`. `.env.example` committed so forks register their own keys.

## 4. Features (v1)

| Route | Content | State |
|---|---|---|
| `/` (signed out) | Landing: full-height; large name and tagline with sign in and "Create one on Simkl", most watched on Simkl pinned to the bottom (titles open on simkl.com) | built |
| `/` (signed in) | Up next: continue watching, new this week (opens the calendar bottom sheet), most watched on Simkl this week. Layout: §8 | built |
| `/library/:type?/:bucket?` | Library by type × bucket, sort, grid/list, title filter, mark next episode | built |
| `/movie/:id`, `/tv/:id`, `/anime/:id` | Title page: art, info, ratings, status, your rating, mark watched, seasons/episodes, cast (TMDB) or characters/staff/relations (AniList), trailers, similar, "View on Simkl" | built |
| `/search` | Search as you type; with an empty box it shows discover. Layout: §8 | built |
| `/person/:tmdbId` | TMDB person + roles; a role opens the Simkl title | built |
| `/staff/:anilistId` | AniList staff / voice actor + roles; a role opens the Simkl title | built |
| `/find/:source/:id` | Hidden step: turns a TMDB or AniList id into the Simkl title page | built |
| `/me` | Profile, stats on demand, theme, sync status + quota, export (JSON, CSV), restore from Bingit JSON, clear local data, about, sign out | built |
| `/callback` | OAuth return | built |
| any other | Page not found | built |

There is no separate Discover, Calendar or Stats page: discover lives in Search, the calendar is a sheet on Up next, stats are part of Me.

Later (PRO/VIP-gated on Simkl): custom lists, favorites, rewatches. Shown only when the account supports them.

## 5. Non-functional

- **Accessibility:** Reka UI primitives, keyboard navigation, visible focus, WCAG AA contrast in both themes, `prefers-reduced-motion`.
- **Performance:** route-level code splitting, `loading="lazy"` images with fixed aspect ratio (no CLS), right poster size per context, virtualized long lists only if needed.
- **Security:** strict CSP in `netlify.toml` (`connect-src` limited to self, Simkl and AniList; `img-src` to image hosts), no `v-html` on API text, `state` check in OAuth.
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
| M4 | Discover | Search with discover, Up next (with calendar bottom sheet), Person and Staff |
| M5 | Home + polish | Me (stats, settings, export + restore), desktop Library side panel, a11y pass, empty/error states |
| M6 | Extras | PWA (built), PRO features, importers (IMDb, Letterboxd, Trakt, MAL), e2e tests |

## 8. Design and screen layout

Mocks: https://claude.ai/artifact/JEtasoiffwbezLvff3tG9m (page "Calm palettes"). Search discover: https://claude.ai/artifact/X8t527FaAqAAEdutUP7aEs (artboard H; it wins over the older mock).

- Mobile-first, usable on desktop. Tracking-first, not browse-first.
- Core flow: search → add to Watchlist; mark episode / season / "up to here"; rating 1–10.
- Nav: Up next · Library · Search · Me. Library = category (Movies / TV / Anime) × bucket (Watchlist / Watching); Seen, Paused and Dropped are the archive. Movies have no Watching or Paused bucket, so Seen is a main tab for them.
- Style: "Calm" — light + dark themes, list-first, small artwork; detail page gets a backdrop band.
- Palette: "Combination" — mulberry #4B1D3F (light-mode action), apricot #F4A988 (dark-mode action, and the light tint: next episode, ratings, status, filter buttons), velvet rose #C97B84 (progress). The chosen segment of a segmented control and "+ Add" use the action color. Neutrals tinted toward mulberry.
- Font: Geist (UI) + Geist Mono (episode codes, runtimes, ratings), self-hosted via `@fontsource-variable` (no Google Fonts request).
- Tokens: `src/styles/tokens.css` (semantic color, type, spacing, radius, sizes, motion; light + dark).
- Me: profile + link to Simkl, export (Bingit JSON + CSV) and restore from Bingit JSON (details: ARCHITECTURE.md §13), stats on demand ("Load my stats" — expensive call), theme System/Light/Dark, sync status + Sync now, Simkl requests used today (from `X-RateLimit-*` headers), clear local data, about/attribution, sign out.
- The approved mocks win over the feature table: new pages or navigation entries need agreement first.

### Up next (`/`)

1. Header: "N in progress · M new episodes this week".
2. **Continue watching**: up to 5 shows in progress, most recently watched first. Poster, title, next episode code and name, progress, one-tap ✓ (the row moves to the following episode at once).
3. **New this week**: next 7 days of the calendar ∩ library (dropped titles excluded), the next release of each category (TV, anime, movies) with date, the first one highlighted. A row, or the "Calendar" link, opens the **calendar bottom sheet**: Movies / TV / Anime, "Only titles in my library" (on by default), days from today, 7 at a time; without the filter, the 15 most popular per day plus "Show all". Filters and Simkl credit stay in place; only the days scroll.
4. **Most watched on Simkl this week**: Movies / TV / Anime, ranked posters with quick add to Watchlist, "Discover" action to Search. Trending files are free and don't use the daily quota.

Section actions and external links use one style (icon + text, no arrows).

Desktop: two columns. Left: continue watching as landscape cards, 3 per row, then most watched as one row of 6. Right: new this week, then the 3 titles added last to the Watchlist (desktop only).

### Search (`/search`)

- Empty box → **discover**: category, then two filter buttons, each opening a bottom sheet: list (trending today / week / month; top rated, new premieres, coming soon for TV and anime) and genre (with a text filter). Both apply together; for today and this week the genre is picked from the 500 most watched. Rows: rating, quick add.
- Title, search field, category and filter buttons stay pinned at the top, as in Library.
- Opening a title and going back keeps filters, results and scroll (the page is kept alive until sign-out; a reload resets the discover filters).
- Typing → results with All / Movies / TV / Anime filter (from 3 characters). The URL keeps the search. `/` or the desktop top bar focuses it from anywhere.

### Navigation

Up next · Library · Search · Me. On desktop, every page except Search has a search button in a top bar. Phone: bottom bar. Desktop (≥ 1024 px): left sidebar with Library category shortcuts, counts, and the user with the last sync time.

### Library

Title, category, title filter and status tabs stay pinned at the top. Two icon buttons in the title bar: filters (bottom sheet with sort, list or grid, and a reset button) and archive (bottom sheet with Seen / Paused / Dropped tabs, Dropped only for movies, its own title filter, and two buttons: sort by title, list or grid; `?archive=` keeps it open after "back"). Default sort: recently watched, then recently added.

### Controls

Use the Reka UI primitive when one exists (Drawer, Tabs, ToggleGroup, Checkbox) and style it with tokens. Reka has no plain text input: use the native one.

### Library on desktop

The list becomes a table (title, progress, next, rating, mark button) when it is wide enough. A row opens the title in a side panel (status, rating, "View on Simkl", the current season); the panel's title opens the title page. Modified clicks behave as links.

### Me (`/me`)

Profile, stats on demand, appearance (System / Light / Dark), sync (status, requests today, clear saved data), **your data** (export JSON or CSV, restore from Bingit JSON; not in the mock, added from §4), about, sign out.

### Title page

Mock: https://claude.ai/artifact/1HpftMTopPXFjyK1284aw8

No backdrop. Top bar: back button; when the title is in the library, a status chip (information only) and "⋯" (opens the status sheet). Header: poster, and beside it the English title, the original title, season or release date, episodes and runtime, next episode and up to three genres. Then the season row with the progress of the chosen season, "Add to Watchlist" (only when not added) and "Mark watched" (movies), one card with the platform scores and your rating (five stars with halves = 1–10), and tabs:

- **Episodes** (series): the episode list. A started series opens here, else on Info.
- **Info**: overview, where to watch (browser language country), cast or characters and staff, details (with all genres), trailers (YouTube thumbnails), "View on Simkl".
- **Related**: related anime ("Same story": Simkl `relations` without the seasons; direct links first, then by year, summaries last) and similar titles (Simkl `users_recommendations`) as posters.

Status changes live in a bottom sheet with a separate "Remove from library" button and a confirmation. The desktop side panel opens the same sheet from its status button.

**Season row.** TV shows and anime use the same row and place. A TV season changes the episode list on the same page (status and rating belong to the whole show; the bar shows the season and the total). An anime season opens its own title.

**Anime seasons.** Simkl keeps each season as its own title. Its distant `relations` are not reliable (remakes show as sequels), so the app walks the direct `season`, `prequel` and `sequel` links title by title (free requests, cached; also through films and specials), shows the TV and ONA titles of the same show, ordered by first air date. Crossovers and spin-offs are also direct sequels (Fire Force leads to Soul Eater), so a title belongs to the show of its `season 1` link; an announced title with no TVDB and TMDB id goes with its neighbour. Series with their own first season (Naruto and Shippuden, Dragon Ball and Z) stay apart. Checked against AniList on 19 series. Status, progress and rating belong to the chosen season. Films and specials go to Related.

### Quick add

"+ Add" becomes "✓ Added" for titles added in this session, with an "Undo" message. Undo removes the title only while it has no history or rating.

### Installed app (PWA)

Me shows an "Install" section (not in the mock) when the browser can install, or with "Add to Home Screen" steps on iPhone and iPad; it is hidden once installed. A new version shows "Reload / Later" at the top; nothing reloads on its own.

### Still different from the mocks

| Screen | Mock | Now |
|---|---|---|
| Me | No data section | "Your data": export and restore |

## 9. Open items

- App name / domain (repo is "Bingit").
- App icon is a placeholder (`public/icons/`).
- Verify sign-in inside the installed app on iPhone and Android.

## 10. Data sources considered and skipped

| Source | Why skipped |
|---|---|
| Jikan (unofficial MAL) | Overlaps AniList; Simkl already returns MAL scores; scraper-based |
| TVmaze | Overlaps TMDB + Simkl calendar. Revisit if airtimes are unreliable |
| TheTVDB v4 | Paid key |
| OMDb | RT/Metacritic scores nice-to-have; key would be public. Maybe later |
| Fanart.tv | TMDB has logos. Maybe later |
