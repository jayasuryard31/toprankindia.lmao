/**
 * Domain types shared by the UI and the service layer.
 *
 * These describe the *contract* the frontend expects. The mock implementation
 * in `services/mock` and the eventual HTTP backend both produce these shapes,
 * so swapping one for the other never touches a component.
 */

/** ISO-8601 timestamp, e.g. "2026-08-26T09:14:00.000Z". */
export type ISODateString = string

/** Money is whole US dollars. Bids are always integers — no cents. */
export type Money = number

export interface User {
  id: string
  /** Without the leading "@". */
  handle: string
  name: string
  avatarUrl: string | null
  /** Hue (0–360) used by the fallback monogram avatar. */
  hue: number
}

export interface Project {
  id: string
  slug: string
  name: string
  /** Bare domain, e.g. "gaeon.in". */
  domain: string
  url: string
  tagline: string
  logoUrl: string | null
  /** Hue (0–360) used by the fallback monogram logo. */
  hue: number
  ownerId: string
  createdAt: ISODateString
}

export interface Bid {
  id: string
  projectId: string
  bidderId: string
  amount: Money
  createdAt: ISODateString
}

export type LeaderboardPeriod = 'all-time' | 'today' | 'week'

export interface LeaderboardEntry {
  rank: number
  /** Rank before the most recent shake-up. `null` when the entry is new. */
  previousRank: number | null
  project: Project
  bidder: User
  /** Leading bid for this project within the period. */
  amount: Money
  /** Bids placed on this project within the period. */
  bidCount: number
  lastBidAt: ISODateString
}

export interface Leaderboard {
  period: LeaderboardPeriod
  entries: LeaderboardEntry[]
  /** Total money bid across the period. */
  volume: Money
  updatedAt: ISODateString
}

export type ActivityType = 'bid' | 'takeover' | 'overtake' | 'joined'

export interface ActivityEvent {
  id: string
  type: ActivityType
  project: Pick<Project, 'id' | 'slug' | 'name' | 'domain' | 'hue' | 'logoUrl'>
  bidder: Pick<User, 'id' | 'handle' | 'name' | 'hue' | 'avatarUrl'>
  amount: Money
  /** Rank the project landed on, when the event changed the standings. */
  rank: number | null
  createdAt: ISODateString
}

/** A project as seen by its owner, with the standings folded in. */
export interface ProjectStanding {
  project: Project
  currentBid: Money
  highestBid: Money
  bidCount: Money
  allTimeRank: number | null
  dailyRank: number | null
  /** Amount needed to take #1 all-time. `0` when already there. */
  amountToTakeTop: Money
  bids: Bid[]
}

export interface Session {
  user: User
  /** Project owned by the signed-in user, if they have submitted one. */
  projectId: string | null
}

export interface PlaceBidInput {
  projectId: string
  amount: Money
}

export interface SubmitProjectInput {
  name: string
  url: string
  tagline: string
  logoUrl: string | null
  amount: Money
}

export interface CredentialsInput {
  email: string
  password: string
  name?: string
}

/** What the UI needs to celebrate (or console) after a bid lands. */
export interface BidReceipt {
  bid: Bid
  project: Project
  allTimeRank: number
  dailyRank: number
  previousAllTimeRank: number | null
  tookTopSpot: boolean
  /** Names of the projects this bid jumped over. */
  passed: string[]
}
