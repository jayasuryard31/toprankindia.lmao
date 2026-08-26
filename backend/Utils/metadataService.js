const { validateUrlSafety } = require("./ssrfGuard");
const cheerio = require("cheerio");

const FETCH_TIMEOUT = 10000;
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024;
const MAX_REDIRECTS = 5;

async function fetchWithRedirectLimit(url, redirectCount = 0) {
  if (redirectCount > MAX_REDIRECTS) {
    throw new Error("Too many redirects");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "TopRankIndia-Bot/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "manual",
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirect without Location header");
      let redirectUrl;
      try {
        redirectUrl = new URL(location, url).href;
      } catch {
        throw new Error("Invalid redirect URL");
      }
      const safety = validateUrlSafety(redirectUrl);
      if (!safety.valid) {
        throw new Error(`Unsafe redirect: ${safety.reason}`);
      }
      return fetchWithRedirectLimit(redirectUrl, redirectCount + 1);
    }

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function resolveUrl(base, relative) {
  if (!relative) return "";
  try {
    return new URL(relative, base).href;
  } catch {
    return "";
  }
}

async function fetchMetadata(websiteUrl) {
  const safety = validateUrlSafety(websiteUrl);
  if (!safety.valid) {
    throw new Error(`URL validation failed: ${safety.reason}`);
  }

  const response = await fetchWithRedirectLimit(websiteUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch website: HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    throw new Error(`Unsupported content type: ${contentType}`);
  }

  const text = await response.text();
  const html = text.slice(0, MAX_RESPONSE_SIZE);

  const $ = cheerio.load(html);
  const baseUrl = new URL(websiteUrl);

  const ogTitle = $('meta[property="og:title"]').attr("content") || "";
  const titleTag = $("title").text().trim();
  const hostname = baseUrl.hostname.replace(/^www\./, "");

  const websiteName = ogTitle || titleTag || hostname;

  const ogDescription = $('meta[property="og:description"]').attr("content") || "";
  const metaDescription = $('meta[name="description"]').attr("content") || "";
  const description = ogDescription || metaDescription || "";

  const ogImage = $('meta[property="og:image"]').attr("content") || "";
  const appleTouchIcon = $('link[rel="apple-touch-icon"]').attr("href") || "";
  const favicon = $('link[rel="icon"]').attr("href") || "";

  const logoUrl = resolveUrl(websiteUrl, ogImage || appleTouchIcon || favicon) || "";
  const faviconUrl = resolveUrl(websiteUrl, favicon) || "";

  return {
    websiteName,
    description,
    logoUrl,
    faviconUrl,
  };
}

module.exports = { fetchMetadata };
