import parseSearchResults from "./parse.mjs";

const CONTENT_TYPES = { comic: "book_comic" };

export async function searchBooks(
  { title, author, isbn13, isbn13s = [], mediaKind, language, limit = 20 } = {},
  key,
  baseUrl,
  host,
  signal
) {
  if (!key) throw host.fail("unauthorized", "An Anna's Archive account key is required.");
  if (!title && !author && !isbn13 && !isbn13s.length) {
    throw host.fail("error", "Provide at least one of: title, author, isbn13, isbn13s.");
  }
  limit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  baseUrl = baseUrl.replace(/\/$/, "");
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
  };

  const login = await host.fetch(`${baseUrl}/account/`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ key }).toString(),
    redirect: "manual",
    signal,
  });
  const setCookies = login.headers.getSetCookie?.() ??
    (login.headers.get("set-cookie") || "").split(/,(?=\s*[A-Za-z0-9_-]+=)/);
  headers.Cookie = setCookies
    .map((c) => c.split(";")[0].trim())
    .filter((c) => c.startsWith("aa_") && c.includes("="))
    .join("; ");
  if (!headers.Cookie) {
    if (login.status === 429) throw host.fail("throttled", "Anna's Archive is rate limiting sign-ins. Try again later.");
    const page = await login.text().catch(() => "");

    if (/invalid secret key/i.test(page)) throw host.fail("unauthorized", "Anna's Archive rejected the key.");
    if (login.status === 403 || /ddos-guard|checking your browser/i.test(page)) {
      throw host.fail("error", `Anna's Archive sign-in was blocked by DDoS-Guard (HTTP ${login.status}).`);
    }
    throw host.fail("error", `Anna's Archive sign-in failed (HTTP ${login.status}, no session cookie).`);
  }

  const isbns = [...new Set([isbn13, ...isbn13s].filter(Boolean).map((s) => String(s).replace(/-/g, "")))];
  const seen = new Map();

  const queries = isbns.map((isbn) => ({ isbn }));
  if (title || author) queries.push({ title, author });

  for (const q of queries) {
    const url = new URL(`${baseUrl}/search`);
    url.searchParams.set("q", q.isbn ?? "");
    let n = 1;
    if (q.title)  { url.searchParams.set(`termtype_${n}`, "title");  url.searchParams.set(`termval_${n++}`, q.title); }
    if (q.author) { url.searchParams.set(`termtype_${n}`, "author"); url.searchParams.set(`termval_${n++}`, q.author); }
    if (CONTENT_TYPES[mediaKind]) url.searchParams.set("content", CONTENT_TYPES[mediaKind]);
    if (language)  url.searchParams.set("lang", language);

    const resp = await host.fetch(url.toString(), { headers, redirect: "manual", signal });

    if (resp.status >= 300 && resp.status < 400) return null;
    if (resp.status === 429) throw host.fail("throttled", "Anna's Archive is rate limiting requests.");
    if (!resp.ok) throw host.fail("error", `Anna's Archive returned HTTP ${resp.status}`);

    for (const r of parseSearchResults(await resp.text(), baseUrl)) {
      if (!seen.has(r.md5)) seen.set(r.md5, r);
    }
    if (seen.size >= limit) break;
  }

  return [...seen.values()].slice(0, limit);
}
