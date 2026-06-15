// Shared text helpers: sentence segmentation, normalization, and matching.
// No dependencies — uses the built-in Intl.Segmenter where available.

const segmenterCache = new Map();

function getSegmenter(lang) {
  const locale = lang || "en";
  if (!segmenterCache.has(locale)) {
    let seg = null;
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      try {
        seg = new Intl.Segmenter(locale, { granularity: "sentence" });
      } catch {
        seg = new Intl.Segmenter("en", { granularity: "sentence" });
      }
    }
    segmenterCache.set(locale, seg);
  }
  return segmenterCache.get(locale);
}

// Split a block of text into trimmed sentences.
export function splitSentences(text, lang) {
  if (!text) return [];
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const seg = getSegmenter(lang);
  let parts;
  if (seg) {
    parts = Array.from(seg.segment(clean), (s) => s.segment);
  } else {
    // Fallback: split on sentence-ending punctuation followed by a space + capital.
    parts = clean.split(/(?<=[.!?…])\s+(?=[“"'(\p{Lu}])/u);
  }
  return parts.map((s) => s.trim()).filter(Boolean);
}

// Lowercase + collapse whitespace, for matching only (never for display).
export function normalize(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function wordCount(text) {
  const t = String(text || "").trim();
  return t ? t.split(/\s+/).length : 0;
}

// Drop the leading word: "a b c" -> "b c". Returns "" when nothing remains.
export function dropFirstWord(text) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  return words.slice(1).join(" ");
}

// Decode HTML entities and strip tags/markup that appear in API snippets.
export function cleanHtml(input) {
  if (!input) return "";
  let s = String(input);
  // Remove the {{{ }}} highlight markers used by Open Library search-inside.
  s = s.replace(/\{\{\{|\}\}\}/g, "");
  // Strip tags (e.g. <b>…</b>, <br>).
  s = s.replace(/<[^>]*>/g, " ");
  // Decode entities via the DOM (handles &amp; &#39; &nbsp; etc.).
  if (typeof document !== "undefined") {
    const el = document.createElement("textarea");
    el.innerHTML = s;
    s = el.value;
  } else {
    s = s
      .replace(/&amp;/g, "&")
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  }
  return s.replace(/\s+/g, " ").trim();
}

// True when a fragment reads like real running text rather than OCR noise
// (page numbers, music chords like "E7 D7 A", catalog codes, scan artifacts,
// or mixed-script garbage like "In other 换句话说 In other words"). Deliberately
// lenient: mid-sentence fragments are welcome in an exquisite corpse — only
// outright noise is rejected. We require at least two words, a high proportion
// of letters, a dominant (Latin) script, and few digit/lone-letter "words".
export function looksLikeText(fragment) {
  const t = String(fragment || "").trim();
  if (wordCount(t) < 2) return false; // rejects bare "Having", page numbers
  const nonspace = t.replace(/\s+/g, "").length;
  if (!nonspace) return false;
  const letters = (t.match(/\p{L}/gu) || []).length;
  if (letters / nonspace < 0.6) return false; // too many digits/symbols
  // Reject CJK / Kana / Hangul outright — in these English-language scanned
  // sources they are always OCR garbage (e.g. "In other 换句话说 In other words").
  if (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(t)) return false;
  // And require letters to be predominantly Latin so other mixed-script noise is
  // rejected too. (Latin covers accented European text like "café", "señor".)
  const latin = (t.match(/\p{Script=Latin}/gu) || []).length;
  if (letters > 0 && latin / letters < 0.9) return false;
  const tokens = t.split(/\s+/);
  const junk = tokens.filter((w) => {
    const core = w.replace(/[^\p{L}]/gu, "");
    return /\d/.test(w) || core.length <= 1; // numbers or lone letters (chords)
  }).length;
  if (junk / tokens.length > 0.34) return false;
  return true;
}

// Given an array of sentences and a phrase, return the sentence that FOLLOWS
// the first sentence containing the phrase. Returns null if there is no match
// or the match is the last sentence (i.e. no usable "next").
//
// With { requireText: true } (used for scanned-book sources) the candidate must
// pass looksLikeText, which keeps real-word fragments but rejects OCR noise.
export function findNextSentence(sentences, phrase, { requireText = false } = {}) {
  const needle = normalize(phrase);
  if (!needle) return null;
  for (let i = 0; i < sentences.length - 1; i++) {
    if (normalize(sentences[i]).includes(needle)) {
      const next = sentences[i + 1].trim();
      if (!next) continue;
      if (requireText && !looksLikeText(next)) continue;
      return next;
    }
  }
  return null;
}
