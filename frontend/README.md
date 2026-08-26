# TopRank — frontend

A leaderboard you climb with money. Projects hold their position with a bid; anyone can take that
position by bidding more.

Built with **React 19 + TypeScript + Vite + Tailwind v4**. Everything currently runs against an
in-browser demo backend — see [Swapping in the real backend](#swapping-in-the-real-backend).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build
npm run lint
```

## The product in one paragraph

Submit a project with an opening bid. Your bid *is* your rank. Raise it to climb, and hold the spot
until someone outbids you. Two boards: **all time** (every bid ever) and **today** (the last 24
hours), plus **this week**. Ties go to whoever reached the amount first.

## Architecture

```
UI components ──▶ services/*.ts ──▶ ┌ mock/db.ts        (today)
                                    └ http.ts → backend (later)
```

No component imports mock data. Each service module branches on one flag (`USE_MOCK_API`) and
nothing else, so pointing the app at a live API is a `.env` change.

```
src/
  components/
    ui/           design-system primitives (Button, Input, Modal, Tabs, Toast, Avatar…)
    layout/       Header, Footer, Logo, UserMenu
    leaderboard/  Leaderboard, Podium, Row, BidAmount, RankDelta
    bid/          BidModal — the whole bid flow
    project/      submission form + board preview
    home/         Hero, RecentActivity, HowItWorks
    auth/         AuthModal
  context/        Toast, Board (cache invalidation), Auth, BidFlow
                  each split into `*-context.ts` (hook) + `*Provider.tsx` (component)
  hooks/          useAsyncData (loading/success/error), useCountUp, usePageMeta
  services/       leaderboard, bids, projects, auth, activity, http, config
    mock/         seed data, derived leaderboards, latency + failure simulation
  pages/          route components
  types/          the contract both backends produce
```

### Data flow rules

- **Bids are the only source of truth.** Leaderboards, the activity feed and per-project standings
  are all derived from the bid list, so placing a bid moves the ranks, the arrows and the feed
  together.
- **`useAsyncData` is the only fetching primitive.** It always exposes loading / success / error and
  keeps the previous result on screen while the next one loads.
- **`BoardProvider.invalidate()`** is called after any mutation; every view that lists `revision` as
  a dependency refetches. Drop-in replaceable with a query cache later.

## Swapping in the real backend

1. Copy `.env.example` to `.env` and set `VITE_API_BASE_URL`.
2. Implement the endpoints below. Responses use the envelope described in [`API_GUIDE.md`](./API_GUIDE.md).
3. Delete `src/services/mock/` and the `USE_MOCK_API` branches.

| Method | Path                          | Returns             |
|--------|-------------------------------|---------------------|
| GET    | `/leaderboard?period=`        | `Leaderboard`       |
| GET    | `/leaderboard/top`            | `TopSpot`           |
| GET    | `/activity?limit=`            | `ActivityEvent[]`   |
| GET    | `/projects/me`                | `ProjectStanding \| null` |
| GET    | `/projects/:id`               | `ProjectStanding`   |
| POST   | `/projects`                   | `BidReceipt`        |
| GET    | `/projects/:id/bid-context`   | `BidContext`        |
| GET    | `/projects/:id/bids`          | `Bid[]`             |
| POST   | `/bids`                       | `BidReceipt`        |
| GET    | `/auth/session`               | `Session \| null`   |
| POST   | `/auth/sign-in`, `/auth/sign-up`, `/auth/sign-out` | `Session` |

Payment authorisation belongs inside `POST /bids`, before the bid is written. The UI already has
submitting / success / failure states for it.

## Demo controls

Because there is no server, non-happy-path states are reachable with a query flag:

| URL                | What you see                                   |
|--------------------|------------------------------------------------|
| `/?demo=loading`   | Reads never resolve — skeletons stay up         |
| `/?demo=error`     | Reads fail — error states with retry            |
| `/?demo=empty`     | An empty board and an empty activity feed       |

Signing in accepts any email; the password `wrongpass` returns an auth failure so the error state is
demonstrable. Bids placed in the demo live in memory and reset on refresh; the session persists in
`localStorage`.

## Design system

Tokens live in `src/index.css` under `@theme` — colours, type scale, radii, motion. Rules of thumb:

- Dark canvas, hairline borders, almost no shadows. Elevation comes from borders, not blur.
- **One accent** (`--color-brand`, acid lime) reserved for money, primary actions and the #1 spot.
  Silver and bronze mark #2 and #3.
- **All numbers are monospace and tabular** (`.numeric`) so amounts line up down the board.
- Motion is short and only on entrance/hover; everything is disabled under
  `prefers-reduced-motion`.

## Known gaps

- `public/og.svg` is the social card artwork. Rasterise it to `og.png` at deploy time — X, Slack and
  LinkedIn don't render SVG previews.
- Project editing, alerts when you're outbid, and payments are all backend work.
