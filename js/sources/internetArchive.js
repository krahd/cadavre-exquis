// CO-PRIMARY source — Internet Archive (full text of books).
//
// Uses Open Library "Search Inside", which performs full-text search across
// the Internet Archive's scanned books. Free, no key, CORS-enabled. Each hit
// carries an IA identifier plus `highlight.text` snippets that usually already
// contain the sentence following the match. Real title/author come from the
// archive.org metadata API. Best provenance + reliability of the three sources.

import { fetchJSON, fetchText, delay } from "./http.js";
import { splitSentences, findNextSentence, cleanHtml } from "../sentences.js";

const SEARCH = "https://openlibrary.org/search/inside.json";
const META = (id) => `https://archive.org/metadata/${encodeURIComponent(id)}`;
const FULLTEXT = (id) =>
  `https://archive.org/download/${encodeURIComponent(id)}/${encodeURIComponent(id)}_djvu.txt`;
const DETAILS = (id) => `https://archive.org/details/${encodeURIComponent(id)}`;

const metaCache = new Map();

async function getAttribution(id, signal) {
  if (metaCache.has(id)) return metaCache.get(id);
  let attribution = { title: id, author: null, url: DETAILS(id), source: "Internet Archive" };
  try {
    const meta = await fetchJSON(META(id), { signal });
    const m = meta.metadata || {};
    const author = Array.isArray(m.creator) ? m.creator[0] : m.creator || null;
    attribution = {
      title: m.title || id,
      author: author || null,
      url: DETAILS(id),
      source: "Internet Archive",
    };
  } catch {
    /* fall back to the id-based attribution */
  }
  metaCache.set(id, attribution);
  return attribution;
}

export default {
  id: "internetArchive",
  label: "Internet Archive",
  supportsLang: false,

  async findNext(phrase, { used, opts = {}, signal }) {
    await delay(250, signal);

    const params = new URLSearchParams({ q: `"${phrase}"` });
    const data = await fetchJSON(`${SEARCH}?${params}`, { signal });
    const hits = data?.hits?.hits || [];

    for (const hit of hits) {
      const fields = hit.fields || {};
      const id = Array.isArray(fields.identifier) ? fields.identifier[0] : fields.identifier;
      if (!id || used.has(id)) continue;

      // Primary: look for the next sentence inside the highlight snippets.
      // Keep real-word fragments (welcome in an exquisite corpse) but skip OCR
      // noise from the scans.
      const snippets = (hit.highlight?.text || []).map(cleanHtml).filter(Boolean);
      let next = null;
      for (const snip of snippets) {
        next = findNextSentence(splitSentences(snip), phrase);
        if (next) break;
      }

      // Precision fallback: scan the full book text. Off by default because the
      // text files can be large.
      if (!next && opts.iaFullText) {
        try {
          const full = await fetchText(FULLTEXT(id), { signal });
          next = findNextSentence(splitSentences(cleanHtml(full)), phrase);
        } catch {
          /* item may not have a plain-text derivative */
        }
      }

      if (!next) continue;

      const attribution = await getAttribution(id, signal);
      return { nextSentence: next, item: { id, title: attribution.title, attribution } };
    }
    return null;
  },
};
