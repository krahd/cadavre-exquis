// UI wiring: reads the controls, drives the engine, renders the passage with a
// live status, keeps a history of past compositions, and supports footnotes,
// hover provenance, and export.

import { generate, QuotaError } from "./engine.js";
import { sources, sourcesById, defaultSelectedIds } from "./sources/index.js";
import { makeComposite } from "./sources/composite.js";
import { linesForLanguage, randomFirstLine } from "./data/firstLines.js";
import { getLanguage, initialAppLanguage, setLanguage, t } from "./i18n.js";

const $ = (id) => document.getElementById(id);
const els = {
  form: $("compose"),
  metaDescription: document.querySelector('meta[name="description"]'),
  brandTagline: $("brand-tagline"),
  appLang: $("app-lang"),
  appLangLabel: $("app-lang-label"),
  seed: $("seed"),
  seedLabel: $("seed-label"),
  seedSource: $("seed-source"),
  shuffle: $("shuffle"),
  browse: $("browse"),
  sourceList: $("source-list"),
  sourcesLegend: $("sources-legend"),
  langField: $("lang-field"),
  lang: $("lang"),
  langLabel: $("lang-label"),
  length: $("length"),
  lengthLabelText: $("length-label-text"),
  lengthOut: $("length-out"),
  lengthUnit: $("length-unit"),
  footnotes: $("footnotes"),
  footnotesLabel: $("footnotes-label"),
  generate: $("generate"),
  stop: $("stop"),
  gkey: $("gkey"),
  gkeyLabel: $("gkey-label"),
  gkeyHint: $("gkey-hint"),
  gkeyHelp: $("gkey-help"),
  iaFulltext: $("ia-fulltext"),
  iaFulltextLabel: $("ia-fulltext-label"),
  advancedSummary: $("advanced-summary"),
  statusbar: $("statusbar"),
  statusMain: $("status-main"),
  statusDetail: $("status-detail"),
  passage: $("passage"),
  sources: $("sources"),
  resultActions: $("result-actions"),
  copy: $("copy"),
  copySources: $("copy-sources"),
  download: $("download"),
  historyTitle: $("history-title"),
  historyList: $("history-list"),
  historyEmpty: $("history-empty"),
  clearHistory: $("clear-history"),
  tooltip: $("tooltip"),
  linesDialog: $("lines-dialog"),
  linesTitle: $("lines-title"),
  linesList: $("lines-list"),
  linesClose: $("lines-close"),
};

const STORE = {
  appLang: "cadavre.appLang",
  key: "cadavre.googleKey",
  history: "cadavre.history",
  footnotes: "cadavre.footnotes",
  sources: "cadavre.sources",
};
const MAX_HISTORY = 40;
const MIN_LENGTH = 3;
const MAX_LENGTH = 100;

let controller = null;
let running = false;
let seedMeta = null; // attribution for a chosen famous first line
let displayed = null; // the composition currently shown (live or from history)
let renderedCount = 0; // how many sentences are already in the DOM (for fade-in)
let activeHistoryId = null;
let history = [];

init();

function init() {
  const savedAppLang = localStorage.getItem(STORE.appLang);
  const appLang = setLanguage(initialAppLanguage(savedAppLang, navigator.language));
  els.appLang.value = appLang;

  buildSourceList();
  syncLangVisibility();
  syncLength();

  const savedKey = localStorage.getItem(STORE.key);
  if (savedKey) els.gkey.value = savedKey;
  els.footnotes.checked = localStorage.getItem(STORE.footnotes) === "1";

  history = loadHistory();
  applyTranslations();
  renderHistory();
  buildLinesDialog();
  pickFirstLine(randomFirstLine(els.lang.value));

  els.appLang.addEventListener("change", onAppLanguageChange);
  els.lang.addEventListener("change", onTextLanguageChange);
  els.length.addEventListener("input", syncLength);
  els.shuffle.addEventListener("click", () => pickFirstLine(randomFirstLine(els.lang.value)));
  els.browse.addEventListener("click", () => els.linesDialog.showModal());
  els.linesClose.addEventListener("click", () => els.linesDialog.close());
  els.linesDialog.addEventListener("click", (e) => {
    if (e.target === els.linesDialog) els.linesDialog.close(); // backdrop click
  });
  els.seed.addEventListener("input", () => {
    seedMeta = null;
    els.seedSource.textContent = "";
  });
  els.gkey.addEventListener("change", () => {
    const v = els.gkey.value.trim();
    if (v) localStorage.setItem(STORE.key, v);
    else localStorage.removeItem(STORE.key);
  });
  els.footnotes.addEventListener("change", () => {
    localStorage.setItem(STORE.footnotes, els.footnotes.checked ? "1" : "0");
    if (displayed) renderFull(displayed.sentences);
  });

  els.form.addEventListener("submit", (e) => {
    e.preventDefault();
    run();
  });
  els.stop.addEventListener("click", () => controller?.abort());
  els.copy.addEventListener("click", () => copyResult(false));
  els.copySources.addEventListener("click", () => copyResult(true));
  els.download.addEventListener("click", downloadText);
  els.clearHistory.addEventListener("click", clearHistory);

  els.passage.addEventListener("pointerover", onSentenceHover);
  els.passage.addEventListener("pointerout", hideTooltip);
  els.passage.addEventListener("pointermove", moveTooltip);
  els.passage.addEventListener("click", onSentenceClick);
}

// ---------------- Language and copy ----------------

function onAppLanguageChange() {
  const appLang = setLanguage(els.appLang.value);
  localStorage.setItem(STORE.appLang, appLang);
  applyTranslations();
  buildLinesDialog();
  renderHistory();
  if (seedMeta?.kind === "firstLine") {
    seedMeta.source = t("source.famousFirstLine");
    renderSeedSource(seedMeta);
  }
  if (displayed) {
    renderFull(displayed.sentences);
    if (!running) setStatus("done", displayed.reason ? reasonLabel(displayed.reason) : t("status.saved"), summaryLine(displayed));
  } else if (!running) {
    setStatus("idle", t("status.ready"), t("status.readyDetail"));
  }
}

function onTextLanguageChange() {
  buildLinesDialog();
  if (seedMeta?.kind === "firstLine") pickFirstLine(randomFirstLine(els.lang.value));
}

function applyTranslations() {
  document.documentElement.lang = getLanguage();
  els.metaDescription?.setAttribute("content", t("meta.description"));
  els.brandTagline.textContent = t("brand.tagline");
  els.appLangLabel.textContent = t("lang.appLabel");
  els.seedLabel.textContent = t("seed.label");
  els.seed.placeholder = t("seed.placeholder");
  els.shuffle.textContent = `↻ ${t("seed.random")}`;
  els.browse.textContent = `☰ ${t("seed.browse")}`;
  els.sourcesLegend.textContent = t("sources.legend");
  els.langLabel.textContent = t("lang.sourceLabel");
  els.lengthLabelText.textContent = t("length.label");
  els.lengthUnit.textContent = t("length.unit");
  els.footnotesLabel.textContent = t("footnotes.label");
  els.generate.textContent = t("button.compose");
  els.stop.textContent = t("button.stop");
  els.advancedSummary.textContent = t("advanced.summary");
  els.gkeyLabel.textContent = t("advanced.googleKey");
  els.gkey.placeholder = t("advanced.googlePlaceholder");
  els.gkeyHint.textContent = t("advanced.googleHint");
  els.gkeyHelp.textContent = `${t("advanced.googleHelp")} ↗`;
  els.iaFulltextLabel.textContent = t("advanced.iaFullText");
  els.historyTitle.textContent = t("history.title");
  els.clearHistory.textContent = t("history.clear");
  els.historyEmpty.textContent = t("history.empty");
  els.copy.textContent = t("actions.copyText");
  els.copySources.textContent = t("actions.copySources");
  els.download.textContent = t("actions.download");
  els.linesTitle.textContent = t("dialog.firstLines");
  els.linesClose.setAttribute("aria-label", t("dialog.close"));
  els.passage.dataset.empty = t("passage.empty");
  syncLength();
  if (!displayed && !running) setStatus("idle", t("status.ready"), t("status.readyDetail"));
}

function syncLength() {
  const length = clamp(Number(els.length.value) || 8, MIN_LENGTH, MAX_LENGTH);
  els.length.value = String(length);
  els.lengthOut.textContent = String(length);
  return length;
}

// ---- Source selection (multi-select checkboxes) ----

function buildSourceList() {
  let saved = [];
  try {
    saved = JSON.parse(localStorage.getItem(STORE.sources) || "[]");
  } catch {
    saved = [];
  }
  const checked = new Set(saved.length ? saved : defaultSelectedIds);

  els.sourceList.innerHTML = "";
  for (const s of sources) {
    const label = document.createElement("label");
    label.className = "toggle toggle--source";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = s.id;
    cb.checked = checked.has(s.id);
    cb.addEventListener("change", onSourceChange);
    const span = document.createElement("span");
    span.textContent = s.label;
    label.append(cb, span);
    els.sourceList.appendChild(label);
  }
}

function selectedSources() {
  return [...els.sourceList.querySelectorAll("input:checked")]
    .map((cb) => sourcesById[cb.value])
    .filter(Boolean);
}

function onSourceChange() {
  localStorage.setItem(STORE.sources, JSON.stringify(selectedSources().map((s) => s.id)));
  syncLangVisibility();
}

function syncLangVisibility() {
  els.langField.hidden = !selectedSources().some((s) => s.supportsLang);
}

function pickFirstLine(line) {
  els.seed.value = line.text;
  seedMeta = {
    kind: "firstLine",
    title: line.title,
    author: line.author,
    url: null,
    source: t("source.famousFirstLine"),
  };
  renderSeedSource(seedMeta);
}

function renderSeedSource(meta) {
  els.seedSource.textContent = meta ? `— ${meta.title}, ${meta.author}` : "";
}

function buildLinesDialog() {
  els.linesList.innerHTML = "";
  for (const line of linesForLanguage(els.lang.value)) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "line-item";
    btn.innerHTML = `<span class="line-item__text">${escapeHtml(line.text)}</span><span class="line-item__cite">${escapeHtml(line.title)} · ${escapeHtml(line.author)}</span>`;
    btn.addEventListener("click", () => {
      pickFirstLine(line);
      els.linesDialog.close();
    });
    li.appendChild(btn);
    els.linesList.appendChild(li);
  }
}

// ---------------- Run ----------------

async function run() {
  const startSentence = els.seed.value.trim();
  if (!startSentence) {
    setStatus("error", t("error.enterSeed"), t("error.enterSeedDetail"));
    els.seed.focus();
    return;
  }

  const selected = selectedSources();
  if (!selected.length) {
    setStatus("error", t("error.chooseSource"), t("error.chooseSourceDetail"));
    return;
  }
  // A single source runs directly (so its quota errors surface); several are
  // woven together by a composite.
  const source = selected.length === 1 ? selected[0] : makeComposite(selected);
  const sourceLabel = selected.map((s) => s.label).join(" + ");

  controller = new AbortController();
  setRunning(true);
  activeHistoryId = null;
  highlightHistory();
  els.passage.innerHTML = "";
  els.sources.innerHTML = "";
  els.sources.hidden = true;
  els.resultActions.hidden = true;
  renderedCount = 0;
  const targetLength = syncLength();

  displayed = {
    id: cryptoId(),
    ts: Date.now(),
    seed: startSentence,
    seedMeta,
    sourceIds: selected.map((s) => s.id),
    sourceLabel,
    appLang: getLanguage(),
    lang: els.lang.value,
    length: targetLength,
    sentences: [],
    reason: null,
  };

  const opts = {
    lang: els.lang.value,
    googleKey: els.gkey.value.trim() || undefined,
    iaFullText: els.iaFulltext.checked,
  };

  try {
    const { sentences, reason } = await generate({
      source,
      startSentence,
      seedAttribution: seedMeta,
      targetLength: displayed.length,
      opts,
      signal: controller.signal,
      onProgress: (result, info) => {
        displayed.sentences = result;
        appendNew(result);
        updateStatus(info, sourceLabel);
      },
    });
    displayed.sentences = sentences;
    displayed.reason = reason;
    if (sentences.length > 1) addHistory(displayed);
  } catch (err) {
    if (err instanceof QuotaError) {
      setStatus("error", t("error.googleQuota"), err.message);
    } else if (err?.name !== "AbortError") {
      setStatus("error", t("error.generic"), err.message);
      console.error(err);
    }
  } finally {
    setRunning(false);
    if (displayed && displayed.sentences.length > 0) els.resultActions.hidden = false;
  }
}

function setRunning(on) {
  running = on;
  els.generate.hidden = on;
  els.stop.hidden = !on;
}

// ---------------- Rendering ----------------

// Append sentences that aren't in the DOM yet (newest fade in). Cheap during
// streaming even at 100 sentences.
function appendNew(sentences) {
  const footnotes = els.footnotes.checked;
  for (let i = renderedCount; i < sentences.length; i++) {
    els.passage.appendChild(makeSentenceSpan(sentences[i], i, footnotes, true));
    if (footnotes) els.sources.appendChild(makeSourceLi(sentences[i], i));
  }
  if (footnotes && sentences.length > 0) els.sources.hidden = false;
  renderedCount = sentences.length;
}

// Rebuild from scratch (used when toggling footnotes or viewing history).
function renderFull(sentences) {
  const footnotes = els.footnotes.checked;
  els.passage.innerHTML = "";
  els.sources.innerHTML = "";
  sentences.forEach((item, i) => {
    els.passage.appendChild(makeSentenceSpan(item, i, footnotes, false));
    if (footnotes) els.sources.appendChild(makeSourceLi(item, i));
  });
  els.sources.hidden = !footnotes || sentences.length === 0;
  renderedCount = sentences.length;
}

function makeSentenceSpan(item, i, footnotes, animate) {
  const span = document.createElement("span");
  span.className = "sentence" + (i === 0 ? " sentence--seed" : "") + (animate ? " sentence--new" : "");
  span.textContent = item.text;
  if (item.source) span.dataset.source = JSON.stringify(item.source);
  if (footnotes) {
    const sup = document.createElement("sup");
    sup.className = "fn";
    sup.textContent = String(i + 1);
    span.appendChild(sup);
  }
  return span;
}

function makeSourceLi(item, i) {
  const li = document.createElement("li");
  li.value = i + 1;
  const s = item.source;
  if (!s) {
    li.textContent = t("source.yourStartingSentence");
    return li;
  }
  const cite = document.createElement("cite");
  cite.textContent = s.title || t("source.unknown");
  li.appendChild(cite);
  if (s.author) li.appendChild(document.createTextNode(` — ${s.author}`));
  if (s.source) li.appendChild(document.createTextNode(` (${s.source})`));
  if (s.url && /^https?:/.test(s.url)) {
    li.appendChild(document.createTextNode(" · "));
    const a = document.createElement("a");
    a.href = s.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = `${t("source.open")} ↗`;
    li.appendChild(a);
  }
  return li;
}

function updateStatus(info, sourceLabel) {
  const phase = info.phase || "searching";
  const collected = info.step ?? 0;
  const target = info.target ?? 0;
  let main = t("status.composing", { collected, target });
  let detail = info.status || "";
  if (phase === "searching") detail = t("status.searching", { sourceLabel, phrase: truncate(info.phrase) });
  else if (phase === "skipping") detail = t("status.skippingUsed");
  else if (phase === "dropping") {
    detail = info.status?.startsWith("Source hiccup")
      ? t("status.sourceHiccup")
      : t("status.dropping", { phrase: truncate(info.phrase) });
  } else if (phase === "found") detail = t("status.found", { title: info.title || t("source.unknown") });
  else if (phase === "starting") {
    main = t("status.composingEllipsis");
    detail = t("status.searchingSeed");
  } else if (phase === "exhausted") {
    main = t("status.noContinuation");
    detail = summaryLine(displayed);
  } else if (phase === "done" || phase === "exhausted") {
    main = reasonLabel(info.reason);
    detail = summaryLine(displayed);
  }
  setStatus(phase, main, detail);
}

function setStatus(phase, main, detail) {
  els.statusbar.dataset.phase = phase;
  els.statusMain.textContent = main;
  els.statusDetail.textContent = detail || "";
}

function summaryLine(comp) {
  if (!comp) return "";
  const found = comp.sentences.length;
  const distinct = new Set(comp.sentences.slice(1).map((s) => s.source?.title).filter(Boolean)).size;
  return t("summary.line", {
    found,
    sentenceWord: plural("sentence", found),
    distinct,
    sourceWord: plural("source", distinct),
    sourceLabel: comp.sourceLabel,
  });
}

// ---------------- History ----------------

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORE.history) || "[]");
  } catch {
    return [];
  }
}

function addHistory(comp) {
  // store a plain, serialisable copy
  const entry = { ...comp, sentences: comp.sentences.map((s) => ({ text: s.text, source: s.source })) };
  history.unshift(entry);
  history = history.slice(0, MAX_HISTORY);
  activeHistoryId = entry.id;
  saveHistory();
  renderHistory();
}

function saveHistory() {
  try {
    localStorage.setItem(STORE.history, JSON.stringify(history));
  } catch {
    /* storage full / unavailable — keep in-memory only */
  }
}

function renderHistory() {
  els.historyEmpty.hidden = history.length > 0;
  els.clearHistory.hidden = history.length === 0;
  els.historyList.innerHTML = "";
  for (const entry of history) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "history-item" + (entry.id === activeHistoryId ? " is-active" : "");
    const when = new Date(entry.ts).toLocaleString(getLanguage(), {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const sentences = plural("sentence", entry.sentences.length);
    const meta = t("history.meta", { count: entry.sentences.length, sentences, sourceLabel: entry.sourceLabel, when });
    btn.innerHTML = `<span class="history-item__seed">${escapeHtml(entry.seed)}</span><span class="history-item__meta">${escapeHtml(meta)}</span>`;
    btn.addEventListener("click", () => viewHistory(entry.id));
    li.appendChild(btn);
    els.historyList.appendChild(li);
  }
}

function viewHistory(id) {
  const entry = history.find((e) => e.id === id);
  if (!entry) return;
  if (running) controller?.abort();
  displayed = entry;
  activeHistoryId = id;
  renderFull(entry.sentences);
  setStatus("done", t("status.saved"), summaryLine(entry));
  els.resultActions.hidden = false;
  highlightHistory();
}

function clearHistory() {
  history = [];
  activeHistoryId = null;
  saveHistory();
  renderHistory();
}

function highlightHistory() {
  for (const btn of els.historyList.querySelectorAll(".history-item")) {
    btn.classList.remove("is-active");
  }
  renderHistory();
}

// ---------------- Tooltip (hover provenance) ----------------

function onSentenceHover(e) {
  const span = e.target.closest(".sentence");
  if (!span?.dataset.source) {
    if (!span) hideTooltip();
    return;
  }
  let src;
  try {
    src = JSON.parse(span.dataset.source);
  } catch {
    return;
  }
  const parts = [`<span class="tooltip__title">${escapeHtml(src.title || t("source.unknown"))}</span>`];
  if (src.author) parts.push(`<span class="tooltip__author">${escapeHtml(src.author)}</span>`);
  const tail =
    src.url && /^https?:/.test(src.url)
      ? `${escapeHtml(src.source || "")} · ${t("source.clickToOpen")} ↗`
      : escapeHtml(src.source || "");
  if (tail) parts.push(`<span class="tooltip__source">${tail}</span>`);
  els.tooltip.innerHTML = parts.join("");
  els.tooltip.hidden = false;
  positionTooltip(e);
}

function moveTooltip(e) {
  if (!els.tooltip.hidden && e.target.closest(".sentence")) positionTooltip(e);
}

function positionTooltip(e) {
  const pad = 14;
  const t = els.tooltip;
  const r = t.getBoundingClientRect();
  let x = e.clientX + pad;
  let y = e.clientY + pad;
  if (x + r.width > window.innerWidth - 8) x = e.clientX - r.width - pad;
  if (y + r.height > window.innerHeight - 8) y = e.clientY - r.height - pad;
  t.style.left = `${Math.max(8, x)}px`;
  t.style.top = `${Math.max(8, y)}px`;
}

function hideTooltip() {
  els.tooltip.hidden = true;
}

function onSentenceClick(e) {
  const span = e.target.closest(".sentence");
  if (!span?.dataset.source) return;
  try {
    const src = JSON.parse(span.dataset.source);
    if (src.url && /^https?:/.test(src.url)) window.open(src.url, "_blank", "noopener");
  } catch {
    /* ignore */
  }
}

// ---------------- Export ----------------

function plainText(comp) {
  return comp.sentences.map((s) => s.text).join(" ");
}

function sourcesText(comp) {
  const lines = ["", `— ${t("source.heading")} —`];
  comp.sentences.forEach((s, i) => {
    if (!s.source) {
      lines.push(`${i + 1}. ${t("source.yourStartingSentence")}`);
      return;
    }
    const author = s.source.author ? `, ${s.source.author}` : "";
    const url = s.source.url ? ` — ${s.source.url}` : "";
    lines.push(`${i + 1}. ${s.source.title}${author} (${s.source.source})${url}`);
  });
  return lines.join("\n");
}

async function copyResult(withSources) {
  if (!displayed) return;
  const out = withSources ? `${plainText(displayed)}\n${sourcesText(displayed)}` : plainText(displayed);
  try {
    await navigator.clipboard.writeText(out);
    setStatus("done", t("notice.copied"), summaryLine(displayed));
  } catch {
    setStatus("error", t("error.clipboard"), "");
  }
}

function downloadText() {
  if (!displayed) return;
  const header = `cadavre exquis\n${new Date(displayed.ts).toLocaleString(getLanguage())} · ${displayed.sourceLabel}\n\n`;
  const body = `${plainText(displayed)}\n${sourcesText(displayed)}\n`;
  const blob = new Blob([header + body], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cadavre-exquis-${stamp(displayed.ts)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------- Utils ----------------

function reasonLabel(reason) {
  switch (reason) {
    case "stopped":
      return t("status.stopped");
    case "complete":
      return t("status.complete");
    default:
      return t("status.exhausted");
  }
}

function plural(kind, count) {
  const suffix = Number(count) === 1 ? "one" : "many";
  return t(`word.${kind}.${suffix}`);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function truncate(s, n = 60) {
  s = String(s || "");
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function stamp(ts) {
  return new Date(ts).toISOString().replace(/[:T]/g, "-").slice(0, 16);
}

function cryptoId() {
  return (crypto?.randomUUID?.() || String(Date.now() + Math.random())).slice(0, 12);
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}
