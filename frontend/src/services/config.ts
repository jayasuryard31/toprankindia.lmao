export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

/**
 * The single switch between the demo backend and the real one.
 *
 * Every service module branches on this flag and nothing else, so pointing the
 * app at a live API is a one-line `.env` change:
 *
 *   VITE_API_BASE_URL=http://localhost:5000/api
 */
export const USE_MOCK_API =
  import.meta.env.VITE_USE_MOCK_API === 'true' || !API_BASE_URL
