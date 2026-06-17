const messages = {
  en: {
    "meta.description": "An exquisite corpse of found sentences - each line drawn from a different source.",
    "brand.tagline": "a passage of found sentences, each from a different book, article, or archive",
    "seed.label": "Starting sentence",
    "seed.placeholder": "Type a sentence, or draw a famous first line below.",
    "seed.random": "Random",
    "seed.browse": "Browse first lines",
    "sources.legend": "Sources - combine any",
    "lang.appLabel": "Interface language",
    "lang.sourceLabel": "Text language",
    "length.label": "Length",
    "length.unit": "sentences",
    "footnotes.label": "Show footnotes & source list",
    "button.compose": "Compose",
    "button.stop": "Stop",
    "advanced.summary": "Advanced",
    "advanced.googleKey": "Google Books API key (optional)",
    "advanced.googlePlaceholder": "Leave empty to run keyless",
    "advanced.googleHint":
      "Google Books is free but rate-limited. If you hit its daily limit, paste your own free key (saved only in this browser) or use Internet Archive - it needs no key.",
    "advanced.googleHelp": "How to get a key",
    "advanced.iaFullText": "Internet Archive: read full book text for cleaner sentences (slower)",
    "history.title": "History",
    "history.clear": "Clear",
    "history.empty": "Your past compositions will appear here.",
    "history.meta": "{count} {sentences} · {sourceLabel} · {when}",
    "summary.line": "{found} {sentenceWord} from {distinct} {sourceWord} · {sourceLabel}",
    "status.ready": "Ready.",
    "status.readyDetail": "Choose a starting sentence and press Compose.",
    "status.composing": "Composing - {collected} / {target}",
    "status.composingEllipsis": "Composing...",
    "status.searching": "Searching {sourceLabel} for \"{phrase}\"...",
    "status.searchingSeed": "Searching for your starting sentence...",
    "status.dropping": "No match - dropping a word: \"{phrase}\"",
    "status.sourceHiccup": "Source hiccup - trying a shorter phrase...",
    "status.skippingUsed": "Skipping a work already used...",
    "status.found": "Found in \"{title}\".",
    "status.noContinuation": "No continuation found - stopping.",
    "status.stopped": "Stopped.",
    "status.complete": "Done - your passage is complete.",
    "status.exhausted": "Reached a rare dead end - here's what was found.",
    "status.saved": "Saved composition",
    "error.enterSeed": "Enter a starting sentence.",
    "error.enterSeedDetail": "Type one, or draw a famous first line.",
    "error.chooseSource": "Choose at least one source.",
    "error.chooseSourceDetail": "Tick one or more sources to combine.",
    "error.googleQuota": "Google Books daily limit reached",
    "error.generic": "Something went wrong",
    "error.clipboard": "Couldn't access the clipboard.",
    "notice.copied": "Copied to clipboard.",
    "passage.empty": "Your composed passage will appear here.",
    "actions.copyText": "Copy text",
    "actions.copySources": "Copy with sources",
    "actions.download": "Download .txt",
    "dialog.firstLines": "Famous first lines",
    "dialog.close": "Close",
    "source.famousFirstLine": "Famous first line",
    "source.yourStartingSentence": "Your starting sentence.",
    "source.unknown": "Unknown",
    "source.open": "open",
    "source.clickToOpen": "click to open",
    "source.heading": "Sources",
    "word.sentence.one": "sentence",
    "word.sentence.many": "sentences",
    "word.source.one": "source",
    "word.source.many": "sources",
  },
  es: {
    "meta.description": "Un cadáver exquisito de frases encontradas, cada línea tomada de una fuente distinta.",
    "brand.tagline": "un pasaje de frases encontradas, cada una desde un libro, artículo o archivo distinto",
    "seed.label": "Frase inicial",
    "seed.placeholder": "Escribe una frase o elige una primera línea famosa abajo.",
    "seed.random": "Aleatoria",
    "seed.browse": "Ver primeras líneas",
    "sources.legend": "Fuentes - combina cualquiera",
    "lang.appLabel": "Idioma de la interfaz",
    "lang.sourceLabel": "Idioma del texto",
    "length.label": "Longitud",
    "length.unit": "frases",
    "footnotes.label": "Mostrar notas y lista de fuentes",
    "button.compose": "Componer",
    "button.stop": "Detener",
    "advanced.summary": "Avanzado",
    "advanced.googleKey": "Clave de API de Google Books (opcional)",
    "advanced.googlePlaceholder": "Dejar vacío para usar sin clave",
    "advanced.googleHint":
      "Google Books es gratis, pero tiene límite de uso. Si alcanzas el límite diario, pega tu propia clave gratuita (se guarda solo en este navegador) o usa Internet Archive, que no necesita clave.",
    "advanced.googleHelp": "Cómo obtener una clave",
    "advanced.iaFullText": "Internet Archive: leer el texto completo del libro para frases más limpias (más lento)",
    "history.title": "Historial",
    "history.clear": "Borrar",
    "history.empty": "Tus composiciones anteriores aparecerán aquí.",
    "history.meta": "{count} {sentences} · {sourceLabel} · {when}",
    "summary.line": "{found} {sentenceWord} de {distinct} {sourceWord} · {sourceLabel}",
    "status.ready": "Listo.",
    "status.readyDetail": "Elige una frase inicial y pulsa Componer.",
    "status.composing": "Componiendo - {collected} / {target}",
    "status.composingEllipsis": "Componiendo...",
    "status.searching": "Buscando en {sourceLabel} \"{phrase}\"...",
    "status.searchingSeed": "Buscando tu frase inicial...",
    "status.dropping": "Sin coincidencia - quitando una palabra: \"{phrase}\"",
    "status.sourceHiccup": "Problema con la fuente - probando una frase más corta...",
    "status.skippingUsed": "Saltando una obra ya usada...",
    "status.found": "Encontrado en \"{title}\".",
    "status.noContinuation": "No se encontró continuación - deteniendo.",
    "status.stopped": "Detenido.",
    "status.complete": "Listo - tu pasaje está completo.",
    "status.exhausted": "Llegamos a un callejón sin salida - esto fue lo encontrado.",
    "status.saved": "Composición guardada",
    "error.enterSeed": "Escribe una frase inicial.",
    "error.enterSeedDetail": "Escribe una, o elige una primera línea famosa.",
    "error.chooseSource": "Elige al menos una fuente.",
    "error.chooseSourceDetail": "Marca una o más fuentes para combinarlas.",
    "error.googleQuota": "Se alcanzó el límite diario de Google Books",
    "error.generic": "Algo salió mal",
    "error.clipboard": "No se pudo acceder al portapapeles.",
    "notice.copied": "Copiado al portapapeles.",
    "passage.empty": "Tu pasaje compuesto aparecerá aquí.",
    "actions.copyText": "Copiar texto",
    "actions.copySources": "Copiar con fuentes",
    "actions.download": "Descargar .txt",
    "dialog.firstLines": "Primeras líneas famosas",
    "dialog.close": "Cerrar",
    "source.famousFirstLine": "Primera línea famosa",
    "source.yourStartingSentence": "Tu frase inicial.",
    "source.unknown": "Desconocido",
    "source.open": "abrir",
    "source.clickToOpen": "clic para abrir",
    "source.heading": "Fuentes",
    "word.sentence.one": "frase",
    "word.sentence.many": "frases",
    "word.source.one": "fuente",
    "word.source.many": "fuentes",
  },
};

let currentLanguage = "en";

export const supportedAppLanguages = Object.freeze(Object.keys(messages));

export function normalizeAppLanguage(lang) {
  const base = String(lang || "").toLowerCase().split("-")[0];
  return messages[base] ? base : "en";
}

export function initialAppLanguage(saved, browserLanguage) {
  return normalizeAppLanguage(saved || browserLanguage || "en");
}

export function setLanguage(lang) {
  currentLanguage = normalizeAppLanguage(lang);
  return currentLanguage;
}

export function getLanguage() {
  return currentLanguage;
}

export function t(key, vars = {}) {
  const raw = messages[currentLanguage]?.[key] ?? messages.en[key] ?? key;
  return raw.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ""));
}
