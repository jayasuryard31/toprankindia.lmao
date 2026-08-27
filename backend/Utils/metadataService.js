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

  // 1. Scrape header / nav / logo images directly from index.html
  let indexHtmlLogo = "";
  const logoSelectors = [
    'header img[src*="logo" i]',
    'nav img[src*="logo" i]',
    '.logo img',
    '#logo img',
    '[class*="logo"] img',
    '[id*="logo"] img',
    'a.brand img',
    'a.navbar-brand img',
    'header img',
    'nav img',
    'img[alt*="logo" i]',
    'img[src*="logo" i]',
    'img[src*="brand" i]',
  ];

  for (const selector of logoSelectors) {
    const el = $(selector).first();
    const candidate = el.attr("src") || el.attr("data-src") || el.attr("data-lazy-src");
    if (candidate && !candidate.startsWith("data:image/svg+xml;base64,PHN2ZyB3aWR0aD")) {
      indexHtmlLogo = candidate;
      break;
    }
  }

  // 2. Open Graph & Twitter hero images
  const ogImage = $('meta[property="og:image"]').attr("content") ||
    $('meta[property="og:image:secure_url"]').attr("content") ||
    $('meta[name="twitter:image"]').attr("content") ||
    $('meta[name="twitter:image:src"]').attr("content") ||
    $('link[rel="image_src"]').attr("href") || "";

  // 3. Apple Touch Icons & High-Res Icons
  const appleTouchIcon = $('link[rel="apple-touch-icon"]').attr("href") ||
    $('link[rel="apple-touch-icon-precomposed"]').attr("href") ||
    $('link[rel="icon"][sizes*="192"]').attr("href") ||
    $('link[rel="icon"][sizes*="180"]').attr("href") ||
    $('link[rel="icon"][sizes*="128"]').attr("href") ||
    $('link[rel="icon"]').attr("href") || "";

  // 4. Hero / Banner image in index.html body
  const heroImage = $('[class*="hero"] img, [class*="banner"] img, main img, section img').first().attr("src") || "";

  // Resolve best logo / image from index.html
  const bestImage = indexHtmlLogo || ogImage || appleTouchIcon || heroImage;
  const logoUrl = resolveUrl(websiteUrl, bestImage) || "";
  const faviconUrl = resolveUrl(websiteUrl, appleTouchIcon || $('link[rel="icon"]').attr("href") || "/favicon.ico") || "";

  return {
    websiteName,
    description,
    logoUrl,
    faviconUrl,
  };
}

module.exports = { fetchMetadata };
