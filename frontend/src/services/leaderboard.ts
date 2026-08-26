import type { Leaderboard, LeaderboardEntry, LeaderboardPeriod } from '@/types'
import { USE_MOCK_API } from './config'
import { http } from './http'
import { buildLeaderboard } from './mock/db'
import { demoScenario, simulate } from './mock/transport'

/**
 * GET /leaderboard?period=all-time|today|week
 */
export function getLeaderboard(period: LeaderboardPeriod): Promise<Leaderboard> {
  if (!USE_MOCK_API) {
    return http.get<Leaderboard>(`/leaderboard?period=${period}`)
  }

  return simulate(
    () => {
      const board = buildLeaderboard(period)
      if (demoScenario() === 'empty') {
        return { ...board, entries: [], volume: 0 }
      }
      return board
    },
    { delay: [320, 680], failable: true },
  )
}

export interface TopSpot {
  entry: LeaderboardEntry | null
  /** Projects on the all-time board. */
  contenders: number
  /** Total bid across all time. */
  volume: number
}

/**
 * GET /leaderboard/top — just the leader, for the hero. Its own endpoint so the
 * landing page never has to pull the whole board to show one number.
 */
export function getTopSpot(): Promise<TopSpot> {
  if (!USE_MOCK_API) {
    return http.get<TopSpot>('/leaderboard/top')
  }

  return simulate(
    () => {
      const board = buildLeaderboard('all-time')
      if (demoScenario() === 'empty') return { entry: null, contenders: 0, volume: 0 }
      return {
        entry: board.entries[0] ?? null,
        contenders: board.entries.length,
        volume: board.volume,
      }
    },
    { delay: [260, 520], failable: true },
  )
}

export const LEADERBOARD_PERIODS: { id: LeaderboardPeriod; label: string; hint: string }[] = [
  { id: 'all-time', label: 'All time', hint: 'Every bid ever placed' },
  { id: 'today', label: 'Today', hint: 'Bids from the last 24 hours' },
  { id: 'week', label: 'This week', hint: 'Bids from the last 7 days' },
]
