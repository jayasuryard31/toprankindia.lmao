const ApiResponse = require("../../Globals/ApiResponse");

/**
 * Gate for the admin dashboard. The secret lives ONLY server-side
 * (`process.env.SECRET_CODE`) — it is never bundled into frontend JS, unlike
 * a Vite `VITE_*` env var, which ships in the built bundle for anyone to
 * read. The frontend route is `/admin/stats/:code`; `:code` is forwarded here
 * as a header and checked against the real secret before any data is sent.
 *
 * This is still just a shared-secret URL, not real authentication — treat the
 * link itself as sensitive (don't post it publicly) and rotate SECRET_CODE if
 * it ever leaks.
 */
function requireAdminSecret(req, res, next) {
  const configured = process.env.SECRET_CODE;
  if (!configured) {
    console.error("[Admin] SECRET_CODE is not set — admin stats route is disabled.");
    return res.status(503).json(ApiResponse.result("SERVER_ERROR"));
  }

  const supplied = req.get("x-admin-code") || req.query.code || "";
  if (String(supplied) !== String(configured)) {
    return res.status(401).json(ApiResponse.result("UNAUTHORIZED"));
  }

  next();
}

module.exports = { requireAdminSecret };
