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

// Lowercase + collapse whitespace, for matching/searching only (never for
// display). Also strips leading/trailing punctuation so a phrase that ends a
// sentence (e.g. "…across the sky.") still matches where it appears mid-text
// (e.g. "…across the sky and vanished"), which keeps chains alive.
export function normalize(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

export function wordCount(text) {
  const t = String(text || "").trim();
  return t ? t.split(/\s+/).length : 0;
}

// A loose key identifying the underlying work from a title, so the same book
// retrieved from different sources or editions is recognised as one. Drops
// Wikisource subpage paths, subtitles, parenthetical years/editions, and a
// trailing "by …", then keeps the first few significant words.
export function workKey(title) {
  const t = String(title || "")
    .toLowerCase()
    .split("/")[0] // Wikisource subpage ("Ulysses (1922)/Episode 1")
    .split(":")[0] // subtitle ("Ulysses : a novel")
    .replace(/\([^)]*\)/g, " ") // "(1922)", "(Washington City)"
    .replace(/\bby\s.*$/, " ") // "by James Joyce"
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
  return t.split(/\s+/).filter(Boolean).slice(0, 6).join(" ");
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

// True when a fragment is free of OCR noise (page numbers, music chords like
// "E7 D7 A", catalog codes) and mixed-script garbage ("In other 换句话说 In other
// words"). A building block for isGoodSentence.
export function looksLikeText(fragment) {
  const t = String(fragment || "").trim();
  if (wordCount(t) < 2) return false;
  const nonspace = t.replace(/\s+/g, "").length;
  if (!nonspace) return false;
  const letters = (t.match(/\p{L}/gu) || []).length;
  if (letters / nonspace < 0.6) return false; // too many digits/symbols
  // Reject CJK / Kana / Hangul outright — in these English-language scanned
  // sources they are always OCR garbage.
  if (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(t)) return false;
  // Require letters to be predominantly Latin (covers "café", "señor").
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

// True when a fragment is a heading, banner, table-of-contents/index entry, or
// other non-prose line we never want in the output.
export function isHeadingOrJunk(sentence) {
  const t = String(sentence || "").trim();
  if (!t) return true;
  if (t.includes("=")) return true; // MediaWiki "== Heading =="
  if (!/\p{Ll}/u.test(t)) return true; // no lowercase at all -> a banner ("THE UPANISHADS")
  const upper = (t.match(/\p{Lu}/gu) || []).length;
  const lower = (t.match(/\p{Ll}/gu) || []).length;
  if (upper + lower > 0 && upper / (upper + lower) > 0.45) return true; // mostly caps -> heading
  if (/^\s*(chapter|section|part|appendix|table|figure|index|contents)\b/i.test(t) && !/[.!?]/.test(t))
    return true;
  return false;
}

// The bar for a sentence good enough to put in the composition: real prose, a
// complete sentence (starts like one, ends with terminal punctuation), long
// enough to read as a sentence, and not a heading or OCR garbage. This is what
// "maximise the chance of the text making sense" comes down to.
export function isGoodSentence(sentence) {
  const t = String(sentence || "").trim();
  if (wordCount(t) < 4) return false;
  if (!looksLikeText(t)) return false;
  if (isHeadingOrJunk(t)) return false;
  if (!/^[“"'(¿¡\p{Lu}]/u.test(t)) return false; // starts like a sentence
  if (!/[.!?…][”"'’)]?$/.test(t)) return false; // ends like a sentence (not truncated)
  if (!/\p{Ll}{3,}/u.test(t)) return false; // contains a real (lowercase) word
  return true;
}

// Return the sentence that FOLLOWS a sentence containing the phrase. Checks
// every occurrence and returns the first whose successor passes `accept`
// (defaults to isGoodSentence). Returns null if none qualifies.
export function findNextSentence(sentences, phrase, { accept = isGoodSentence } = {}) {
  const needle = normalize(phrase);
  if (!needle) return null;
  for (let i = 0; i < sentences.length - 1; i++) {
    if (normalize(sentences[i]).includes(needle)) {
      const next = sentences[i + 1].trim();
      if (next && accept(next)) return next;
    }
  }
  return null;
}
