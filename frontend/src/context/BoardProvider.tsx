import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { BoardContext } from './board-context'

/**
 * One number that says "the standings moved". Anything showing leaderboard data
 * re-fetches when it changes, which keeps a placed bid from leaving stale ranks
 * on screen — and maps cleanly onto a query cache later.
 */
export function BoardProvider({ children }: { children: ReactNode }) {
  const [revision, setRevision] = useState(0)
  const invalidate = useCallback(() => setRevision((n) => n + 1), [])
  const value = useMemo(() => ({ revision, invalidate }), [revision, invalidate])

  return <BoardContext value={value}>{children}</BoardContext>
}
