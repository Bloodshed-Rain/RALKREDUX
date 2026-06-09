// Small NDT helpers transposed verbatim from logbook-service.ts. These are
// file-private / closure-scoped there and intentionally NOT exported, so the
// NDT ledger keeps its own copy rather than widening logbook-service's surface.

// Copied verbatim from logbook-service.ts normalizeRequestCode (~L75).
export function normalizeRequestCode(requestCode: string): string {
  return requestCode.trim().toUpperCase();
}

// Copied verbatim from logbook-service.ts createRequestCode (~L455).
export function createRequestCode(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, '').slice(-10).toUpperCase();
}

// Backdating guard for remote signatures. A signing time is only trusted if it
// falls within [request created, now] (+ a small clock-skew tolerance);
// anything else (missing, unparseable, before the request existed, or in the
// future) falls back to `now`. Copied verbatim from logbook-service.ts
// clampSigningTime (~L84).
const SIGNING_TIME_SKEW_MS = 5 * 60 * 1000;
export function clampSigningTime(
  candidate: string | null | undefined,
  notBefore: string,
  now: string,
): string {
  if (!candidate) return now;
  const t = new Date(candidate).getTime();
  const lower = new Date(notBefore).getTime();
  const upper = new Date(now).getTime() + SIGNING_TIME_SKEW_MS;
  // Apply the skew tolerance to BOTH bounds: the verifier's server clock and
  // the technician's device clock can differ by a few seconds, so a legitimate
  // server-stamped time may land just outside the raw [created_at, now] window.
  if (
    !Number.isFinite(t) ||
    (Number.isFinite(lower) && t < lower - SIGNING_TIME_SKEW_MS) ||
    t > upper
  ) {
    return now;
  }
  return candidate;
}
