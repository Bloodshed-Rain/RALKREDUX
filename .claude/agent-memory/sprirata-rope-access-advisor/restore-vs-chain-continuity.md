---
name: restore-vs-chain-continuity
description: Snapshot restore breaks the device's per-device hash chain; that consequence must be surfaced explicitly, not hidden in generic destructive-action copy
metadata:
  type: feedback
---

The backup restore flow tells the user "this replaces the local ledger." That's true but understates what happens to the hash chain. The per-device chain head moves backward to whatever the snapshot's head was, and any signatures created on this device since the snapshot become unreachable.

**Why:** A verifier who already saw `chain_hash X` from this device, then sees `chain_hash Y` after the tech restores an older snapshot, can no longer trace back to X. That's the exact moment an auditor's trust in the device's ledger collapses. Generic "this replaces the local ledger" is not enough warning; the consequence is specific.

**How to apply:** Before the restore action, surface both the current device chain head and the snapshot's chain head. Require explicit acknowledgment that signatures made after the snapshot will be lost. Persist a `chain_resets` audit row (when, by whom, from-head, to-head) so the audit packet can show that a restore happened, even though the chain itself can't bridge it.

Also relevant if multi-device merge ever lands: restore-replace is the wrong default for a multi-device world; restore-as-import / restore-as-side-by-side is closer to how techs think about "I have my old phone's logbook on a backup file."
