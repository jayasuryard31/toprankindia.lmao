export function formatUrlInput(string) {
  if (!string) return "";
  let clean = string.trim();
  if (!/^https?:\/\//i.test(clean)) {
    clean = "https://" + clean;
  }
  return clean;
}

export function extractHostname(string) {
  if (!string) return "";
  try {
    const formatted = formatUrlInput(string);
    const url = new URL(formatted);
    return url.hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

export function getFaviconUrl(string) {
  const host = extractHostname(string);
  if (!host || !host.includes(".")) return "";
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
}

export function isValidUrl(string) {
  if (!string) return false;
  const formatted = formatUrlInput(string);
  try {
    const url = new URL(formatted);
    const host = url.hostname;
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      host.includes(".") &&
      host.split(".").every((part) => part.length > 0) &&
      host.length >= 4
    );
  } catch {
    return false;
  }
}

export function isValidAmount(value) {
  const num = Number(value);
  return !isNaN(num) && num > 0 && Number.isInteger(num);
}
