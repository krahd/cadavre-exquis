# cadavre exquis

An *exquisite corpse* of found sentences. Starting from a sentence you choose, the app searches a
text source for it, takes the **next sentence** from the book (or article) where it was found,
appends it, then searches for *that* sentence in a **different** book — chaining onward until the
passage reaches the length you set. The result reads as one continuous text, but every line comes
from a different source.

When a sentence can't be found anywhere, the app drops its first word and tries again; when nothing
is left to drop, it stops.

Runs **entirely in the browser** — no server, no build step, no backend.

## Features

- **Two-column studio** — controls and history on the left, the composed passage on the right.
- **Live status** — a running indicator shows what it's doing (searching, dropping a word, found in…)
  and how many of the target sentences have been collected, so it's always clear it hasn't stalled.
- **Length up to 200 sentences.**
- **Famous first lines** — draw one at random, or browse the full list in a picker.
- **Footnotes** — an optional toggle adds numbered markers and a source list under the passage.
- **Hover provenance** — hover any sentence to see its book/author; click to open the source.
- **History** — past compositions are saved in your browser; click one to revisit it.
- **Export** — copy as text, copy with sources, or download a `.txt`.

## Sources

The work is about **books**:

- **Google Books** *(default)* — searches book contents. Uses the public snippet around each match,
  so the next sentence is best-effort. Free, but rate-limited; without a key the daily quota is
  small and may return an error. You can paste your own free key under **Advanced** (saved only in
  your browser), or switch to Internet Archive.
- **Internet Archive** — full-text search across scanned books via Open Library's "Search Inside".
  No key, no hard quota, real book provenance, and (because full text is available) the most
  reliable next-sentence extraction.
- **Wikipedia** — secondary. Reliable, full article text; supports multiple languages.

New sources can be added by dropping a module into `js/sources/` that implements the same
`findNext(phrase, ctx)` interface and registering it in `js/sources/index.js`.

## Running it

It's just static files. Serve the folder over HTTP (recommended, so the source APIs see a normal
`Origin`):

```sh
cd cadavre-exquis
python3 -m http.server 8000
# then open http://localhost:8000/
```

Deploy by copying the folder to any static host (GitHub Pages, Netlify, etc.). No configuration
required.

## How it works

```
index.html            markup
css/styles.css         sober, literary styling
js/app.js              UI wiring, incremental rendering, hover/click provenance
js/engine.js           the chaining algorithm (source-agnostic)
js/sentences.js        sentence splitting (Intl.Segmenter) + matching helpers
js/sources/            pluggable sources: googleBooks, internetArchive, wikipedia
js/data/firstLines.js  curated famous opening lines for the seed picker
```

Sentences are segmented with the browser's built-in `Intl.Segmenter`. Hover any sentence in the
output to see which book or article it came from; click it to open the source.

## Notes & limitations

- **Google Books** only exposes short snippets, so matches near a snippet boundary may not yield a
  usable next sentence — the app simply moves to the next candidate or drops a word. For the richest
  results, try **Internet Archive**.
- The Google Books API is **free** — there is no billing, only a daily request quota. This project
  embeds no API keys.
- Results are non-deterministic: each composition depends on what the live sources return.
