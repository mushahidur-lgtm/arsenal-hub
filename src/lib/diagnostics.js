/**
 * In-memory counters for debugging data problems. Nothing here is persisted or sent anywhere.
 * In the browser console:  afcDiagnostics()   (also returned by getDiagnostics()).
 */
const state = {
  dropped: {},
  providers: {},
  fallbacks: [],
  persistent: { hits: 0, misses: 0, expired: 0, evicted: 0, rejected: 0, writeFailures: 0, bytes: 0 },
};
const FALLBACK_LOG_MAX = 50;

export function noteDropped(label, n = 1) {
  state.dropped[label] = (state.dropped[label] ?? 0) + n;
}

const provider = (id) => (state.providers[id] ??= { requests: 0, ok: 0, failures: {}, lastError: null, lastOkAt: null, totalMs: 0, circuitOpenUntil: null });

/** One finished attempt against a provider ("direct:<host>" or a proxy id). */
export function recordAttempt(id, { ok, kind = null, status = null, ms = 0, message = null }) {
  const p = provider(id);
  p.requests++;
  p.totalMs += ms;
  if (ok) {
    p.ok++;
    p.lastOkAt = Date.now();
  } else {
    p.failures[kind ?? "unknown"] = (p.failures[kind ?? "unknown"] ?? 0) + 1;
    p.lastError = { kind, status, message, at: Date.now() };
  }
}

export function setCircuit(id, openUntil) {
  provider(id).circuitOpenUntil = openUntil;
}

/** A direct request failed and a proxy was tried: `outcome` is "ok" or the failure kind. */
export function recordFallback(entry) {
  state.fallbacks.push({ at: Date.now(), ...entry });
  if (state.fallbacks.length > FALLBACK_LOG_MAX) state.fallbacks.shift();
}

export const persistentStats = state.persistent;

export function getDiagnostics(extra = {}) {
  const providers = Object.fromEntries(Object.entries(state.providers).map(([id, p]) => [id, { ...p, avgMs: p.requests ? Math.round(p.totalMs / p.requests) : null }]));
  return { ...extra, persistentCache: { ...state.persistent }, providers, fallbacks: [...state.fallbacks], dropped: { ...state.dropped } };
}

export function resetDiagnostics() {
  state.dropped = {};
  state.providers = {};
  state.fallbacks = [];
  Object.assign(state.persistent, { hits: 0, misses: 0, expired: 0, evicted: 0, rejected: 0, writeFailures: 0, bytes: 0 });
}
