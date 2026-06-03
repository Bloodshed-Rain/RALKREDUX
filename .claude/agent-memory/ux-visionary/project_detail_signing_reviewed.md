---
name: detail-signing-reviewed
description: UX-flow audit of entry detail + local-sign + remote-request screens (2026-05-28); key NEW findings logged
metadata:
  type: project
---

Reviewed the Detail & signing screen group on 2026-05-28 under the field-context lens (gloved/harnessed/offline). Files: `app/entry/[id].tsx`, `app/entry/[id]/sign.tsx`, `app/entry/[id]/request-signature.tsx`.

**Why:** assigned audit slice; app is multiply-audited so only NEW/verifiable findings count.

**How to apply:** when returning to these screens, the highest-value NEW findings were:
- Detail TopBar `IconMore` "More" button (line ~287) has NO `onPress` — a dead control on the primary detail header. IconBtn always renders a Pressable, so it looks live.
- Detail hero shows only a "N missing" Pill (line ~343) with no list and no tap target — a dead-end vs the sign screen which lists `missingFields` inline. Tech can't tell WHAT is missing from detail.
- `shareEntryPacket` (JSON audit packet, line ~163) has no try/catch and no pending state, unlike `shareEntryPdf` which sets pdfFailed/pdfPending. A failed JSON export is silent.
- Remote-request "Share link" calls `syncHostedRemoteSigningRequest` which can hit network; offline it silently falls back to the deep-link with no signal to the tech that the verifier will need the local path.
- Sign screen seal auto-advances after 3s `setTimeout` (KNOWN pattern from prior audits) — still the only confirmation surface.

Settled/INTENTIONAL confirmed NOT to re-flag: IconBtn sm=28px box but hitSlop guarantees 44px target (verified in icon-btn.tsx lines 52-54).
