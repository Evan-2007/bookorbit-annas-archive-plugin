import { load } from "cheerio/slim";

const FORMAT_RE = /\b(epub|pdf|mobi|azw3|azw|fb2|djvu|cbz|cbr|txt|rtf|doc|docx|lit|htm|html)\b/i;

export function clean(text) {
  return (text || "").replace(/\s+/g, " ").trim();
}

function extractFormat(text) {
  const m = FORMAT_RE.exec(text || "");
  return m ? m[1].toLowerCase() : null;
}

const SIZE_UNITS = { b: 1, kb: 1e3, mb: 1e6, gb: 1e9, tb: 1e12 };

function parseMeta(text) {
  const parts = (text || "").split("·").map((p) => clean(p));
  const lang = /\[([a-z]{2,3}(?:-[a-z0-9]+)?)\]/i.exec(text || "");
  const size = parts.map((p) => /^([\d.]+)\s*(b|kb|mb|gb|tb)$/i.exec(p)).find(Boolean);
  const year = parts.find((p) => /^\d{4}$/.test(p));
  return {
    language: lang ? lang[1].toLowerCase() : null,
    format: extractFormat(text),
    sizeBytes: size ? Math.round(parseFloat(size[1]) * SIZE_UNITS[size[2].toLowerCase()]) : null,
    year: year ?? null,
  };
}

export function bareTitle(title) {
  return clean(title.replace(/\s*[\(\[][^\)\]]*[\)\]]/g, "")) || title;
}

function findMetaDiv($, card) {
  return card
    .find("div")
    .filter((_, d) => {
      const text = $(d).text();
      return text.includes("·") && FORMAT_RE.test(text);
    })
    .last();
}

export default function parseSearchResults(html, baseUrl) {
  const $ = load(html);
  const base = baseUrl.replace(/\/$/, "");
  const results = [];


  $("a.js-vim-focus[href^='/md5/']").each((_, el) => {
    const titleLink = $(el);
    const href = titleLink.attr("href") || "";
    const md5 = href.split("/").pop();
    if (!/^[a-f0-9]{32}$/.test(md5)) return;
    const title = clean(titleLink.text());

    let card = titleLink;
    for (let i = 0; i < 6; i++) {
      const parent = card.parent();
      if (parent.length === 0) break;
      card = parent;
      if (card.hasClass("flex") && card.hasClass("pt-3")) break;
    }

    let author = "";
    const authorIcon = card.find("span[class*='icon-[mdi--user-edit]']").first();
    if (authorIcon.length) {
      const authorLink = authorIcon.closest("a");
      if (authorLink.length) author = clean(authorLink.text());
    }

    let coverUrl = null;
    const coverImg = card
      .find("div[id^='list_cover_aarecord_id__'] img")
      .first();
    if (coverImg.length) {
      const src = coverImg.attr("src");
      if (src) {
        coverUrl = src.startsWith("http")
          ? src
          : `${base}/${src.replace(/^\//, "")}`;
      }
    }

    let metaDiv = card
      .find("div.font-semibold.text-sm")
      .filter((__, d) => ($(d).attr("class") || "").includes("leading-[1.2]"))
      .first();
    if (!metaDiv.length) metaDiv = findMetaDiv($, card);
    const meta = parseMeta(metaDiv && metaDiv.length ? metaDiv.text() : "");

    let year = meta.year;
    if (!year) {
      const pubIcon = card.find("span[class*='icon-[mdi--company]']").first();
      const pubYear = /\b(1[5-9]\d\d|20\d\d)\b/.exec(pubIcon.closest("a").text() || "");
      if (pubYear) year = pubYear[1];
    }

    results.push({
      title,
      bookTitle: bareTitle(title),
      author,
      format: meta.format,
      language: meta.language,
      sizeBytes: meta.sizeBytes,
      year,
      downloads: null,
      cover_url: coverUrl,
      url: `${base}/md5/${md5}`,
      md5,
    });
  });

  return results;
}
