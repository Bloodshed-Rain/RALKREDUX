// Pure helpers for Today-screen advisory acknowledgements.
//
// An acknowledgement is a Today advisory the technician has explicitly
// dismissed (HOLD TO ACK). Acknowledgements are persisted, but they expire:
// after 24h an advisory re-surfaces so a still-unresolved issue is never
// silently buried. Only dismissible advisories (P2 gear-due-soon, cert
// warnings) ever reach this map — P1 DO-NOT-DEPLOY advisories are
// non-dismissible upstream and always show.
//
// No AsyncStorage import here on purpose: this module stays pure and unit
// testable. The AsyncStorage round-trip lives in local-prefs.ts.

export const ADVISORY_ACK_TTL_MS = 24 * 60 * 60 * 1000;

// Map of advisory id -> ISO timestamp the technician acknowledged it.
export type AdvisoryAckMap = Record<string, string>;

// Drop acknowledgements older than the TTL. Malformed timestamps are dropped
// too (treated as expired) so a corrupt entry can never pin an advisory hidden.
export function pruneAcks(acks: AdvisoryAckMap, now: Date): AdvisoryAckMap {
  const cutoff = now.getTime() - ADVISORY_ACK_TTL_MS;
  const next: AdvisoryAckMap = {};
  for (const [id, ackedAt] of Object.entries(acks)) {
    const ms = Date.parse(ackedAt);
    if (Number.isFinite(ms) && ms >= cutoff) next[id] = ackedAt;
  }
  return next;
}

// The set of advisory ids still considered acknowledged at `now`.
export function acknowledgedIdSet(acks: AdvisoryAckMap, now: Date): Set<string> {
  return new Set(Object.keys(pruneAcks(acks, now)));
}

// Record a fresh acknowledgement, pruning expired entries in the same pass.
export function withAck(acks: AdvisoryAckMap, id: string, now: Date): AdvisoryAckMap {
  return { ...pruneAcks(acks, now), [id]: now.toISOString() };
}
