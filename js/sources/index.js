// Source registry. Order here is the order shown in the UI checkbox list.
// Sources can be combined (see composite.js); defaultSelectedIds are checked on
// first load.

import googleBooks from "./googleBooks.js";
import internetArchive from "./internetArchive.js";
import { wikipedia, wikisource, wikinews, wikivoyage } from "./mediawiki.js";
import loc from "./loc.js";

export const sources = [googleBooks, internetArchive, wikisource, wikipedia, wikinews, wikivoyage, loc];

export const sourcesById = Object.fromEntries(sources.map((s) => [s.id, s]));

// Clean, fast prose by default; the user can add the others.
export const defaultSelectedIds = ["wikipedia", "wikisource"];
