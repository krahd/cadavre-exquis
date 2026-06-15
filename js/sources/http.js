// Small fetch helpers shared by the source adapters, with retry/backoff so a
// transient hiccup doesn't end a long composition.

const TRANSIENT = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;

async function request(url, { signal, accept } = {}) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    try {
      const res = await fetch(url, { signal, headers: accept ? { Accept: accept } : undefined });
      if (res.ok) return res;
      const err = new Error(`HTTP ${res.status} for ${url}`);
      err.status = res.status;
      if (TRANSIENT.has(res.status) && attempt < MAX_ATTEMPTS - 1) {
        await backoff(attempt, signal);
        continue;
      }
      throw err;
    } catch (err) {
      if (err?.name === "AbortError") throw err;
      // Network failure (fetch rejects with a TypeError) — retry a couple times.
      if (err instanceof TypeError && attempt < MAX_ATTEMPTS - 1) {
        await backoff(attempt, signal);
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Failed after ${MAX_ATTEMPTS} attempts: ${url}`);
}

function backoff(attempt, signal) {
  return delay(400 * (attempt + 1) + Math.random() * 200, signal);
}

export async function fetchJSON(url, { signal } = {}) {
  const res = await request(url, { signal, accept: "application/json" });
  return res.json();
}

export async function fetchText(url, { signal } = {}) {
  const res = await request(url, { signal });
  return res.text();
}

// Resolves after `ms`, rejecting early if the signal aborts.
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
