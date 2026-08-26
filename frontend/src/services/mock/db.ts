import type {
  ActivityEvent,
  Bid,
  BidReceipt,
  Leaderboard,
  LeaderboardEntry,
  LeaderboardPeriod,
  Project,
  ProjectStanding,
  SubmitProjectInput,
  User,
} from '@/types'
import { toAbsoluteUrl, toDomain } from '@/lib/format'
import { API_CODE, ApiError } from '../http'
import { seedPreviousRanks, seedWorld } from './seed'

/**
 * In-memory demo database.
 *
 * Bids are the only source of truth; leaderboards, activity and standings are
 * derived on read. State lives for the lifetime of the tab — a refresh resets
 * the world back to the seed.
 */

const DAY_MS = 86_400_000
const WEEK_MS = 7 * DAY_MS

/** Smallest opening bid a new project can enter with. */
export const MIN_OPENING_BID = 5

const users = new Map<string, User>(seedWorld.users.map((u) => [u.id, u]))
const projects = new Map<string, Project>(seedWorld.projects.map((p) => [p.id, p]))
let bids: Bid[] = [...seedWorld.bids]

/** Ranks from before the most recent bid, per period. */
const previousRanks: Record<LeaderboardPeriod, Map<string, number>> = {
  'all-time': new Map(),
  today: new Map(),
  week: new Map(),
}

/**
 * Seed the "before" snapshot: every seeded project gets an entry, so only
 * projects added during this session read as NEW on the board. The handful of
 * overrides in `seedPreviousRanks` are what produce the movement arrows.
 */
function seedPreviousStandings() {
  const now = Date.now()

  for (const period of Object.keys(previousRanks) as LeaderboardPeriod[]) {
    const overrides = seedPreviousRanks[period]

    for (const [projectId, rank] of rankMap(period, now)) {
      const slug = projects.get(projectId)?.slug
      const override = slug ? overrides[slug] : undefined
      previousRanks[period].set(projectId, override ?? rank)
    }
  }
}

let sequence = 0
const nextId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${sequence++}`

const time = (iso: string) => new Date(iso).getTime()

/**
 * `today` is a rolling 24 hours rather than a calendar day. Same idea, but the
 * board never looks empty just because someone opened the site after midnight.
 */
function periodStart(period: LeaderboardPeriod, now: number): number {
  switch (period) {
    case 'today':
      return now - DAY_MS
    case 'week':
      return now - WEEK_MS
    case 'all-time':
      return Number.NEGATIVE_INFINITY
  }
}

interface Aggregate {
  projectId: string
  amount: number
  bidCount: number
  lastBidAt: string
  leadingBidAt: string
  bidderId: string
}

function aggregate(period: LeaderboardPeriod, now: number): Aggregate[] {
  const since = periodStart(period, now)
  const byProject = new Map<string, Aggregate>()

  for (const bid of bids) {
    const at = time(bid.createdAt)
    if (at < since || at > now) continue

    const current = byProject.get(bid.projectId)
    if (!current) {
      byProject.set(bid.projectId, {
        projectId: bid.projectId,
        amount: bid.amount,
        bidCount: 1,
        lastBidAt: bid.createdAt,
        leadingBidAt: bid.createdAt,
        bidderId: bid.bidderId,
      })
      continue
    }

    current.bidCount += 1
    if (bid.amount > current.amount) {
      current.amount = bid.amount
      current.leadingBidAt = bid.createdAt
      current.bidderId = bid.bidderId
    }
    if (at > time(current.lastBidAt)) current.lastBidAt = bid.createdAt
  }

  // Highest bid wins; on a tie the project that got there first keeps the spot.
  return [...byProject.values()].sort(
    (a, b) => b.amount - a.amount || time(a.leadingBidAt) - time(b.leadingBidAt),
  )
}

function rankMap(period: LeaderboardPeriod, now: number): Map<string, number> {
  const map = new Map<string, number>()
  aggregate(period, now).forEach((row, index) => map.set(row.projectId, index + 1))
  return map
}

export function buildLeaderboard(period: LeaderboardPeriod): Leaderboard {
  const now = Date.now()
  const rows = aggregate(period, now)
  const since = periodStart(period, now)

  const entries: LeaderboardEntry[] = rows.map((row, index) => {
    const project = projects.get(row.projectId)!
    return {
      rank: index + 1,
      previousRank: previousRanks[period].get(row.projectId) ?? null,
      project,
      bidder: users.get(row.bidderId)!,
      amount: row.amount,
      bidCount: row.bidCount,
      lastBidAt: row.lastBidAt,
    }
  })

  const volume = bids
    .filter((bid) => time(bid.createdAt) >= since)
    .reduce((sum, bid) => sum + bid.amount, 0)

  return {
    period,
    entries,
    volume,
    updatedAt: new Date(now).toISOString(),
  }
}

export function buildActivity(limit = 8): ActivityEvent[] {
  const recent = [...bids]
    .sort((a, b) => time(b.createdAt) - time(a.createdAt))
    .slice(0, limit)

  return recent.map((bid) => {
    const at = time(bid.createdAt)
    const before = rankMap('all-time', at - 1)
    const after = rankMap('all-time', at)

    const rankBefore = before.get(bid.projectId) ?? null
    const rankAfter = after.get(bid.projectId) ?? null

    let type: ActivityEvent['type'] = 'bid'
    if (rankBefore === null) type = 'joined'
    else if (rankAfter === 1 && rankBefore !== 1) type = 'takeover'
    else if (rankAfter !== null && rankAfter < rankBefore) type = 'overtake'

    const project = projects.get(bid.projectId)!
    const bidder = users.get(bid.bidderId)!

    return {
      id: `act_${bid.id}`,
      type,
      project: {
        id: project.id,
        slug: project.slug,
        name: project.name,
        domain: project.domain,
        hue: project.hue,
        logoUrl: project.logoUrl,
      },
      bidder: {
        id: bidder.id,
        handle: bidder.handle,
        name: bidder.name,
        hue: bidder.hue,
        avatarUrl: bidder.avatarUrl,
      },
      amount: bid.amount,
      rank: rankAfter,
      createdAt: bid.createdAt,
    }
  })
}

export function findProjectBySlug(slug: string): Project | undefined {
  return [...projects.values()].find((project) => project.slug === slug)
}

export function findProjectByOwner(ownerId: string): Project | undefined {
  return [...projects.values()].find((project) => project.ownerId === ownerId)
}

export function getProject(projectId: string): Project {
  const project = projects.get(projectId)
  if (!project) throw new ApiError(API_CODE.NOT_FOUND, "That project doesn't exist.")
  return project
}

export function getUser(userId: string): User {
  const user = users.get(userId)
  if (!user) throw new ApiError(API_CODE.NOT_FOUND, "That account doesn't exist.")
  return user
}

/** Keeps signed-up users addressable so their bids can resolve to a bidder. */
export function upsertUser(user: User): User {
  users.set(user.id, user)
  return user
}

export function projectBids(projectId: string): Bid[] {
  return bids
    .filter((bid) => bid.projectId === projectId)
    .sort((a, b) => time(b.createdAt) - time(a.createdAt))
}

/** Leading bid across the whole board — the number to beat for #1. */
export function topBid(): number {
  return aggregate('all-time', Date.now())[0]?.amount ?? 0
}

/** Current bid for a project, or 0 if it has never been bid on. */
export function currentBid(projectId: string): number {
  return projectBids(projectId).reduce((max, bid) => Math.max(max, bid.amount), 0)
}

export function buildStanding(projectId: string): ProjectStanding {
  const project = getProject(projectId)
  const history = projectBids(projectId)
  const now = Date.now()

  const allTime = rankMap('all-time', now).get(projectId) ?? null
  const daily = rankMap('today', now).get(projectId) ?? null
  const highest = history.reduce((max, bid) => Math.max(max, bid.amount), 0)
  const leader = topBid()

  return {
    project,
    currentBid: highest,
    highestBid: highest,
    bidCount: history.length,
    allTimeRank: allTime,
    dailyRank: daily,
    amountToTakeTop: allTime === 1 ? 0 : leader + 1,
    bids: history,
  }
}

/** Minimum accepted bid for a project: always one dollar above its own bid. */
export function minimumBid(projectId: string): number {
  const current = currentBid(projectId)
  return current === 0 ? MIN_OPENING_BID : current + 1
}

function snapshotRanks() {
  const now = Date.now()
  for (const period of Object.keys(previousRanks) as LeaderboardPeriod[]) {
    previousRanks[period] = rankMap(period, now)
  }
}

export function insertBid(projectId: string, bidderId: string, amount: number): BidReceipt {
  const project = getProject(projectId)
  const minimum = minimumBid(projectId)

  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
    throw new ApiError(API_CODE.VALIDATION_FAILED, 'Enter a whole dollar amount.')
  }

  if (amount < minimum) {
    throw new ApiError(
      API_CODE.VALIDATION_FAILED,
      `Your bid has to beat your current one — $${minimum.toLocaleString()} or more.`,
    )
  }

  const now = Date.now()
  const before = rankMap('all-time', now)
  const orderBefore = aggregate('all-time', now)
  const previousRank = before.get(projectId) ?? null

  snapshotRanks()

  const bid: Bid = {
    id: nextId('bid'),
    projectId,
    bidderId,
    amount,
    createdAt: new Date(now).toISOString(),
  }
  bids = [...bids, bid]

  const after = rankMap('all-time', Date.now())
  const allTimeRank = after.get(projectId) ?? 1

  const passed = orderBefore
    .filter((row) => {
      const rank = before.get(row.projectId)!
      return row.projectId !== projectId && previousRank !== null && rank < previousRank && rank >= allTimeRank
    })
    .map((row) => projects.get(row.projectId)!.name)

  return {
    bid,
    project,
    allTimeRank,
    dailyRank: rankMap('today', Date.now()).get(projectId) ?? 1,
    previousAllTimeRank: previousRank,
    tookTopSpot: allTimeRank === 1 && previousRank !== 1,
    passed,
  }
}

export function insertProject(input: SubmitProjectInput, owner: User): BidReceipt {
  const domain = toDomain(input.url)

  if (findProjectBySlug(slugify(input.name))) {
    throw new ApiError(API_CODE.VALIDATION_FAILED, 'A project with that name is already on the board.')
  }

  if ([...projects.values()].some((project) => project.domain === domain)) {
    throw new ApiError(API_CODE.VALIDATION_FAILED, `${domain} is already on the board.`)
  }

  if (input.amount < MIN_OPENING_BID) {
    throw new ApiError(
      API_CODE.VALIDATION_FAILED,
      `Opening bids start at $${MIN_OPENING_BID}.`,
    )
  }

  if (!users.has(owner.id)) users.set(owner.id, owner)

  const project: Project = {
    id: nextId('prj'),
    slug: slugify(input.name),
    name: input.name.trim(),
    domain,
    url: toAbsoluteUrl(input.url),
    tagline: input.tagline.trim(),
    logoUrl: input.logoUrl,
    hue: Math.floor(Math.random() * 360),
    ownerId: owner.id,
    createdAt: new Date().toISOString(),
  }

  projects.set(project.id, project)

  return insertBid(project.id, owner.id, input.amount)
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Runs last: the helpers above are `const` arrow functions, so this can only be
// called once the whole module body has been evaluated.
seedPreviousStandings()
