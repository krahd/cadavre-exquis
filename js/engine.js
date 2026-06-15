// The chaining algorithm — entirely source-agnostic.
//
// Start from a seed sentence, search the chosen source for it, take the NEXT
// sentence from the item where it was found, append it, then search for THAT
// sentence in a DIFFERENT item — repeating until `targetLength` sentences have
// been collected. When a phrase can't be found anywhere, drop its FIRST word
// and retry, all the way down to a single word — there is almost always a way
// to continue. Only when even a one-word search finds nothing new do we stop.

import { normalize, dropFirstWord, wordCount } from "./sentences.js";

// A typed error sources can throw to signal "quota / rate limited", so the UI
// can show a helpful message rather than a generic failure.
export class QuotaError extends Error {
  constructor(message) {
    super(message || "Source rate limit reached.");
    this.name = "QuotaError";
  }
}

export async function generate({
  source,
  startSentence,
  seedAttribution = null,
  targetLength = 8,
  opts = {},
  onProgress = () => {},
  signal,
}) {
  const result = [{ text: startSentence.trim(), source: seedAttribution }];
  const used = new Set();
  let phrase = normalize(startSentence);

  const emit = (info) => onProgress(result, { step: result.length, target: targetLength, ...info });

  emit({ phase: "starting", status: "Starting…" });

  let consecutiveErrors = 0;

  while (result.length < targetLength) {
    if (signal?.aborted) break;

    emit({ phase: "searching", phrase, status: `Searching for “${phrase}”…` });

    let found;
    try {
      found = await source.findNext(phrase, { used, opts, signal });
      consecutiveErrors = 0;
    } catch (err) {
      if (err?.name === "AbortError" || signal?.aborted) break;
      if (err instanceof QuotaError) throw err; // explicit quota -> surface and stop
      // A transient error (already retried at the HTTP layer) shouldn't end the
      // whole composition. Skip this search like a miss and keep going — unless
      // it keeps happening, which means a real outage worth surfacing.
      if (++consecutiveErrors >= 6) throw err;
      const stripped = dropFirstWord(phrase);
      if (wordCount(stripped) < 1) break;
      phrase = stripped;
      emit({ phase: "dropping", phrase, status: "Source hiccup — trying a shorter phrase…" });
      continue;
    }

    if (found) {
      used.add(found.item.id);
      result.push({ text: found.nextSentence.trim(), source: found.item.attribution });
      phrase = normalize(found.nextSentence);
      const title = found.item.title || found.item.attribution?.title || "a source";
      emit({ phase: "found", title, status: `Found in “${title}”.` });
    } else {
      // Not found anywhere new — drop the leading word and try the shorter
      // phrase. Keep going until even a single word yields nothing.
      const stripped = dropFirstWord(phrase);
      if (wordCount(stripped) < 1) {
        emit({ phase: "exhausted", status: "No continuation found — stopping.", done: true });
        break;
      }
      phrase = stripped;
      emit({ phase: "dropping", phrase, status: `No match — dropping a word: “${phrase}”` });
    }
  }

  const reason = signal?.aborted
    ? "stopped"
    : result.length >= targetLength
      ? "complete"
      : "exhausted";
  emit({ phase: "done", reason, done: true, status: reasonLabel(reason) });
  return { sentences: result, reason };
}

function reasonLabel(reason) {
  switch (reason) {
    case "stopped":
      return "Stopped.";
    case "complete":
      return "Done — your passage is complete.";
    default:
      return "Reached a rare dead end — here's what was found.";
  }
}
