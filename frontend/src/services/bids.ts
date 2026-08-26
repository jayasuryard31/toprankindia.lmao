import type { Bid, BidReceipt, PlaceBidInput } from '@/types'
import { USE_MOCK_API } from './config'
import { http } from './http'
import { currentBid, insertBid, minimumBid, projectBids, topBid } from './mock/db'
import { simulate } from './mock/transport'
import { getSession } from './auth'

/** What the bid form needs before the user types anything. */
export interface BidContext {
  projectId: string
  /** Leading bid for this project right now. */
  currentBid: number
  /** Lowest bid the server will accept. */
  minimumBid: number
  /** Leading bid across the whole board — beat it to take #1. */
  topBid: number
}

/**
 * GET /projects/:id/bid-context
 */
export function getBidContext(projectId: string): Promise<BidContext> {
  if (!USE_MOCK_API) {
    return http.get<BidContext>(`/projects/${projectId}/bid-context`)
  }

  return simulate(
    () => ({
      projectId,
      currentBid: currentBid(projectId),
      minimumBid: minimumBid(projectId),
      topBid: topBid(),
    }),
    { delay: [180, 340] },
  )
}

/**
 * POST /bids
 *
 * The payment step slots in right here: a real implementation authorises the
 * charge first and only then writes the bid. Nothing in the UI changes.
 */
export async function placeBid(input: PlaceBidInput): Promise<BidReceipt> {
  if (!USE_MOCK_API) {
    return http.post<BidReceipt>('/bids', input)
  }

  const session = await getSession()
  const bidderId = session?.user.id ?? 'usr_guest'

  return simulate(() => insertBid(input.projectId, bidderId, input.amount), {
    delay: [600, 1100],
  })
}

/**
 * GET /projects/:id/bids
 */
export function getBidHistory(projectId: string): Promise<Bid[]> {
  if (!USE_MOCK_API) {
    return http.get<Bid[]>(`/projects/${projectId}/bids`)
  }

  return simulate(() => projectBids(projectId), { delay: [200, 400], failable: true })
}
