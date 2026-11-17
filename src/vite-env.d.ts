/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SOUPDB_HOST?: string;
  readonly VITE_SOUPDB_PORT?: string;
  readonly VITE_MODO_CLIENTE?: 'demo' | 'tauri' | 'rest';
  readonly VITE_URL_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
