import type { Bid, LeaderboardPeriod, Project, User } from '@/types'

/**
 * Demo dataset.
 *
 * Everything the mock backend serves is derived from `seedBids` — leaderboards,
 * the activity feed and per-project standings are all computed, never
 * hand-written. That keeps the demo internally consistent: place a bid and the
 * standings, the feed and the rank arrows all move together.
 */

const MINUTE = 60_000
const DAY = 1440

/** Frozen at module load so relative timestamps stay stable within a session. */
export const BOOT_TIME = Date.now()

const minutesAgo = (minutes: number) =>
  new Date(BOOT_TIME - minutes * MINUTE).toISOString()

interface SeedProject {
  slug: string
  name: string
  domain: string
  tagline: string
  hue: number
  owner: { handle: string; name: string; hue: number }
  /** `[amount, minutesAgo]`, oldest first. */
  bids: [number, number][]
}

const seedProjects: SeedProject[] = [
  {
    slug: 'gaeon',
    name: 'Gaeon',
    domain: 'gaeon.in',
    tagline: 'Ship a full-stack app from a single prompt',
    hue: 82,
    owner: { handle: 'aditi', name: 'Aditi Rao', hue: 12 },
    bids: [
      [300, 9 * DAY],
      [520, 7 * DAY],
      [900, 5 * DAY + 200],
      [1150, 3 * DAY + 60],
      [1420, 2 * DAY + 30],
    ],
  },
  {
    slug: 'nocta',
    name: 'Nocta',
    domain: 'nocta.so',
    tagline: 'Local-first notes that sync before you blink',
    hue: 210,
    owner: { handle: 'marek', name: 'Marek Ilić', hue: 260 },
    bids: [
      [250, 8 * DAY],
      [640, 4 * DAY],
      [905, 1 * DAY + 120],
      [1180, 134],
    ],
  },
  {
    slug: 'pixelforge',
    name: 'PixelForge',
    domain: 'pixelforge.dev',
    tagline: 'Design tokens straight to production components',
    hue: 328,
    owner: { handle: 'junepark', name: 'June Park', hue: 340 },
    bids: [
      [400, 6 * DAY],
      [720, 2 * DAY + 300],
      [950, 1 * DAY + 45],
    ],
  },
  {
    slug: 'chai-compute',
    name: 'Chai Compute',
    domain: 'chaicompute.in',
    tagline: 'GPU hours by the cup, billed by the minute',
    hue: 28,
    owner: { handle: 'rohan', name: 'Rohan Mehta', hue: 45 },
    bids: [
      [220, 5 * DAY],
      [560, 2 * DAY],
      [880, 41],
    ],
  },
  {
    slug: 'slate',
    name: 'Slate',
    domain: 'slate.build',
    tagline: 'Changelogs your users actually read',
    hue: 190,
    owner: { handle: 'elena', name: 'Elena Duarte', hue: 168 },
    bids: [
      [310, 6 * DAY],
      [615, 3 * DAY],
      [815, 660],
    ],
  },
  {
    slug: 'rickshaw',
    name: 'Rickshaw',
    domain: 'rickshaw.dev',
    tagline: 'Preview deploys for monorepos, in seconds',
    hue: 48,
    owner: { handle: 'kavya', name: 'Kavya Nair', hue: 96 },
    bids: [
      [180, 12 * DAY],
      [330, 9 * DAY],
      [500, 6 * DAY],
      [640, 2 * DAY + 180],
      [740, 302],
    ],
  },
  {
    slug: 'loop-ledger',
    name: 'Loop Ledger',
    domain: 'loopledger.io',
    tagline: 'Double-entry books for solo founders',
    hue: 148,
    owner: { handle: 'tobi', name: 'Tobi Adeyemi', hue: 200 },
    bids: [
      [260, 7 * DAY],
      [480, 3 * DAY],
      [690, 1 * DAY + 400],
    ],
  },
  {
    slug: 'marigold',
    name: 'Marigold',
    domain: 'marigold.design',
    tagline: 'Illustration packs made for product teams',
    hue: 38,
    owner: { handle: 'sana', name: 'Sana Qureshi', hue: 300 },
    bids: [
      [200, 5 * DAY],
      [415, 2 * DAY],
      [615, 200],
    ],
  },
  {
    slug: 'hush',
    name: 'Hush',
    domain: 'hush.audio',
    tagline: 'Meeting rooms that cancel the world out',
    hue: 268,
    owner: { handle: 'danw', name: 'Dan Whitfield', hue: 220 },
    bids: [
      [190, 8 * DAY],
      [560, 4 * DAY + 120],
    ],
  },
  {
    slug: 'tiffin',
    name: 'Tiffin',
    domain: 'tiffin.menu',
    tagline: "QR menus restaurants don't hate",
    hue: 8,
    owner: { handle: 'ishan', name: 'Ishan Verma', hue: 22 },
    bids: [
      [150, 3 * DAY],
      [300, 1 * DAY + 30],
      [505, 7],
    ],
  },
  {
    slug: 'fathom-forms',
    name: 'Fathom Forms',
    domain: 'fathomforms.com',
    tagline: 'Forms that fill themselves in',
    hue: 232,
    owner: { handle: 'gracelim', name: 'Grace Lim', hue: 315 },
    bids: [
      [180, 6 * DAY],
      [470, 2 * DAY + 60],
    ],
  },
  {
    slug: 'kalinga',
    name: 'Kalinga',
    domain: 'kalinga.cloud',
    tagline: 'Postgres branching for every pull request',
    hue: 172,
    owner: { handle: 'debjit', name: 'Debjit Sen', hue: 130 },
    bids: [
      [140, 4 * DAY],
      [300, 1 * DAY],
      [425, 96],
    ],
  },
  {
    slug: 'orbital',
    name: 'Orbital',
    domain: 'orbital.gg',
    tagline: 'Matchmaking as a service for indie games',
    hue: 288,
    owner: { handle: 'niko', name: 'Niko Petrov', hue: 285 },
    bids: [
      [120, 9 * DAY],
      [380, 540],
      // A raise that doesn't move anyone — the activity feed needs to say
      // something other than "climbed" now and then.
      [395, 30],
    ],
  },
  {
    slug: 'sundial',
    name: 'Sundial',
    domain: 'sundial.day',
    tagline: 'Time tracking without the guilt',
    hue: 58,
    owner: { handle: 'mira', name: 'Mira Kovač', hue: 8 },
    bids: [
      [100, 10 * DAY],
      [230, 5 * DAY],
      [340, 3 * DAY],
    ],
  },
  {
    slug: 'papercut',
    name: 'Papercut',
    domain: 'papercut.press',
    tagline: 'Newsletters with a spine',
    hue: 350,
    owner: { handle: 'owen', name: 'Owen Blake', hue: 190 },
    bids: [
      [95, 11 * DAY],
      [295, 8 * DAY],
    ],
  },
  {
    slug: 'beacon',
    name: 'Beacon',
    domain: 'beacon.sh',
    tagline: 'Uptime alerts that reach a human',
    hue: 128,
    owner: { handle: 'priya', name: 'Priya Raman', hue: 336 },
    bids: [
      [80, 6 * DAY],
      [160, 2 * DAY],
      [260, 22],
    ],
  },
  {
    slug: 'crate',
    name: 'Crate',
    domain: 'crate.supply',
    tagline: 'Inventory for one-person brands',
    hue: 20,
    owner: { handle: 'lucas', name: 'Lucas Fontaine', hue: 55 },
    bids: [
      [70, 12 * DAY],
      [215, 9 * DAY],
    ],
  },
  {
    slug: 'verdant',
    name: 'Verdant',
    domain: 'verdant.eco',
    tagline: 'Carbon books for small manufacturers',
    hue: 104,
    owner: { handle: 'amara', name: 'Amara Osei', hue: 152 },
    bids: [
      [60, 14 * DAY],
      [180, 10 * DAY],
    ],
  },
]

/** The signed-in persona used by the demo auth service. Owns Rickshaw (#6). */
export const DEMO_USER_HANDLE = 'kavya'

function buildWorld() {
  const users: User[] = []
  const projects: Project[] = []
  const bids: Bid[] = []

  for (const seed of seedProjects) {
    const user: User = {
      id: `usr_${seed.owner.handle}`,
      handle: seed.owner.handle,
      name: seed.owner.name,
      avatarUrl: null,
      hue: seed.owner.hue,
    }
    users.push(user)

    const firstBidMinutes = seed.bids[0]![1]
    projects.push({
      id: `prj_${seed.slug}`,
      slug: seed.slug,
      name: seed.name,
      domain: seed.domain,
      url: `https://${seed.domain}`,
      tagline: seed.tagline,
      logoUrl: null,
      hue: seed.hue,
      ownerId: user.id,
      createdAt: minutesAgo(firstBidMinutes + 30),
    })

    seed.bids.forEach(([amount, minutes], index) => {
      bids.push({
        id: `bid_${seed.slug}_${index + 1}`,
        projectId: `prj_${seed.slug}`,
        bidderId: user.id,
        amount,
        createdAt: minutesAgo(minutes),
      })
    })
  }

  return { users, projects, bids }
}

export const seedWorld = buildWorld()

/**
 * Standings from before the last shake-up, so rank arrows have something to
 * say on first paint. Slugs not listed here are treated as "held position".
 */
export const seedPreviousRanks: Record<LeaderboardPeriod, Record<string, number>> = {
  'all-time': {
    gaeon: 2,
    nocta: 1,
    'chai-compute': 6,
    slate: 4,
    rickshaw: 5,
    tiffin: 13,
    beacon: 17,
    kalinga: 12,
  },
  today: {
    nocta: 2,
    'chai-compute': 1,
    tiffin: 9,
    beacon: 8,
    rickshaw: 3,
    slate: 4,
  },
  week: {
    gaeon: 1,
    nocta: 2,
    'chai-compute': 5,
    slate: 6,
    rickshaw: 4,
    tiffin: 11,
  },
}
