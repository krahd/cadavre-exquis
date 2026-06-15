// Small fetch helpers shared by the source adapters.

// Fetch JSON with abort support. Throws on non-OK status (caller decides how
// to handle, e.g. 429 quota).
export async function fetchJSON(url, { signal } = {}) {
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} for ${url}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function fetchText(url, { signal } = {}) {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} for ${url}`);
    err.status = res.status;
    throw err;
  }
  return res.text();
}

// A gentle throttle so we don't hammer public APIs. Resolves after `ms`,
// rejecting early if the signal aborts.
export function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true }
    );
  });
}
