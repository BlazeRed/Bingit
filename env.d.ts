/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/vue" />

interface ImportMetaEnv {
  readonly VITE_SIMKL_CLIENT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
