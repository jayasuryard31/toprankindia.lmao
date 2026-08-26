const { URL } = require("url");

function normalizeUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    let normalized = `${parsed.protocol}//${parsed.hostname}`;
    if (parsed.port) {
      normalized += `:${parsed.port}`;
    }
    let path = parsed.pathname.replace(/\/+$/, "");
    if (path === "") path = "/";
    normalized += path + parsed.search;
    return normalized.toLowerCase();
  } catch {
    return urlString.toLowerCase().replace(/\/+$/, "");
  }
}

module.exports = { normalizeUrl };
