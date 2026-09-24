/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** App version (git tag, e.g. 1.0.12) baked in by docker/Dockerfile. Unset in local dev. */
  readonly CONLUZ_APP_VERSION?: string;
}
