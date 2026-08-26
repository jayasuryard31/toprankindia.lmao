# TopRankIndia — Frontend Integration Guide

## Base URL

```
http://localhost:5000/api
```

## Response Format

Every API returns this envelope:

```json
{
  "responseCode": 1000,
  "responseMessage": "Success",
  "responseData": { ... }
}
```

### Response Codes

| Code | Message |
|------|---------|
| 1000 | Success |
| 1001 | Created successfully |
| 1002 | Bad request |
| 1003 | Validation failed |
| 1004 | Unauthorized |
| 1005 | Forbidden |
| 1006 | Resource not found |
| 1007 | Something went wrong |
| 1008 | Payment verification failed |

---

## API Details

| Method | Endpoint | Request Body / Query | Response (`responseData`) | Comments |
|--------|----------|----------------------|---------------------------|----------|
| **POST** | `/payments/create-order` | `{ "websiteUrl": "https://example.com", "categoryId": 2, "amount": 5000 }` | `{ "orderId": "order_xxx", "amount": 5000, "currency": "INR" }` | Validates URL, category, amount. Creates Razorpay order. `amount` is in INR (integer). |
| **POST** | `/payments/verify` | `{ "razorpayOrderId": "order_xxx", "razorpayPaymentId": "pay_xxx", "razorpaySignature": "sig" }` | `{ "product": { "id", "websiteName", "websiteUrl", "description", "logoUrl", "category": { "id", "name" }, "currentAmount", "currency", "categoryRank", "allTimeRank" } }` | Verifies Razorpay signature server-side. Creates/updates product. Fetches website metadata. Returns created product with ranks. |
| **POST** | `/payments/webhook` | Razorpay webhook payload | `{ "status": "ok" }` | Razorpay server-to-server. Do not call from frontend. |
| **GET** | `/products` | Query: `page` (default 1), `limit` (default 20, max 100), `categoryId`, `search`, `sort` (`rank`/`amount`/`newest`), `period` (`all`/`today`) | `{ "data": [Product], "pagination": { "page", "limit", "total", "totalPages" } }` | Paginated product list. Filter by category, search by name/url/description. `sort=rank` orders by `currentAmount DESC, createdAt ASC`. `period=today` filters to IST calendar day. |
| **GET** | `/products/top` | Query: `limit` (default 3, max 20) | `[ { "rank": 1, "id", "websiteName", "websiteUrl", "description", "logoUrl", "currentAmount", "currency", "category": { "id", "name" } } ]` | Top N products for homepage leaderboard. |
| **GET** | `/products/:id` | — | `{ "id", "websiteName", "websiteUrl", "description", "logoUrl", "faviconUrl", "category": { "id", "name" }, "currentAmount", "currency", "categoryRank", "allTimeRank", "clickCount", "totalBids", "createdAt", "updatedAt" }` | Single product detail page. |
| **POST** | `/products/:id/click` | — | `{ "clickCount": 123 }` | Atomically increments click count. No body needed. |
| **GET** | `/categories` | — | `[ { "id": 1, "name": "AI Agents & Infrastructure", "productCount": 25, "highestAmount": 17000 }, ... ]` | All 15 categories with live product counts and highest paid amount. |
| **GET** | `/stats` | — | `{ "totalCollected": 1360657, "currency": "INR", "totalProducts": 245, "totalPayments": 912, "totalCategories": 15, "activeProducts": 240 }` | Platform-wide statistics. |
| **GET** | `/stats/total-collected` | — | `{ "totalAmount": 1360657, "currency": "INR" }` | Total successfully collected revenue. |
| **GET** | `/home` | — | `{ "stats": { "totalCollected", "totalProducts" }, "topProducts": [TopProduct], "categories": [Category], "todayTopProducts": [TopProduct] }` | Single homepage API. Returns stats, top products, categories, and today's top. |

---

## Product Object

```json
{
  "id": "clxyz123",
  "websiteName": "Example AI",
  "websiteUrl": "https://example.com",
  "description": "AI platform for everyone",
  "logoUrl": "https://example.com/og-image.png",
  "faviconUrl": "https://example.com/favicon.ico",
  "category": {
    "id": 1,
    "name": "AI Agents & Infrastructure"
  },
  "currentAmount": 17000,
  "currency": "INR",
  "categoryRank": 1,
  "allTimeRank": 1,
  "clickCount": 123,
  "totalBids": 3,
  "createdAt": "2026-08-26T10:00:00.000Z",
  "updatedAt": "2026-08-26T12:00:00.000Z"
}
```

---

## Top Product Object

Returned by `/products/top` and `/home`:

```json
{
  "rank": 1,
  "id": "clxyz123",
  "websiteName": "Example AI",
  "websiteUrl": "https://example.com",
  "description": "AI platform for everyone",
  "logoUrl": "https://example.com/og-image.png",
  "currentAmount": 17000,
  "currency": "INR",
  "category": {
    "id": 1,
    "name": "AI Agents & Infrastructure"
  }
}
```

---

## Category Object

```json
{
  "id": 1,
  "name": "AI Agents & Infrastructure",
  "productCount": 25,
  "highestAmount": 17000
}
```

---

## Categories List

| ID | Name |
|----|------|
| 1 | AI Agents & Infrastructure |
| 2 | SEO & AI Visibility |
| 3 | Marketing & Advertising |
| 4 | Content & Copywriting |
| 5 | Image & Video Generation |
| 6 | Productivity & Automation |
| 7 | Code & Development |
| 8 | Data & Analytics |
| 9 | Customer Support |
| 10 | Education & Learning |
| 11 | Finance & Accounting |
| 12 | Design & Creative |
| 13 | HR & Recruitment |
| 14 | Sales & CRM |
| 15 | Other |

---

## Frontend Flow

```
1. User enters website URL
2. User selects category (from GET /api/categories)
3. User enters amount (positive integer in INR)
4. User clicks "Go Top"
5. Call POST /api/payments/create-order
6. Open Razorpay Checkout with returned orderId
7. User completes payment
8. Call POST /api/payments/verify with Razorpay response
9. Reload homepage
10. Call GET /api/home to get updated leaderboard
```

### Razorpay Checkout Integration

After step 5, open Razorpay with:

```js
const options = {
  key: "YOUR_RAZORPAY_KEY_ID",          // from env, not from backend
  amount: order.amount * 100,            // paise
  currency: order.currency,
  name: "TopRankIndia",
  order_id: order.orderId,
  handler: function (response) {
    // response.razorpay_payment_id
    // response.razorpay_order_id
    // response.razorpay_signature
    // → Call POST /api/payments/verify
  },
};
```

---

## Validation Rules

### create-order

| Field | Rule |
|-------|------|
| `websiteUrl` | Required. Must be valid URL. Only `http://` and `https://` allowed. |
| `categoryId` | Required. Must be integer 1–15. |
| `amount` | Required. Must be positive integer (INR). |

### verify

| Field | Rule |
|-------|------|
| `razorpayOrderId` | Required. |
| `razorpayPaymentId` | Required. |
| `razorpaySignature` | Required. |

---

## Ranking Logic

- Products sorted by `currentAmount DESC, createdAt ASC, id ASC`
- Higher amount = higher rank
- Equal amounts = earlier payment ranks first
- Category rank: only products in the same category compete
- All-time rank: all active paid products compete

---

## Notes

- Do not send `currentAmount`, `categoryRank`, or `allTimeRank` from frontend — always read from API response.
- The `amount` you send to `create-order` is the exact amount charged via Razorpay.
- There is no minimum bid. Any positive integer is accepted.
- Website metadata (name, description, logo) is fetched automatically by the backend after payment.
- Duplicate URLs update the existing product's amount, not create a new one.
- Webhook (`/payments/webhook`) is for Razorpay server-to-server only — do not call from frontend.
