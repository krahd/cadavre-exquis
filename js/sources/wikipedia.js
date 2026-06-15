// SECONDARY source — Wikipedia.
//
// Reliable but, per the project's intent, an afterthought next to books. The
// search API finds candidate articles; the extracts API returns full plain
// text, so the "next sentence" is dependable. CORS is enabled via origin=*.

import { fetchJSON, delay } from "./http.js";
import { splitSentences, findNextSentence } from "../sentences.js";

const api = (lang) => `https://${lang || "en"}.wikipedia.org/w/api.php`;

export default {
  id: "wikipedia",
  label: "Wikipedia",
  supportsLang: true,

  async findNext(phrase, { used, opts = {}, signal }) {
    await delay(200, signal);
    const lang = opts.lang || "en";

    const searchParams = new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: `"${phrase}"`,
      srlimit: "15",
      format: "json",
      origin: "*",
    });
    const searchData = await fetchJSON(`${api(lang)}?${searchParams}`, { signal });
    const results = searchData?.query?.search || [];

    for (const r of results) {
      const id = String(r.pageid);
      if (used.has(id)) continue;

      const extractParams = new URLSearchParams({
        action: "query",
        prop: "extracts",
        explaintext: "1",
        redirects: "1",
        pageids: id,
        format: "json",
        origin: "*",
      });
      const extractData = await fetchJSON(`${api(lang)}?${extractParams}`, { signal });
      const page = extractData?.query?.pages?.[id];
      if (!page?.extract) continue;

      // The plaintext extract still contains MediaWiki section headings as
      // lines like "== History ==" — drop those lines so they never appear in
      // the output or get treated as sentences.
      const text = page.extract.replace(/^\s*=+.*?=+\s*$/gm, "\n");

      const next = findNextSentence(splitSentences(text, lang), phrase);
      if (!next) continue;

      return {
        nextSentence: next,
        item: {
          id,
          title: r.title,
          attribution: {
            title: r.title,
            author: null,
            url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}`,
            source: "Wikipedia",
          },
        },
      };
    }
    return null;
  },
};
