const geoip = require("geoip-lite");
const prisma = require("../Config/DBConnect");

/**
 * Resolve a request's client IP to a country/city using an OFFLINE MaxMind-lite
 * database (geoip-lite). No IP or location data is ever sent to a third party -
 * the lookup is a local table read.
 *
 * `req.ip` already reflects X-Forwarded-For correctly because the app trusts
 * the reverse proxy (see server bootstrap - `app.set("trust proxy", ...)`).
 */
function resolveGeo(req) {
  const ip = (req.ip || "").replace(/^::ffff:/, "");
  if (!ip || ip === "::1" || ip === "127.0.0.1") {
    return { ip, country: "XX", city: "" };
  }
  const hit = geoip.lookup(ip);
  return { ip, country: hit?.country || "XX", city: hit?.city || "" };
}

/**
 * Fire-and-forget visit logger for the admin traffic dashboard. Never throws
 * into the caller - analytics must not be able to break a real request.
 */
async function logVisit({ req, path, productId = null }) {
  try {
    const { ip, country, city } = resolveGeo(req);
    await prisma.visitEvent.create({
      data: {
        path: String(path || req.originalUrl || "/").slice(0, 300),
        productId,
        ip,
        country,
        city,
        referrer: String(req.get?.("referer") || "").slice(0, 300),
        userAgent: String(req.get?.("user-agent") || "").slice(0, 300),
      },
    });
  } catch (err) {
    console.error("[geoTrack] logVisit failed:", err.message);
  }
}

module.exports = { resolveGeo, logVisit };
