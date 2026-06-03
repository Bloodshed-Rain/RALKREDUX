# On-device verification — 2026-05-30 P1/P2 fix pass (`eb50a22`)

Scope: the 5 changes from this pass that the jest harness **cannot** reach
(screens, the auth provider, expo-file-system). Everything else in the pass is
TDD-backed (gear backdated-inspection, bulk-export attestation, hosted-fetch
404-split, timestamp formatting) and needs only a sanity glance, below.

This is **additive** to the branch-wide checklist in
`docs/production-readiness-audit.md` (§ Runtime verification checklist), which
still applies to the prior 16 commits (nav, photo capture, brand mark, auth,
signing spine, 6-palette sweep).

Build: dev-client / standalone (`eas build`) — several items need a real device
(camera, offline networking, documentDirectory). Expo Go is OK for the copy/a11y
checks but not photo-durability or Google auth.

---

## 1. P1-3 — Export "Chain valid" pill no longer lies  ·  `app/export.tsx`

The pill is now gated on a real `useVerifyFullChain()` run, with distinct
states. Verify each:

- [ ] **Signed logbook, valid chain** → open *Audit export* → green **"Chain valid"** + subline "… chain verified".
- [ ] **Empty / all-draft logbook** (fresh install, or delete all signed) → open *Audit export* → neutral **"No signed entries"** pill, **NOT** green. *(New behavior — old code showed green unconditionally.)*
- [ ] **Re-verify after a new signature** → sign an entry, then open *Audit export* in the same session → pill reflects the new state (not a stale cached "valid").
- [ ] **Broken chain** *(only if you can corrupt a signature row via a dev/DB tool)* → expect red **"Chain integrity failed"** (a positively-detected tamper), and amber **"Couldn't verify chain"** if verification errors out. **Must never show green.** If you have no DB-edit path on device, mark N/A — the logic is unit-proven in `verify-full-chain.test.ts`.

Guards against: a tampered/empty chain showing an auditor a false green tick.

## 2. P1-4 — Evidence photos survive cache eviction  ·  `new.tsx`, `entry/[id].tsx`, `src/ui/attachment-storage.ts`

Photos are now copied into `documentDirectory` before being recorded.

- [ ] Add a photo to a draft **via the new-entry wizard** (Step 2 evidence).
- [ ] Add a photo to a draft **via the entry-detail "add evidence" path** (both call sites changed).
- [ ] **Sign** the entry, then **force-quit** the app and relaunch (or leave it overnight so iOS evicts the cache).
- [ ] Reopen the entry → photo still renders. Export the audit packet (PDF/JSON, attachments included) → photo present, no broken/missing image.

Guards against: the picker's transient cache URI being evicted, leaving a sealed entry's evidence as a permanent dangling pointer.
Known residual: copy failure falls back to the transient URI silently (best-effort) — not expected on a healthy device.

## 3. P1-6 — Offline sign-out can't lock you out  ·  `src/providers/auth-provider.tsx`, `app/account.tsx`

*(Requires a Supabase-configured build with a signed-in session.)*

- [ ] Sign in (online), then enable **Airplane mode**.
- [ ] *Account → Sign out* → an **Alert** appears ("Could not sign out … you're still signed in"), and you **remain in the app** (not bounced to the auth screen).
- [ ] **Relaunch the app while still offline** → still signed in (the gate does **not** flip to the sign-in screen).
- [ ] Re-enable network → *Sign out* → succeeds, lands on the auth screen.

Guards against: an offline sign-out poisoning `authedBefore=false` before the revoke runs, hard-gating an established tech out of their local logbook.

## 4. #32 — Softened verifier attestation copy  ·  `app/verify/[code].tsx`

- [ ] Open a verifier link (hosted or local). The attestation checkbox reads: **"I am the requested verifier. I reviewed the work details shown in this request, and I authorize this signature."**
- [ ] Type a name that differs from the requested verifier → "Different signer" path → copy switches to **"I reviewed the work details shown in this request, and I authorize this signature on my own authority as named."**
- [ ] Complete the signature → export that entry's packet → the **Attestation** row shows the new wording (the persisted string, verbatim).

Note (forward-only): signatures captured *before* this change keep their old "…work record" wording — chain-bound and immutable.

## 5. P2-7 — Selection state announced to screen readers  ·  `app/entry/new.tsx`

- [ ] Enable **VoiceOver** (iOS) / **TalkBack** (Android).
- [ ] New entry → focus the **ft/m** height-unit toggle and the **supervisor** chips → the active one announces **"selected"**.

---

## Sanity glance (test-covered, no device pass required)

Open *Audit export*, export a **PDF** and **CSV**, and eyeball:

- [ ] An **Attestation** row/column is present (P2-1).
- [ ] A non-`work` entry's hours read e.g. "Training hours", not "Rope access hours" (already shipped; unchanged here).
- [ ] `signed_at` dates look right for your local zone, not off by a day (P2-5).
- [ ] Gear: record a **backdated** inspection on an item that already has a newer one → the item's **next-due date does not change** (P2-2).

---

## 6. #33 — AppLock re-lock preserves in-memory state  ·  `src/providers/app-lock.tsx`  (commit `1dd9081`)

AppLock now renders the navigator **under** the lock overlay instead of unmounting
it. This must be verified on-device because there is no provider/screen unit harness.
**Requires a build with the device lock turned ON** (Security → enable; it is opt-in,
`deviceLockEnabled` defaults OFF, and `__DEV__` bypasses the lock entirely).

- [ ] **Captured signature survives a re-lock (the fix).** On `sign.tsx`, draw a supervisor signature but do **not** submit. Background the app, wait past the auto-lock timeout, foreground, unlock → the **drawn signature is still there** (previously it was wiped). `sign.tsx` is a normal pushed screen, so the lock covers it.
- [ ] **TamperGuard escape survives a re-lock (P2-6).** Only reproducible on a broken chain: tap **"Continue to app"**, then trigger a re-lock → after unlock you are **not** re-thrown onto the red integrity screen.
- [ ] **KNOWN RESIDUAL — lock cover over a native modal (iOS).** New-entry / edit / amend / request-signature are `presentation:'modal'` screens (separate iOS view controllers). The lock overlay lives in the root view tree, so on a re-lock **with one of those modals open** it may render **behind** the still-visible modal. Verify: open *New entry* (or *Amend*), background, wait past auto-lock, foreground → **does the lock fully cover the form?** Expected: it may NOT on iOS. This is a **privacy/cover gap, not data loss** — the modal forms auto-save their draft to SQLite. If confirmed, the fix is to present the lock via an RN `<Modal>` (tracked follow-up; itself needs an on-device pass).
- [ ] **Cold-start eyeball (new behavior).** The navigator + TamperGuard's `useVerifyFullChain` now mount *under* the checking/lock overlay on cold start (previously they didn't mount until unlock). Confirm: no flash of app content before the lock, and unlock lands cleanly on the expected screen.
