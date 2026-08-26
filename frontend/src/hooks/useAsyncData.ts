import { useCallback, useEffect, useRef, useState } from 'react'
import { toErrorMessage } from '@/services/http'

export type AsyncStatus = 'loading' | 'success' | 'error'

export interface AsyncState<T> {
  data: T | null
  status: AsyncStatus
  error: string | null
  /** True while re-fetching with data already on screen (tab switch, refresh). */
  isRefreshing: boolean
  refresh: () => void
}

interface Entry<T> {
  key: string
  data: T | null
  error: string | null
}

/**
 * Fetch-on-mount with loading / success / error states, keeping the previous
 * result visible while the next one loads. Every screen reads its data through
 * this, so the four UI states are always available — mock backend or real.
 *
 * `deps` are identified by value (they're serialised into a cache key), so pass
 * primitives: ids, periods, revision counters.
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: (string | number | boolean | null | undefined)[] = [],
): AsyncState<T> {
  const [nonce, setNonce] = useState(0)
  const [entry, setEntry] = useState<Entry<T> | null>(null)

  const key = `${nonce}:${JSON.stringify(deps)}`

  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher
  })

  useEffect(() => {
    let cancelled = false

    fetcherRef
      .current()
      .then((data) => {
        if (!cancelled) setEntry({ key, data, error: null })
      })
      .catch((cause: unknown) => {
        if (!cancelled) setEntry({ key, data: null, error: toErrorMessage(cause) })
      })

    return () => {
      cancelled = true
    }
  }, [key])

  const fresh = entry?.key === key ? entry : null
  const data = fresh ? fresh.data : (entry?.data ?? null)
  const status: AsyncStatus = fresh ? (fresh.error ? 'error' : 'success') : data ? 'success' : 'loading'

  const refresh = useCallback(() => setNonce((n) => n + 1), [])

  return {
    data,
    status,
    error: fresh?.error ?? null,
    isRefreshing: !fresh && data !== null,
    refresh,
  }
}
