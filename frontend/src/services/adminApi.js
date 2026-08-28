const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Deliberately separate from services/api.js: the admin secret must be sent
 * as a header on every request and a wrong/missing one needs to surface as a
 * distinguishable 401, not just "request failed" — worth its own tiny client
 * rather than bending the shared one.
 */
export async function getAdminStats(code) {
  const res = await fetch(`${BASE_URL}/admin/stats`, {
    headers: { "x-admin-code": code || "" },
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) {
    const err = new Error("Invalid admin code");
    err.status = 401;
    throw err;
  }
  if (!res.ok || (json.responseCode !== 1000 && json.responseCode !== 1001)) {
    const err = new Error(json.responseMessage || "Request failed");
    err.status = res.status;
    throw err;
  }
  return json.responseData;
}

/** Fire-and-forget page-view beacon for the traffic dashboard. */
export function trackVisit(path) {
  try {
    fetch(`${BASE_URL}/track/visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* best-effort only */
  }
}
