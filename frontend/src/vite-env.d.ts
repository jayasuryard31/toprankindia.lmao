/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** e.g. `http://localhost:5000/api`. Unset ⇒ the mock backend is used. */
  readonly VITE_API_BASE_URL?: string
  /** Force the mock backend even when a base URL is configured. */
  readonly VITE_USE_MOCK_API?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
