// Source registry. Order here is the order shown in the UI selector;
// the first entry is the default. The work is about books, so Google Books
// leads, Internet Archive follows, and Wikipedia is last.

import googleBooks from "./googleBooks.js";
import internetArchive from "./internetArchive.js";
import wikipedia from "./wikipedia.js";

export const sources = [googleBooks, internetArchive, wikipedia];

export const sourcesById = Object.fromEntries(sources.map((s) => [s.id, s]));

export const defaultSourceId = sources[0].id;
