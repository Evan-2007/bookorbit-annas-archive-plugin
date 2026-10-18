const LIBGEN_MIRRORS = ["https://libgen.li", "https://libgen.bz"];

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const DEFAULT_FAST_DOMAINS_TO_TRY = 2;
const MAX_FAST_DOMAINS_TO_TRY = 5;
const REACHABLE_TIMEOUT_MS = 3000;

export async function fastDownloadUrl(md5, key, baseUrl, host, signal, serversToTry) {
  if (!key) return null;
  const parsed = Number.parseInt(serversToTry, 10);
  const domainsToTry = Number.isFinite(parsed)
    ? Math.min(Math.max(parsed, 1), MAX_FAST_DOMAINS_TO_TRY)
    : DEFAULT_FAST_DOMAINS_TO_TRY;
  const api = new URL(`${baseUrl.replace(/\/$/, "")}/dyn/api/fast_download.json`);
  api.searchParams.set("md5", md5);
  api.searchParams.set("key", key);

  const spare = new AbortController();
  const spareSignal = signal ? AbortSignal.any([signal, spare.signal]) : spare.signal;

  const lookup = async (index, lookupSignal) => {
    const url = new URL(api);
    url.searchParams.set("domain_index", String(index));
    const resp = await host.fetch(url.toString(), { headers: { "User-Agent": USER_AGENT }, signal: lookupSignal });
    let body = null;
    try {
      body = await resp.json();
    } catch {
      return null;
    }
    if (body?.error === "Invalid secret key") throw host.fail("unauthorized", "Anna's Archive rejected the key.");
    return body?.download_url ?? null;
  };

  const lookups = [...Array(domainsToTry).keys()].map((i) => {
    if (i === 0) return lookup(0, signal);
    const pending = lookup(i, spareSignal).catch((err) => {
      if (signal?.aborted) throw err;
      return null;
    });
    pending.catch(() => {});
    return pending;
  });

  try {
    for (const [i, pending] of lookups.entries()) {
      const downloadUrl = await pending;
      if (downloadUrl === null) {
        if (i === 0) return null;
        continue;
      }
      if (await isServerUp(downloadUrl, REACHABLE_TIMEOUT_MS, host, signal)) return downloadUrl;
    }
    return null;
  } finally {
    spare.abort();
  }
}

async function isServerUp(downloadUrl, timeoutMs, host, signal) {
  const signals = [signal, AbortSignal.timeout(timeoutMs)].filter(Boolean);
  try {
    const resp = await host.fetch(`${new URL(downloadUrl).origin}/`, {
      method: "HEAD",
      headers: { "User-Agent": USER_AGENT },
      redirect: "manual",
      signal: AbortSignal.any(signals),
    });
    return resp.status < 500; 
  } catch (err) {
    if (signal?.aborted) throw err;
    return false;
  }
}

export async function libgenDownloadUrl(md5, host, signal) {
  for (const mirror of LIBGEN_MIRRORS) {
    try {
      const resp = await host.fetch(`${mirror}/ads.php?md5=${md5}`, { headers: { "User-Agent": USER_AGENT }, signal });
      if (!resp.ok) continue;
      const link = /href="(get\.php\?md5=[a-f0-9]{32}&(?:amp;)?key=[A-Za-z0-9]+)"/i.exec(await resp.text());
      if (link) return `${mirror}/${link[1].replace(/&amp;/g, "&")}`;
    } catch (err) {
      if (signal?.aborted) throw err;
    }
  }
  return null;
}
