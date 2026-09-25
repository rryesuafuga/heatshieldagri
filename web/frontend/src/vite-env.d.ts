/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set to "research" to deploy the site as the standalone results page only. */
  readonly VITE_SITE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
