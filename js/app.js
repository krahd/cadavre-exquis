// UI wiring: reads the controls, drives the engine, renders the passage with a
// live status, keeps a history of past compositions, and supports footnotes,
// hover provenance, and export.

import { generate, QuotaError } from "./engine.js";
import { sources, sourcesById, defaultSourceId } from "./sources/index.js";
import { firstLines, randomFirstLine } from "./data/firstLines.js";

const $ = (id) => document.getElementById(id);
const els = {
  form: $("compose"),
  seed: $("seed"),
  seedSource: $("seed-source"),
  shuffle: $("shuffle"),
  browse: $("browse"),
  source: $("source"),
  langField: $("lang-field"),
  lang: $("lang"),
  length: $("length"),
  lengthOut: $("length-out"),
  footnotes: $("footnotes"),
  generate: $("generate"),
  stop: $("stop"),
  gkey: $("gkey"),
  iaFulltext: $("ia-fulltext"),
  statusbar: $("statusbar"),
  statusMain: $("status-main"),
  statusDetail: $("status-detail"),
  passage: $("passage"),
  sources: $("sources"),
  resultActions: $("result-actions"),
  copy: $("copy"),
  copySources: $("copy-sources"),
  download: $("download"),
  historyList: $("history-list"),
  historyEmpty: $("history-empty"),
  clearHistory: $("clear-history"),
  tooltip: $("tooltip"),
  linesDialog: $("lines-dialog"),
  linesList: $("lines-list"),
  linesClose: $("lines-close"),
};

const STORE = { key: "cadavre.googleKey", history: "cadavre.history", footnotes: "cadavre.footnotes" };
const MAX_HISTORY = 40;

let controller = null;
let running = false;
let seedMeta = null; // attribution for a chosen famous first line
let displayed = null; // the composition currently shown (live or from history)
let renderedCount = 0; // how many sentences are already in the DOM (for fade-in)
let activeHistoryId = null;
let history = [];

init();

function init() {
  for (const s of sources) {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.label;
    els.source.appendChild(opt);
  }
  els.source.value = defaultSourceId;
  syncLangVisibility();

  const savedKey = localStorage.getItem(STORE.key);
  if (savedKey) els.gkey.value = savedKey;
  els.footnotes.checked = localStorage.getItem(STORE.footnotes) === "1";

  history = loadHistory();
  renderHistory();
  buildLinesDialog();
  pickFirstLine(randomFirstLine());

  els.source.addEventListener("change", syncLangVisibility);
  els.length.addEventListener("input", () => (els.lengthOut.textContent = els.length.value));
  els.shuffle.addEventListener("click", () => pickFirstLine(randomFirstLine()));
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
    if (displayed) renderComposition(displayed.sentences, displayed.sentences.length);
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

function syncLangVisibility() {
  els.langField.hidden = !sourcesById[els.source.value]?.supportsLang;
}

function pickFirstLine(line) {
  els.seed.value = line.text;
  seedMeta = { title: line.title, author: line.author, url: null, source: "Famous first line" };
  els.seedSource.textContent = `— ${line.title}, ${line.author}`;
}

function buildLinesDialog() {
  els.linesList.innerHTML = "";
  for (const line of firstLines) {
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
    setStatus("error", "Enter a starting sentence.", "Type one, or draw a famous first line.");
    els.seed.focus();
    return;
  }

  controller = new AbortController();
  setRunning(true);
  activeHistoryId = null;
  highlightHistory();
  els.passage.innerHTML = "";
  els.sources.hidden = true;
  els.resultActions.hidden = true;
  renderedCount = 0;

  const source = sourcesById[els.source.value];
  displayed = {
    id: cryptoId(),
    ts: Date.now(),
    seed: startSentence,
    seedMeta,
    sourceId: source.id,
    sourceLabel: source.label,
    lang: els.lang.value,
    length: Number(els.length.value),
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
        renderComposition(result, renderedCount);
        renderedCount = result.length;
        updateStatus(info, source.label);
      },
    });
    displayed.sentences = sentences;
    displayed.reason = reason;
    if (sentences.length > 1) addHistory(displayed);
  } catch (err) {
    if (err instanceof QuotaError) {
      setStatus("error", "Google Books daily limit reached", err.message);
    } else if (err?.name !== "AbortError") {
      setStatus("error", "Something went wrong", err.message);
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

// Rebuild the passage (and source list). Sentences at index >= animateFrom get
// a one-time fade-in.
function renderComposition(sentences, animateFrom = Infinity) {
  const footnotes = els.footnotes.checked;
  els.passage.innerHTML = "";
  sentences.forEach((item, i) => {
    const span = document.createElement("span");
    span.className = "sentence" + (i === 0 ? " sentence--seed" : "") + (i >= animateFrom ? " sentence--new" : "");
    span.textContent = item.text;
    if (item.source) span.dataset.source = JSON.stringify(item.source);
    if (footnotes) {
      const sup = document.createElement("sup");
      sup.className = "fn";
      sup.textContent = String(i + 1);
      span.appendChild(sup);
    }
    els.passage.appendChild(span);
  });
  renderSources(sentences, footnotes);
}

function renderSources(sentences, footnotes) {
  if (!footnotes || sentences.length === 0) {
    els.sources.hidden = true;
    els.sources.innerHTML = "";
    return;
  }
  els.sources.innerHTML = sentences
    .map((item, i) => {
      const s = item.source;
      if (!s) return `<li>Your starting sentence.</li>`;
      const cite = `<cite>${escapeHtml(s.title || "Unknown")}</cite>`;
      const author = s.author ? ` — ${escapeHtml(s.author)}` : "";
      const where = s.source ? ` <span class="src-where">(${escapeHtml(s.source)})</span>` : "";
      const link =
        s.url && /^https?:/.test(s.url)
          ? ` · <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">open ↗</a>`
          : "";
      return `<li value="${i + 1}">${cite}${author}${where}${link}</li>`;
    })
    .join("");
  els.sources.hidden = false;
}

function updateStatus(info, sourceLabel) {
  const phase = info.phase || "searching";
  const collected = info.step ?? 0;
  const target = info.target ?? 0;
  let main = `Composing — ${collected} / ${target}`;
  let detail = info.status || "";
  if (phase === "searching") detail = `Searching ${sourceLabel} for “${truncate(info.phrase)}”…`;
  else if (phase === "dropping") detail = `No match — dropping a word: “${truncate(info.phrase)}”`;
  else if (phase === "found") detail = info.status;
  else if (phase === "starting") {
    main = "Composing…";
    detail = "Searching for your starting sentence…";
  } else if (phase === "done" || phase === "exhausted") {
    main = info.status;
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
  return `${found} sentence${found === 1 ? "" : "s"} from ${distinct} source${distinct === 1 ? "" : "s"} · ${comp.sourceLabel}`;
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
    const when = new Date(entry.ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    btn.innerHTML = `<span class="history-item__seed">${escapeHtml(entry.seed)}</span><span class="history-item__meta">${entry.sentences.length} sentences · ${escapeHtml(entry.sourceLabel)} · ${when}</span>`;
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
  renderedCount = entry.sentences.length;
  renderComposition(entry.sentences, entry.sentences.length);
  setStatus("done", "Saved composition", summaryLine(entry));
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
  const parts = [`<span class="tooltip__title">${escapeHtml(src.title || "Unknown")}</span>`];
  if (src.author) parts.push(`<span class="tooltip__author">${escapeHtml(src.author)}</span>`);
  const tail = src.url && /^https?:/.test(src.url) ? `${escapeHtml(src.source || "")} · click to open ↗` : escapeHtml(src.source || "");
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
  const lines = ["", "— Sources —"];
  comp.sentences.forEach((s, i) => {
    if (!s.source) {
      lines.push(`${i + 1}. Your starting sentence.`);
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
    setStatus("done", "Copied to clipboard.", summaryLine(displayed));
  } catch {
    setStatus("error", "Couldn't access the clipboard.", "");
  }
}

function downloadText() {
  if (!displayed) return;
  const header = `cadavre exquis\n${new Date(displayed.ts).toLocaleString()} · ${displayed.sourceLabel}\n\n`;
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
