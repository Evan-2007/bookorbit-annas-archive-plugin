export default function resolveBaseUrl(tld) {
  if (!tld) return BASE_URL;
  const safe = String(tld).trim().replace(/^\.+/, "").toLowerCase();
  if (!/^[a-z]{2,}$/.test(safe)) return BASE_URL;
  const url = new URL(BASE_URL);
  url.hostname = url.hostname.replace(/\.[^.]+$/, `.${safe}`);
  return url.origin;
}
