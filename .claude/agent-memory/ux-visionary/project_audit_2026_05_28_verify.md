---
name: project-audit-2026-05-28-verify
description: 2026-05-28 UX audit of the verifier portal (app/verify/[code].tsx) — offline error-state collapse + hosted submit dead-end
metadata:
  type: project
---

Audited `app/verify/[code].tsx` (verifier portal) on 2026-05-28 under the field-context lens.

Key NEW findings (code-certain):
- **Offline collapses to wrong "Request not found" copy.** Hosted path: `fetchHostedRemoteSigningRequest` returns null on any non-OK/network failure; the query's `isError` is never surfaced. When offline both `requestDetail.data` and `hostedRequestDetail.data` are null -> screen shows "Request not found / Check the request code and try again." Verifier blames the code, not connectivity. No retry control.
- **Hosted submit failure is a dead-end.** `hostedCompleteFailed` shows one line "Remote signing failed. Refresh the request and try again." No refresh/retry button exists; "refresh" is browser language on a native screen. Worst moment in the flow (supervisor just handed device back).
- **Local vs hosted error asymmetry:** local `completeRequest.mutate` re-enables button on error (form persists); hosted path sets a flag with no actionable recovery.

Non-findings confirmed (do NOT re-raise):
- IconBtn back button size="md" — primitive's hitSlop guarantees >=44px tappable. Fine.
- IconBtn already uses the Fabric-safe spread-conditional transform pattern.
- AttestationRow correctly uses accessibilityRole="checkbox" + accessibilityState={{checked}}.
- entry.work_hours.toFixed / max_height.toFixed are guarded (max_height checks <=0).

**Why:** First UX pass on the verifier portal; the verifier is often the worst-connected actor (their own device, remote site, no app installed).
**How to apply:** When reviewing remote-signing screens, always separate "not found" (bad code) from "couldn't reach server" (offline) — they need different copy and different recovery. Hosted path is the offline-fragile one.
