// Library of Congress — Chronicling America historic newspapers (1700s–1900s).
//
// The old chroniclingamerica.loc.gov JSON API is gone; we use the loc.gov
// collection search (CORS *) which returns, per result, a `word_coordinates_url`
// on tile.loc.gov. Appending &full_text=1 yields the page's plain OCR text
// (also CORS *), from which we take the next sentence. OCR is noisy, so the
// quality filter does a lot of work here. LoC rate-limits strictly, so we are
// deliberately gentle.

import { fetchJSON, delay } from "./http.js";
import { splitSentences, findNextSentence } from "../sentences.js";

const SEARCH = "https://www.loc.gov/collections/chronicling-america/";

export default {
  id: "loc",
  label: "Library of Congress",
  supportsLang: false,

  async findNext(phrase, { used, signal }) {
    await delay(500, signal); // LoC blocks aggressive clients — stay polite

    const p = new URLSearchParams({ q: `"${phrase}"`, fo: "json", c: "12", at: "results" });
    const data = await fetchJSON(`${SEARCH}?${p}`, { signal });

    for (const r of data?.results || []) {
      const id = r.id || r.url;
      const wcu = r.word_coordinates_url;
      if (!id || !wcu || used.has(id)) continue;

      let fullText = "";
      try {
        const ft = await fetchJSON(`${wcu}&full_text=1`, { signal });
        fullText = Object.values(ft)[0]?.full_text || "";
      } catch {
        continue; // skip pages whose OCR can't be fetched
      }
      if (!fullText) continue;

      const next = findNextSentence(splitSentences(fullText), phrase);
      if (!next) continue;

      const title = (r.title || "Historic newspaper").replace(/^Image \d+ of /, "");
      return {
        nextSentence: next,
        item: {
          id,
          title,
          attribution: {
            title,
            author: null,
            url: id.replace(/^http:/, "https:"),
            source: "Library of Congress",
          },
        },
      };
    }
    return null;
  },
};
