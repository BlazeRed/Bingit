# Bingit

Track it. Binge it. Sync it.

Bingit is a free and open-source web app to track movies, TV shows and anime. It runs on top of your [Simkl](https://simkl.com) account: your watchlists, history and ratings stay on Simkl, and Bingit gives you a cleaner way to use them.

> **Status:** early development. All screens of the first version exist and need testing with real accounts. See the [project plan](docs/PLAN.md).

## Features

- Sign in with your Simkl account. No new account, no extra password.
- **Up next:** continue watching with a one-tap button, new episodes of the week with a calendar, and what is most watched on Simkl.
- One library for movies, TV shows and anime, by status: watchlist, watching, seen, paused, dropped.
- Mark episodes, seasons and movies as watched. Rate titles. Changes made offline are sent later.
- Title pages with cast (TMDB), and characters, voice actors and related works for anime (AniList). Person pages.
- Search, with trending, genres, top rated and premieres.
- Your stats, export to JSON or CSV, and restore from a Bingit backup.
- Light and dark themes, keyboard friendly.
- Installable on phone and desktop; opens without a connection.

Planned: watch providers, importers from other trackers.

## How it works

Bingit is a single-page app with no database and no user data on its own servers. Its only server code is a small Netlify Function that forwards TMDB requests, so the TMDB token stays secret.

| Service | Used for |
|---|---|
| [Simkl API](https://api.simkl.org) | Sign-in (OAuth 2.0 + PKCE), library, history, ratings, catalog, trending, calendar |
| [TMDB API](https://developer.themoviedb.org) | Cast, crew, people, artwork, videos, watch providers for movies and TV |
| [AniList API](https://docs.anilist.co) | Characters, staff, relations and airing schedule for anime |

Your Simkl tokens and a cache of your library are kept in your browser's IndexedDB. Signing out removes them and revokes the token.

## Tech stack

Vue 3 · TypeScript · Vite · Reka UI · Pinia · vue-router · Vitest · ESLint + oxlint + Prettier · Netlify.

Details and reasons: [docs/PLAN.md](docs/PLAN.md). Simkl API notes: [docs/simkl-api-research.md](docs/simkl-api-research.md).

## Development

### Requirements

- Node.js 24 (see `.nvmrc`; with nvm run `nvm use`)
- A Simkl app and a TMDB token (both free)

### Set up API keys

1. Create a Simkl app at <https://simkl.com/settings/developer/>.
   - Auth version: **AUTH V2**
   - Client type: **Mobile, desktop & browser apps** (no client secret)
   - Redirect URI: `http://localhost/callback` (Simkl ignores the port for loopback addresses)
2. Get a TMDB API read access token at <https://www.themoviedb.org/settings/api>.
3. Copy `.env.example` to `.env.local` and fill in both values.

AniList needs no key.

The Simkl client ID is a public identifier that ends up in the browser bundle. The TMDB token is a secret: only the proxy reads it, so never rename it with a `VITE_` prefix. Never add a Simkl client secret to this project.

### Commands

```sh
npm install          # install dependencies
npm run dev          # start dev server on http://localhost:5173
npm test             # run unit tests once
npm run test:unit    # run unit tests in watch mode
npm run type-check   # check types
npm run lint         # lint and fix
npm run format       # format with Prettier
npm run build        # type-check and build to dist/
npm run preview      # serve the production build (the only way to try the installed app locally)
```

## Deployment

The site deploys to Netlify from `main`. Build settings, the SPA fallback and the security headers are in [`netlify.toml`](netlify.toml). Set `VITE_SIMKL_CLIENT_ID` and `TMDB_TOKEN` (mark it as secret) in the Netlify environment, and add `https://<your-site>/callback` as a redirect URI in the Simkl app.

Sign-in does not work on Netlify deploy previews, because Simkl accepts only registered redirect URIs.

## Contributing

Issues and pull requests are welcome. CI runs lint, format check, type-check, tests and a build on every pull request; run the same commands locally before you push.

## Credits

Movie, TV and anime data from [Simkl](https://simkl.com). Extra metadata from [TMDB](https://www.themoviedb.org) and [AniList](https://anilist.co).
This product uses the TMDB API but is not endorsed or certified by TMDB.

## License

[GPL-3.0](LICENSE) © Mauro Nonis and contributors.
