# cadavre exquis

This is the repo of **cadavre exquis**, an art experiment, an *exquisite corpse* of found sentences. Starting from a sentence you choose, the app searches a
text source for it, takes the **next sentence** from the book (or article) where it was found,
appends it, then searches for *that* sentence in a **different** book — chaining onward until the
passage reaches the length you set. The result reads as one continuous text, but every line comes
from a different source.

When a sentence can't be found anywhere, the app drops its first word and tries again; when nothing
is left to drop, it stops.

Runs **entirely in the browser** — no server, no build step, no backend.

## Sources

Tick one or more (Wikipedia + Wikisource by default). When several are selected, each step searches
them in turn and the passage is woven from all of them.

- **Google Books** — searches book contents via the public snippet around each match (best-effort).
  Free but rate-limited; paste your own free key under **Advanced** if you hit the daily quota.
- **Internet Archive** — full-text search across scanned books via Open Library's "Search Inside".
  No key, no hard quota, real book provenance.
- **Wikisource** — full text of public-domain literature (novels, poetry, speeches). Clean prose.
- **Wikipedia** — reliable, full article text; multiple languages.
- **Wikinews** — contemporary news prose; multiple languages.
- **Wikivoyage** — travel-guide prose; multiple languages.
- **Library of Congress** — OCR full text of historic newspapers (1700s–1900s). Evocative, but the
  search is relevance-ranked and the OCR is noisy, so it contributes sparingly — best combined with
  other sources rather than used alone.

The Wikimedia sources share one host-parameterized adapter (`js/sources/mediawiki.js`). New sources
just implement `findNext(phrase, ctx)` and register in `js/sources/index.js`; `composite.js` weaves
any selection together.

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
