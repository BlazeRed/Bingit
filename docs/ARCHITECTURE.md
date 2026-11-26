# Bingit — architecture (proposal)

Status: **decided 2026-11-26**. Product and design decisions live in [PLAN.md](./PLAN.md); Simkl facts in [simkl-api-research.md](./simkl-api-research.md).

## 1. Constraints that shape everything

| Constraint | Source | Consequence |
|---|---|---|
| No backend, static hosting on Netlify | project choice | Everything runs in the browser. Only public identifiers ship in the bundle. |
| Simkl, TMDB, AniList all allow CORS | Simkl docs (CORS page), TMDB, AniList | Direct `fetch` from the browser. No proxy needed. |
| Simkl quota per user/day: Free 500, PRO 1,000, VIP 10,000 | Simkl rate limits | Local mirror of the library; read it, don't re-fetch it. |
| Simkl: 10 GET/s, **1 POST/s** (overage → temporary block) | Simkl rate limits | Single write queue, batched arrays. |
| Catalog details, episode lists, trending and calendar files are edge-cached and **don't count** | Simkl rate limits | Use them freely, in parallel, **without** `Authorization` header. |
| Writes accept TMDB/IMDb/MAL ids directly | Simkl docs | No search-before-write. Adding a trending item = 1 POST. |
| AniList ~90 req/min (30 when degraded) | AniList docs | One query per anime detail view, cached. |
| Access token 7 days, refresh token 180 days sliding, non-rotating | Simkl AUTH V2 | Silent refresh; re-login only after 6 months idle or revoke. |

## 2. CORS and browser rules, per host

| Host | Used for | Auth header | Preflight | Notes |
|---|---|---|---|---|
| `api.simkl.com` | user data, catalog, search | `Bearer` only on user endpoints | yes when `Authorization` or JSON body | Preflight cached 24 h. Errors (401/429) also carry CORS headers, so JS can read them. No `User-Agent` (forbidden in browsers); identify with `app-name` + `app-version` query params. No `Content-Type` on GET. |
| `data.simkl.in` | trending + calendar JSON | none | no (simple GET) | Use `cache: 'no-cache'`, never custom headers (CDN rejects preflight). |
| `simkl.com` | OAuth consent page only | — | — | Full-page redirect, not fetch. |
| `api.themoviedb.org` | cast, people, art, videos, providers | `Bearer <read token>` | yes | Token is public in the bundle; regenerate if abused. |
| `graphql.anilist.co` | anime characters, staff, relations | none | yes (JSON POST) | |
| `wsrv.nl`, `simkl.in`, `image.tmdb.org`, `s4.anilist.co` | images | — | — | `<img>` only. Must match CSP `img-src`. |

## 3. What we can build, and what each screen costs

"Quota" = counts against the user's daily Simkl allowance.

| Screen / action | Data source | Quota cost |
|---|---|---|
| Up next · Continue watching | local mirror (`next_to_watch`, counts) | 0 |
| Up next · New this week | calendar JSON ∩ library ids | 0 |
| Up next · Most watched on Simkl | trending JSON (today/week/month × type) | 0 |
| Library (all buckets) | local mirror | 0 |
| Detail · metadata, episodes | `GET /tv|movies|anime/{id}`, `/…/episodes/{id}` | 0 (edge-cached) |
| Detail · watched episodes | local mirror (`extended=full` keeps episode numbers for watching/plan/hold) | 0 |
| Detail · cast, trailers, providers | TMDB | 0 Simkl |
| Detail · characters, staff, relations | AniList | 0 Simkl |
| Search | `GET /search/{type}` | 1 per query |
| Add / change status | `POST /sync/add-to-list` | 1 per batch |
| Mark episode / season / up to here / movie | `POST /sync/history` (+ `/remove`) | 1 per batch |
| Rate | `POST /sync/ratings` | 1 per batch |
| Sync check | `GET /sync/activities` | 1 |
| Delta pull | `GET /sync/all-items/{type}` with `date_from` | 1 per changed type |
| Me · profile | `GET /users/settings` (once, cached) | 1 |
| Me · stats | `GET /users/{id}/stats` (button only) | 1, expensive |

Typical day (open app 3×, 5 searches, 10 actions): **~30 requests**, well under 500.

Not possible with the API: social features (friends, comments, feed), push notifications. Custom lists, favorites and rewatches work only for PRO/VIP accounts (later milestone).

## 4. Layers

```
views/            route screens (Up next, Library, Detail, Search, Me)
components/       UI built on Reka UI + tokens
stores/ (Pinia)   auth · library · prefs        ← views read only from here
sync/             engine (activities gate, delta pull) · write-queue
api/              simkl · tmdb · anilist · images  (thin typed fetch wrappers)
db/               IndexedDB (idb-keyval): library mirror, snapshot, caches
auth/             PKCE, token storage, refresh
```

Rule: views never call `api/` for user data; they read stores. Catalog/TMDB/AniList reads go through one small `cachedFetch(key, ttl, loader)` helper backed by IndexedDB.

## 5. Auth flow (AUTH V2, PKCE, public client)

1. "Sign in with Simkl" → create `code_verifier` (Web Crypto), S256 `code_challenge`, random `state`; keep both in `sessionStorage`.
2. Redirect to `https://simkl.com/oauth/authorize?...` (V2 path per docs).
3. `/callback`: verify `state`, POST code + verifier to the token endpoint, store tokens, clean URL, start initial sync.
4. Every Simkl user call: if access token expires within 5 min → refresh first. On 401 → refresh once → else sign out with a message.
5. Sign out: revoke token, clear IndexedDB + storage.

Redirect URIs to register: `http://localhost/callback` (loopback: port ignored) and `https://<site>/callback`.

**Token storage (decided):** refresh token in IndexedDB, access token in memory only. On each app load the app exchanges the refresh token for a fresh access token (one token call; tabs refresh independently, which is safe because refresh tokens don't rotate). Nothing token-related in `localStorage`. CSP stays the main XSS defense.

## 6. Sync engine

- **Initial**: snapshot `/sync/activities` → `/sync/all-items/shows?extended=full`, then `movies`, then `anime` (sequential) → write mirror → save snapshot. Show progress ("Importing your library…").
- **Incremental**: on app start, tab focus (min 5 min apart), and after our own writes: `/sync/activities`; unchanged `all` → stop; else pull only changed types with `date_from`.
- **Deletions**: once a day, `extended=simkl_ids_only` diff per type.
- **Multi-tab**: Web Locks API (`navigator.locks.request('sync', …)`) so only one tab syncs; `BroadcastChannel` tells other tabs to reload the store. Both native, no library.

## 7. Write queue

- Every action updates the store first (optimistic), then enqueues.
- Queue merges pending ops per endpoint into one array body, sends ≤1 POST/s, retries 429/5xx with backoff (`Retry-After` when present).
- Hard failure → roll back that item + toast with Retry.
- **Offline writes (decided):** the queue is persisted in IndexedDB. Marks made offline are sent when `online` fires or on next start, oldest first; items show a small "pending" state until sent.

## 8. Caching (IndexedDB)

| Data | TTL | Why |
|---|---|---|
| Library mirror + snapshot | until next delta | source of truth for UI |
| Simkl catalog details / episodes | 7 days | free but avoids latency |
| Trending / calendar JSON | browser HTTP cache (`no-cache` revalidate) | Simkl's own guidance |
| TMDB / AniList responses | 7 days | stable data, AniList limit |
| Search results | memory only, session | cheap to redo, no stale results |

### Storage limits

- **Library mirror: no cap.** It is the source of truth; capping it would break the app. Store only the fields the UI reads (ids, title, year, poster path, status, counts, `next_to_watch`, rating, watched episode numbers), not whole API responses. Estimate: ~1–3 KB per title → 1,000 titles ≈ 1–3 MB, 5,000 ≈ 5–15 MB.
- **Response cache (catalog, TMDB, AniList): capped.** Separate IndexedDB store. Each entry keeps `savedAt`; on app start delete entries past TTL, then if more than **500 entries** delete the oldest. ~5–15 MB worst case.
- **Images: not stored by us.** Browser HTTP cache manages them (a service worker cache, if added with the PWA, gets its own cap).
- **Write queue, tokens, prefs:** a few KB.
- Call `navigator.storage.persist()` after sign-in so Chrome/Firefox don't evict data under disk pressure.
- **Safari:** deletes all site storage after 7 days without a visit unless the site is installed to the home screen. Effect: re-login + re-import after a week away. Mitigation: suggest "Add to Home Screen" (PWA, M6).
- **Me page:** show usage from `navigator.storage.estimate()` and a "Clear cached data" button (keeps sign-in and library; "Clear saved data" removes everything).

## 9. Search

**Decided: search as you type**, debounced 400 ms, min 3 chars, one request in flight (abort the previous), results cached per query for the session. ~2–4 requests per search.

## 10. Errors and limits in the UI

- 429 on GET → wait and retry; 429 on POST → queue backs off.
- Quota: read `X-RateLimit-*` headers, show usage on Me; under 10% left → pause background sync, keep user actions.
- Offline → banner, reads from mirror, writes queued.

## 11. Types

**Decided:** hand-written types for the endpoints we use (`src/api/simkl-types.ts`), only the fields the app reads. `openapi-fetch` dropped: a ~30-line typed `fetch` wrapper is enough without generated types.

## 12. Security

- CSP in `netlify.toml` (already set): scripts `'self'` only, `connect-src` limited to the hosts above.
- Never render API text as HTML (`v-html` banned via ESLint rule).
- OAuth `state` check; PKCE verifier never leaves `sessionStorage`.
- Only public ids in env (`VITE_SIMKL_CLIENT_ID`, `VITE_TMDB_TOKEN`).

## 13. Import / export

Simkl has no "download my data" or "upload a file" endpoint, and Bingit has no backend. Both features run in the browser:

- **Export:** build a file from the library mirror and download it with a `Blob` + `<a download>`. For a complete backup, first refresh with `extended=full&include_all_episodes=yes&episode_watched_at=yes` (3 requests, one per type). Formats: Bingit JSON (lossless: all ids, statuses, ratings, per-episode dates) and CSV (one row per title, for spreadsheets).
- **Import:** parse the file locally → preview (counts, unmatched rows) → send through the write queue in batches: `/sync/add-to-list` for watchlist/status, `/sync/history` with `watched_at` for watch events, `/sync/ratings` for ratings. Simkl resolves imdb/tmdb/tvdb/mal/anilist ids server-side and reports `not_found`. Import never deletes anything.
- **Scope:** v1 (M5) = export JSON + CSV, restore from Bingit JSON. M6 = importers for IMDb CSV, Letterboxd CSV (title + year only, fuzzy), Trakt JSON, MAL XML.
- **Cost:** ~1 request per 100 items, sent at ≤1 POST/s.
