/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SIMKL_CLIENT_ID: string
  readonly VITE_TMDB_TOKEN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
