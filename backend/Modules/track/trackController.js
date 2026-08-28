const ApiResponse = require("../../Globals/ApiResponse");
const { logVisit } = require("../../Utils/geoTrack");

/**
 * Page-view beacon. The frontend fires one of these per route change (see
 * App.jsx) so the admin traffic dashboard has real "where visitors land"
 * data beyond just product clicks. Always responds success immediately —
 * this must never be something a client needs to retry or handle errors for.
 */
async function trackVisit(req, res) {
  const path = typeof req.body?.path === "string" ? req.body.path : "/";
  await logVisit({ req, path });
  return res.json(ApiResponse.result("SUCCESS"));
}

module.exports = { trackVisit };
