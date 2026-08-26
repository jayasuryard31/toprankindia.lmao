import type { ActivityEvent } from '@/types'
import { USE_MOCK_API } from './config'
import { http } from './http'
import { buildActivity } from './mock/db'
import { demoScenario, simulate } from './mock/transport'

/**
 * GET /activity?limit=n — the most recent bids across the whole board.
 */
export function getRecentActivity(limit = 8): Promise<ActivityEvent[]> {
  if (!USE_MOCK_API) {
    return http.get<ActivityEvent[]>(`/activity?limit=${limit}`)
  }

  return simulate(() => (demoScenario() === 'empty' ? [] : buildActivity(limit)), {
    delay: [260, 520],
    failable: true,
  })
}
