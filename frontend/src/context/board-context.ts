import { createContext, useContext } from 'react'

export interface BoardApi {
  /** Bumped whenever the standings change. Views list it as a fetch dependency. */
  revision: number
  invalidate: () => void
}

export const BoardContext = createContext<BoardApi | null>(null)

export function useBoard(): BoardApi {
  const api = useContext(BoardContext)
  if (!api) throw new Error('useBoard must be used inside <BoardProvider>')
  return api
}
