import { load } from "cheerio/slim";
import { clean, bareTitle } from "./parse.mjs";

const LIBGEN_MIRRORS = ["https://libgen.li", "https://libgen.bz"];

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const LANGUAGE_CODES = {
  english: "en", spanish: "es", french: "fr", german: "de", italian: "it", portuguese: "pt",
  russian: "ru", chinese: "zh", japanese: "ja", korean: "ko", dutch: "nl", polish: "pl",
  swedish: "sv", norwegian: "no", danish: "da", finnish: "fi", czech: "cs", hungarian: "hu",
  greek: "el", turkish: "tr", arabic: "ar", hebrew: "he", hindi: "hi", ukrainian: "uk",
  romanian: "ro", bulgarian: "bg", indonesian: "id", vietnamese: "vi", persian: "fa",
};

const SIZE_UNITS = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 };

function parseRow($, tr, base) {
  const tds = $(tr).children("td");
  if (tds.length < 9) return null;

  const md5 = /(?:md5=|\/book\/)([a-f0-9]{32})/i.exec(tds.eq(8).html() || "")?.[1]?.toLowerCase();
  if (!md5) return null;



  const title = clean(
    tds.eq(0).find("a[href^='edition.php']").filter((_, a) => clean($(a).text()) !== "").first().text()
  );
  if (!title) return null;

  const author = tds.eq(1).find("a").map((_, a) => clean($(a).text()).replace(/\s*\([^)]*\)$/, "")).get()
    .filter(Boolean).join("; ") || clean(tds.eq(1).text());

  const year = /\b(1[5-9]\d\d|20\d\d)\b/.exec(tds.eq(3).text())?.[1] ?? null;
  const languageName = clean(tds.eq(4).text()).split(/[;,]/)[0].trim().toLowerCase();
  const size = /([\d.]+)\s*(b|kb|mb|gb)/i.exec(tds.eq(6).text());
  const format = clean(tds.eq(7).text()).toLowerCase() || null;

  return {
    title,
    bookTitle: bareTitle(title),
    author,
    format,
    language: LANGUAGE_CODES[languageName] ?? null,
    sizeBytes: size ? Math.round(parseFloat(size[1]) * SIZE_UNITS[size[2].toLowerCase()]) : null,
    year,
    url: `${base}/ads.php?md5=${md5}`,
    md5,
  };
}

async function searchOnce(req, res, host, signal) {
  for (const mirror of LIBGEN_MIRRORS) {
    try {
      const url = new URL(`${mirror}/index.php`);
      url.searchParams.set("req", req);
      url.searchParams.set("res", String(res));
      const resp = await host.fetch(url.toString(), { headers: { "User-Agent": USER_AGENT }, signal });
      if (!resp.ok) continue;

      const $ = load(await resp.text());
      const table = $("#tablelibgen");
      if (!table.length) {
        if ($("input[name='req']").length) return [];
        continue;
      }
      return table.find("tr").map((_, tr) => parseRow($, tr, mirror)).get().filter(Boolean);
    } catch (err) {
      if (signal?.aborted) throw err;
    }
  }
  throw host.fail("error", "Library Genesis search failed on every mirror.");
}

export async function searchLibgen(
  { title, author, isbn13, isbn13s = [], limit = 20 } = {},
  host,
  signal
) {
  limit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const res = limit <= 25 ? 25 : 50; 


  const isbns = [...new Set([isbn13, ...isbn13s].filter(Boolean).map((s) => String(s).replace(/-/g, "")))];
  const queries = [...isbns, [title, author].filter(Boolean).join(" ")];
  const seen = new Map();

  for (const req of queries) {
    if (!req) continue;
    for (const r of await searchOnce(req, res, host, signal)) {
      if (!seen.has(r.md5)) seen.set(r.md5, r);
    }
    if (seen.size >= limit) break;
  }

  return [...seen.values()].slice(0, limit);
}
