# Frontend ↔ Backend Guide

How to call the backend API from this frontend.

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

Never hardcode the URL in components — read it from `import.meta.env.VITE_API_BASE_URL` (already done in [`api.js`](./api.js)).

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

Defined in `backend/Globals/Response.js`. New codes get added there as the backend grows — treat this table as a snapshot, not a guarantee.

| Code | Meaning           |
|------|-------------------|
| 1000 | Success           |
| 1001 | Created           |
| 1002 | Bad request       |
| 1003 | Validation failed |
| 1004 | Unauthorized      |
| 1005 | Forbidden         |
| 1006 | Not found         |
| 1007 | Server error      |

## Using `api.js`

[`api.js`](./api.js) wraps `fetch`, unwraps `responseData` on success, and throws `new Error(responseMessage)` on any non-success code. Call the exported functions and `try/catch`:

```jsx
import { addNumbers } from '../api'

try {
  const data = await addNumbers(2, 3) // -> { id, a, b, result, createdAt }
  console.log(data.result)
} catch (err) {
  console.error(err.message) // responseMessage from the backend
}
```

To add a new backend call, add a function to `api.js` following the same pattern:

```js
export const myNewCall = (payload) =>
  request('/my-endpoint', { method: 'POST', body: JSON.stringify(payload) })
```

Don't call `fetch` directly from components — always go through `api.js` so the envelope-unwrapping and error handling stay in one place.

## Current endpoints

| Method | Path                    | Body          | `responseData`                              |
|--------|--------------------------|---------------|----------------------------------------------|
| POST   | `/api/addition`           | `{ a, b }`    | `{ id, a, b, result, createdAt }`             |
| GET    | `/api/addition/history`   | –             | `[{ id, a, b, result, createdAt }, ...]`      |

## CORS

The backend allows all origins in dev (`cors()` in `backend/script.js`). If you deploy the frontend to a real domain, tighten this in the backend before going live.
