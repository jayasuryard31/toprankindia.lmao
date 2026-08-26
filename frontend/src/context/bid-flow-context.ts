import { createContext, useContext } from 'react'

export interface OpenBidOptions {
  /** Amount the user is trying to beat — prefills the input with `+ $1`. */
  beat?: number
  /** Name of the project being chased, for the modal subtitle. */
  chasing?: string
}

export interface BidFlowApi {
  isOpen: boolean
  /**
   * Single entry point for every "place a bid" affordance in the app. Handles
   * the sign-in wall and the no-project-yet detour before opening the modal.
   */
  openBid: (options?: OpenBidOptions) => void
  closeBid: () => void
}

export const BidFlowContext = createContext<BidFlowApi | null>(null)

export function useBidFlow(): BidFlowApi {
  const api = useContext(BidFlowContext)
  if (!api) throw new Error('useBidFlow must be used inside <BidFlowProvider>')
  return api
}
