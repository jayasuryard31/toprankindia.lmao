# Frontend ↔ Backend Guide

How the frontend talks to the backend API.

> **Status:** the UI currently runs against an in-browser demo backend (`src/services/mock`). No
> HTTP calls are made until `VITE_API_BASE_URL` is set. The contract below is what the frontend
> expects once the real API exists.

## Running the backend locally

```bash
cd backend
npm install
npm run dev
```

Server runs at `http://localhost:5000`. Make sure `backend/.env` has a valid `DATABASE_URL`/`DIRECT_URL` (Supabase connection strings) or DB-backed endpoints will fail.

## Base URL

Set in `frontend/.env`:

```
VITE_API_BASE_URL=http://localhost:5000/api
```

Never hardcode the URL in components — read it from `import.meta.env.VITE_API_BASE_URL` (already done in [`src/services/config.ts`](./src/services/config.ts)). Leaving it unset keeps the demo backend on.

## Response envelope

Every backend endpoint returns the same shape, always with HTTP 200:

```json
{
  "responseCode": 1000,
  "responseMessage": "Success",
  "responseData": { }
}
```

- `responseCode` — an app-level code (not an HTTP status). `1000`/`1001` mean success; anything else is an error. See the table below.
- `responseMessage` — human-readable message, safe to show in a toast/alert.
- `responseData` — the actual payload. Its shape depends on the endpoint; on error it's usually a string.

Because HTTP status is always 200, **check `responseCode`, not `res.status`**, to know if a call succeeded.

### Response codes

Defined in `backend/Globals/response.js`, mirrored in [`src/services/http.ts`](./src/services/http.ts) as `API_CODE`. New codes get added there as the backend grows — treat this table as a snapshot, not a guarantee.

| Code | Meaning           | Frontend behaviour                          |
|------|-------------------|---------------------------------------------|
| 1000 | Success           | payload unwrapped                           |
| 1001 | Created           | payload unwrapped                           |
| 1002 | Bad request       | `ApiError` → toast                          |
| 1003 | Validation failed | `ApiError` → inline field error (e.g. bid too low) |
| 1004 | Unauthorized      | `ApiError` → sign-in prompt                 |
| 1005 | Forbidden         | `ApiError` → toast                          |
| 1006 | Not found         | `ApiError` → "not found" state              |
| 1007 | Server error      | `ApiError` → error state with retry         |

## The service layer

Components never call `fetch`. They call a **service**, and each service decides between the demo
backend and HTTP:

```
components ──▶ services/leaderboard.ts ──▶ ┌ mock/db.ts   (VITE_API_BASE_URL unset)
                                           └ http.ts      (VITE_API_BASE_URL set)
```

[`src/services/http.ts`](./src/services/http.ts) wraps `fetch`, unwraps `responseData` on success, and throws an
`ApiError` carrying the app-level code on anything else. A service looks like this:

```ts
export function getLeaderboard(period: LeaderboardPeriod): Promise<Leaderboard> {
  if (!USE_MOCK_API) {
    return http.get<Leaderboard>(`/leaderboard?period=${period}`)
  }
  return simulate(() => buildLeaderboard(period), { failable: true })
}
```

To add a backend call, add a function to the service module that owns that resource — not to a
component, and not to a new one-off `fetch`.

Errors surface through `toErrorMessage(error)`, which returns `responseMessage` for `ApiError` and a
generic fallback otherwise. `useAsyncData` already does this for every read.

## Endpoints the frontend expects

Payload types are defined in [`src/types/index.ts`](./src/types/index.ts) — that file is the contract.

| Method | Path                        | Body                          | `responseData`            |
|--------|-----------------------------|-------------------------------|---------------------------|
| GET    | `/leaderboard?period=`      | –                             | `Leaderboard`             |
| GET    | `/leaderboard/top`          | –                             | `TopSpot`                 |
| GET    | `/activity?limit=`          | –                             | `ActivityEvent[]`         |
| GET    | `/projects/me`              | –                             | `ProjectStanding \| null` |
| GET    | `/projects/:id`             | –                             | `ProjectStanding`         |
| POST   | `/projects`                 | `SubmitProjectInput`          | `BidReceipt`              |
| GET    | `/projects/:id/bid-context` | –                             | `BidContext`              |
| GET    | `/projects/:id/bids`        | –                             | `Bid[]`                   |
| POST   | `/bids`                     | `PlaceBidInput`               | `BidReceipt`              |
| GET    | `/auth/session`             | –                             | `Session \| null`         |
| POST   | `/auth/sign-in`             | `{ email, password }`         | `Session`                 |
| POST   | `/auth/sign-up`             | `{ email, password, name }`   | `Session`                 |
| POST   | `/auth/sign-out`            | –                             | `null`                    |

Notes for whoever builds these:

- **Ranking rule.** Highest bid holds the position; ties break toward the earlier bid. `today` is a
  rolling 24 hours in the demo — swap it for a calendar day if that's the product decision.
- **`previousRank`** on a leaderboard entry drives the ▲/▼ arrows. Send `null` for entries that
  weren't on the board before.
- **Minimum bid.** The demo enforces "one dollar above your own current bid" (`$5` to open) and
  returns `1003` with a human message when it's not met. The bid form renders that message inline.
- **Payments** belong inside `POST /bids`: authorise first, write the bid second. The UI's
  submitting/success/failure states already cover the latency.

## Auth

`services/auth.ts` is deliberately thin — the app only ever asks for a `Session`. Session state is
kept in `AuthProvider`; the demo persists a user in `localStorage`, a real build would use an
httpOnly cookie (`http.ts` already sends `credentials: 'include'`). Google sign-in is stubbed at
`signInWithGoogle()` and redirects to `/auth/google` once `VITE_API_BASE_URL` is set.

## CORS

The backend allows all origins in dev (`cors()` in `backend/script.js`). Cookie-based sessions need
`credentials: true` plus an explicit origin — tighten this before going live.
