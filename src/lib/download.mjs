const LIBGEN_MIRRORS = ["https://libgen.li", "https://libgen.bz"];

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

export async function fastDownloadUrl(md5, key, baseUrl, host, signal) {
  if (!key) return null;
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/dyn/api/fast_download.json`);
  url.searchParams.set("md5", md5);
  url.searchParams.set("key", key);

  const resp = await host.fetch(url.toString(), { headers: { "User-Agent": USER_AGENT }, signal });
  let body = null;
  try {
    body = await resp.json();
  } catch {
    return null; // not JSON, e.g. a bot check page
  }
  if (body?.download_url) return body.download_url;
  if (body?.error === "Invalid secret key") throw host.fail("unauthorized", "Anna's Archive rejected the key.");
  return null;
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
