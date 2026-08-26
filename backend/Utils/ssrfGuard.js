const { isIPv4, isIPv6 } = require("net");
const { URL } = require("url");

const PRIVATE_IP_RANGES = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^169\.254\.\d{1,3}\.\d{1,3}$/,
  /^0\.0\.0\.0$/,
];

const BLOCKED_HOSTNAMES = [
  "localhost",
  "metadata.google.internal",
  "instance-data",
  "169.254.169.254",
];

function isPrivateIP(ip) {
  if (!isIPv4(ip) && !isIPv6(ip)) return true;
  if (ip === "::1" || ip === "::") return true;
  if (isIPv4(ip)) {
    return PRIVATE_IP_RANGES.some((re) => re.test(ip));
  }
  if (isIPv6(ip)) {
    return ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip === "::";
  }
  return false;
}

function validateUrlSafety(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return { valid: false, reason: "Invalid URL format" };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { valid: false, reason: "Only http and https URLs are allowed" };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    return { valid: false, reason: "Blocked hostname" };
  }

  if (isIPv4(hostname) || isIPv6(hostname)) {
    if (isPrivateIP(hostname)) {
      return { valid: false, reason: "Private/internal IP addresses are not allowed" };
    }
  }

  const parts = hostname.split(".");
  if (parts[0] === "169" && parts[1] === "254") {
    return { valid: false, reason: "Link-local addresses are not allowed" };
  }

  return { valid: true };
}

function isPrivateDNS(hostname) {
  const blocked = [
    "localhost",
    "0.0.0.0",
    "127.0.0.1",
    "metadata.google.internal",
  ];
  return blocked.includes(hostname.toLowerCase());
}

module.exports = { validateUrlSafety, isPrivateIP, isPrivateDNS };
