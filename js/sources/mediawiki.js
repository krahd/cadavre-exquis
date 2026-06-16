// Shared adapter for MediaWiki-powered wikis (Wikipedia, Wikisource, Wikinews,
// Wikivoyage). They all expose the same api.php with CORS via origin=*. The
// only differences are the domain and how we fetch a page's plain text:
//   - "extracts": prop=extracts&explaintext (clean; Wikipedia et al.)
//   - "parse":    action=parse&prop=text -> strip HTML (Wikisource, which has
//                 no TextExtracts extension)
// We always fall back to parse when an extract comes back empty.

import { fetchJSON, delay } from "./http.js";
import { splitSentences, findNextSentence, cleanHtml } from "../sentences.js";

const api = (host) => `https://${host}/w/api.php`;

async function getExtract(host, pageid, signal) {
  const p = new URLSearchParams({
    action: "query",
    prop: "extracts",
    explaintext: "1",
    redirects: "1",
    pageids: String(pageid),
    format: "json",
    origin: "*",
  });
  const d = await fetchJSON(`${api(host)}?${p}`, { signal });
  return d?.query?.pages?.[pageid]?.extract || "";
}

async function getParsed(host, title, signal) {
  const p = new URLSearchParams({
    action: "parse",
    page: title,
    prop: "text",
    redirects: "1",
    format: "json",
    origin: "*",
  });
  const d = await fetchJSON(`${api(host)}?${p}`, { signal });
  const html = d?.parse?.text?.["*"] || "";
  if (!html) return "";
  // Drop style/script blocks first (their inner text would survive tag-stripping).
  const stripped = html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ");
  return cleanHtml(stripped);
}

export function makeMediaWiki({ id, label, domain, textMode = "extracts" }) {
  return {
    id,
    label,
    supportsLang: true,

    async findNext(phrase, { used, opts = {}, signal }) {
      await delay(180, signal);
      const lang = opts.lang || "en";
      const host = `${lang}.${domain}`;

      const sp = new URLSearchParams({
        action: "query",
        list: "search",
        srsearch: `"${phrase}"`,
        srnamespace: "0",
        srlimit: "12",
        format: "json",
        origin: "*",
      });
      const data = await fetchJSON(`${api(host)}?${sp}`, { signal });

      for (const r of data?.query?.search || []) {
        const pid = String(r.pageid);
        if (used.has(pid)) continue;

        let text = "";
        if (textMode === "extracts") text = await getExtract(host, pid, signal);
        if (!text.trim()) text = await getParsed(host, r.title, signal);
        if (!text) continue;

        // Drop MediaWiki "== Heading ==" lines.
        text = text.replace(/^\s*=+.*?=+\s*$/gm, "\n");

        const next = findNextSentence(splitSentences(text, lang), phrase);
        if (!next) continue;

        return {
          nextSentence: next,
          item: {
            id: pid,
            title: r.title,
            attribution: {
              title: r.title,
              author: null,
              url: `https://${host}/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}`,
              source: label,
            },
          },
        };
      }
      return null;
    },
  };
}

export const wikipedia = makeMediaWiki({ id: "wikipedia", label: "Wikipedia", domain: "wikipedia.org", textMode: "extracts" });
export const wikisource = makeMediaWiki({ id: "wikisource", label: "Wikisource", domain: "wikisource.org", textMode: "parse" });
export const wikinews = makeMediaWiki({ id: "wikinews", label: "Wikinews", domain: "wikinews.org", textMode: "extracts" });
export const wikivoyage = makeMediaWiki({ id: "wikivoyage", label: "Wikivoyage", domain: "wikivoyage.org", textMode: "extracts" });
