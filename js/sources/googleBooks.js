// PRIMARY source — Google Books.
//
// The REST API only exposes a short `searchInfo.textSnippet` around the match
// (full book text isn't available), so the "next sentence" is best-effort.
// Free, but rate-limited: without a key the anonymous daily quota is small and
// returns HTTP 429. Users can paste their own free key under Advanced.

import { fetchJSON, delay } from "./http.js";
import { splitSentences, findNextSentence, cleanHtml } from "../sentences.js";
import { QuotaError } from "../engine.js";

const ENDPOINT = "https://www.googleapis.com/books/v1/volumes";

export default {
  id: "googleBooks",
  label: "Google Books",
  supportsLang: false,

  async findNext(phrase, { used, opts = {}, signal }) {
    await delay(250, signal); // be polite between queries

    const params = new URLSearchParams({
      q: `"${phrase}"`,
      country: opts.country || "US",
      maxResults: "10",
    });
    if (opts.googleKey) params.set("key", opts.googleKey);

    let data;
    try {
      data = await fetchJSON(`${ENDPOINT}?${params}`, { signal });
    } catch (err) {
      if (err.status === 429 || err.status === 403) {
        throw new QuotaError(
          "Google Books hit its free daily limit. Switch to Internet Archive (also books, full text), or add your own key under Advanced."
        );
      }
      throw err;
    }

    const items = data.items || [];
    for (const item of items) {
      const id = item.id;
      if (!id || used.has(id)) continue;

      const snippet = cleanHtml(item.searchInfo?.textSnippet || "");
      if (!snippet) continue;

      // Only accept a well-formed, complete sentence (findNextSentence defaults
      // to isGoodSentence) so the passage reads sensibly.
      const next = findNextSentence(splitSentences(snippet), phrase);
      if (!next) continue;

      const info = item.volumeInfo || {};
      return {
        nextSentence: next,
        item: {
          id,
          title: info.title || "Untitled",
          attribution: {
            title: info.title || "Untitled",
            author: (info.authors && info.authors[0]) || null,
            url: info.canonicalVolumeLink || info.infoLink || null,
            source: "Google Books",
          },
        },
      };
    }
    return null;
  },
};
