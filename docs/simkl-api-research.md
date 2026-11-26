# Simkl API — research notes

Source: https://api.simkl.org (official docs, moved from Apiary in 2026). Machine-readable index: https://api.simkl.org/llms.txt, full dump: https://api.simkl.org/llms-full.txt, OpenAPI: https://api.simkl.org/openapi.json. Retrieved 2026-11-26.

## Basics

- API host: `https://api.simkl.com`. Consent pages live on `https://simkl.com`.
- Every request: query params `client_id`, `app-name`, `app-version`. `User-Agent` header is required for native/server clients only — browsers can't set it.
- **CORS is supported from any origin**, including `Authorization: Bearer` (preflight cached 24 h). A pure static SPA works.
- Don't send `Content-Type: application/json` on GET (forces preflight).
- Don't send `Authorization` on cached catalog endpoints (breaks Cloudflare edge cache).

## Auth (AUTH V2 — use this; V1 retires ~April 2027)

- Register app at https://simkl.com/settings/developer/ as **"Mobile, desktop & browser apps"** → no `client_secret`, redirect URI(s) required. Client type can't be changed later.
- Flow: OAuth 2.0 authorization code + **PKCE (S256 mandatory)**. Device/PIN flow also available.
- Scopes: `media:read`, `media:read media:write`.
- Lifetimes: access token 7 days; refresh token 180 days **sliding, non-rotating**; auth code 10 min single-use.
- Endpoints: `https://simkl.com/oauth2/authorize` (browser), `https://api.simkl.com/oauth2/token`, `/oauth2/revoke`.
- Callback returns `state` and `iss=https://simkl.com`; check both.
- A refresh invalidates the previous access token (one live token per grant).
- V2 needs a user token on everything except catalog summaries, episode lists, trending/calendar files and `/redirect`. Search needs a token.
- Revoke endpoint (RFC 7009) on sign-out.
- `client_id` is public — fine to commit in an open-source repo. Never ship a secret.

## Rate limits (critical for design)

- Per-second: 10 GET/s, **1 POST/s** (POST overage → temporary block). Every write endpoint accepts arrays → batch.
- Daily quota (V2) is **per user**, by the user's Simkl plan: Free 500/day, PRO 1,000, VIP 10,000.
- **Do not count / parallel allowed** (Cloudflare-cached): `GET /movies/{id}`, `/tv/{id}`, `/anime/{id}`, `/tv/episodes/{id}`, `/anime/episodes/{id}`, trending + calendar JSON files on `data.simkl.in`.
- Everything else sequential. `X-RateLimit-*` headers only on V2 tokens.

## Sync model

1. Read `GET /sync/activities` (snapshot, keep in memory).
2. Initial pull: `GET /sync/all-items/{shows|movies|anime}` sequentially. Ratings included (`user_rating`).
3. Save snapshot only if all pulls succeeded.
4. Poll: re-read activities; if `all` unchanged → stop. Else fetch only moved buckets with `date_from=<saved all>`.
- `all-items` default is rich: `last_watched`, `watched_episodes_count`, `total_episodes_count`, `not_aired_episodes_count`, `next_to_watch`, `user_rating`, `status`, poster, ids. `extended=full` adds seasons/episodes; `episode_watched_at=yes` adds per-episode timestamps; `simkl_ids_only` for deletion diffs.
- Watchlist statuses: `watching`, `plantowatch`, `hold`, `dropped`, `completed`. Movies have no `watching`/`hold`.

## Endpoint groups

| Group | Endpoints | Auth |
|---|---|---|
| Sync | `GET /sync/activities`, `GET /sync/all-items/:type/:status`, `POST /sync/add-to-list`, `POST /sync/history`, `POST /sync/history/remove`, `POST /sync/ratings`, `POST /sync/ratings/remove`, `GET /sync/ratings`, `POST /sync/watched` (lookup) | Bearer |
| Playback / scrobble | `POST /scrobble/start\|pause\|stop\|checkin`, `GET /sync/playback`, `DELETE /sync/playback/{id}` | Bearer |
| Catalog | `GET /movies/{id}`, `/tv/{id}`, `/anime/{id}`, `/tv/episodes/{id}`, `/anime/episodes/{id}`, airing, premieres, best, genres | client_id |
| Search | text (`/search/:type`), by external id (`/search/id`), by file (`POST /search/file`), random | client_id |
| Trending / calendar | static JSON on `data.simkl.in` (today/week/month, per genre; upcoming episodes, premieres, releases) | none |
| Ratings | community ratings for watchlist items | Bearer |
| Users | `GET /users/settings`, `GET /users/{id}/stats` (**most expensive call — only on explicit user action**), recently-watched image | Bearer |
| Custom lists / favorites | read lists, create/edit/delete, add/remove items, favorites | **Beta, PRO/VIP only**, V2 + `media:write` |
| Rewatches | separate sessions per item, max 50, 2-day gap | **PRO/VIP only** |
| Redirect | `/redirect` deep-link / resolve external ID → Simkl ID (not for bulk mapping) | client_id |
| Changes | catalog IDs changed in last N days | client_id |

Detail records include: title, overview, year, runtime, country, certification, network/studios, genres, director, ratings (Simkl, IMDb, MAL), posters, fanart, trailers, external ids (imdb, tmdb, tvdb, mal, anilist, …), alt titles, release dates per region, budget/revenue, recommendations.

## Images

- CDN: `https://simkl.in/{posters|fanart|episodes}/{path}{suffix}.webp`, recommended via `https://wsrv.nl/?url=...`.
- Poster suffixes: `_w` 600×338, `_m` 340w, `_ca` 190×279, `_c` 170×250, `_cm` 84×124, `_s` 40×57.
- Placeholders: `simkl.in/poster_no_pic.png`, `_c`, `_c_grey`, `_s`.

## API rules (must comply)

1. **Link back to Simkl** visibly (detail page "View on Simkl", clickable covers, footer "data from Simkl"…).
2. Trackers must offer Simkl login + sync (we do).
3. Don't use Simkl as a generic metadata CDN — use TMDB/TVDB for raw metadata.
4. Keep `client_secret` secret (we have none).
5. Free for non-commercial / < $150/month revenue.
6. Trending sections must name Simkl in the title ("Trending on Simkl").

## Not available / gaps

- No social features (comments, follows, feed) in the public API.
- No user-facing notification/push API.
- Custom lists, favorites, rewatches gated to PRO/VIP.
- Cast/crew/people data limited → TMDB if needed.
