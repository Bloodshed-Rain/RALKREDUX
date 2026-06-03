# RALKREDUX Feature Batch — Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Ship the requester's 7-item feedback batch in three risk-ordered batches, starting with the audit-risk-free "safe wins."

**Architecture:** Strict layering (screens in `app/`, logic in `src/domain/<feature>`, tokens in `src/ui`). Local SQLite is canonical. Anything that changes what a signature attests to bumps `ENTRY_HASH_VERSION` (currently **4** — note CLAUDE.md says 2, which is stale) and updates `canonicalizeEntry`.

**Tech Stack:** Expo / React Native, expo-sqlite (better-sqlite3 in tests), @tanstack/react-query, react-native-ui-datepicker v3.

---

## Decisions (owner + rope-access advisor, 2026-06-01)

- **#7 Access methods → multi-select, rope techniques ONLY.** No `means_of_access` axis, no MEWP/scaffold/ladder. Structurally identical to #6.
- **#6 Work types → multi-select with a designated primary** (ordered array, index 0 = primary). Maps to `work_task`. "Rescue Standby" is **not** a work task — it's covered by the existing rescue-cover field; do not add it as a work_task preset.
- **#3 Starting hours → full per-scheme split.** Two independent counters (SPRAT, IRATA) that the same shift can both increment; fixes the latent single-total dual-cert bug. Baselines are **immutable** once set (void-and-redeclare, never edit); shown as "carried forward (self-declared)".
- **#4 Legacy archive → evidence, never entries.** No hash/signature/chain. Walled off under Profile; in exports it goes in a hard-separated "Historical Reference — Self-Declared, Unverified" appendix, never summed into attested totals.
- **Sequencing → safe wins first.**

## Batches

| Batch | Items | Risk | Hash bump |
|-------|-------|------|-----------|
| **1 (this plan)** | #1 onboarding, #2 date range, #5 edit profile | None | No |
| 2 (separate plan) | #3 per-scheme starting hours, #4 legacy archive | Profile/additive | No |
| 3 (separate plan) | #6 + #7 multi-select work_task & access_method | Audit-sensitive | **Yes → v5** |

Batch 3 design (for the future plan): add `work_task_list` / `access_method_list` JSON-array TEXT columns mirroring the existing `hazards` pattern; **keep** the scalar `work_task`/`access_method` columns frozen so existing v4 signatures still verify via `canonicalizeEntry(entry, 4)`; add a `version >= 5` branch in `canonicalizeEntry` that serializes the sorted arrays; add `parseList`/`canonicalizeList` helpers; relax `entry-readiness` to require length ≥ 1; swap `ClassificationChips` for the multi variant; update career-stats bucketing to explode arrays. One coordinated `ENTRY_HASH_VERSION` 4→5 increment covers both fields.

---

## Batch 1 — Safe Wins

### Task 1: Onboarding third-screen clipping (#1)

**Root cause:** `app/(onboarding)/intro.tsx` renders header (top) → centered hero+text (`flex:1`) → pagination dots → CTA in a single non-scrollable `View`. On short viewports the third slide's longer copy grows the centered block until the dots/CTA are pushed past the screen edge (RN clips overflow). Fix: make only the middle hero+text block scrollable so the dots + CTA stay pinned — mirrors the `setup.tsx` ScrollView + pinned-button pattern.

**Files:**
- Modify: `app/(onboarding)/intro.tsx`

- [ ] **Step 1: Add `ScrollView` to the import from `react-native`** (alongside `Animated, Easing, Pressable, Text, View`).

- [ ] **Step 2: Wrap the hero+text block in a ScrollView.** Replace the middle `<View style={{ flex: 1, justifyContent: 'center', gap: 32 }}>…</View>` (currently lines ~197-217) with:

```tsx
<ScrollView
  style={{ flex: 1 }}
  contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: 32 }}
  showsVerticalScrollIndicator={false}
  bounces={false}
>
  {/* unchanged hero Animated.View + text Animated.View */}
</ScrollView>
```

Header, pagination dots, and CTA stay exactly where they are (siblings of the ScrollView). The CTA is now always visible; long copy scrolls instead of clipping.

- [ ] **Step 3: Verify.** `npm run typecheck` clean. Visual: `npm run web -- --host localhost --port 8091`, walk all 3 slides, confirm dots + "Get started" CTA visible on the third slide and a narrow window. (Native confirmation deferred to a dev build.)

- [ ] **Step 4: Commit** `fix(onboarding): scroll intro hero block so CTA/dots never clip on short screens`.

### Task 2: Certification expiry date range (#2)

**Root cause:** `DateField`/`DatePickerSheet` already support `maxDate`, but the cert-expiry `DateField` in `setup.tsx` CertCard (line 379-385) passes none. Without an explicit max, react-native-ui-datepicker's year navigation makes far-future years feel capped (~2027). Fix: pass an explicit far-future `maxDate` so 10+ years are reachable. **Verify the library's no-maxDate default first** (it may itself impose a near cap) by checking `node_modules/react-native-ui-datepicker`.

**Files:**
- Modify: `app/(onboarding)/setup.tsx` (CertCard DateField) — and the future edit-profile screen (Task 3) uses the same.
- Possibly add a helper: `src/domain/date-utils.ts` (`addYearsIso` if not present).

- [ ] **Step 1:** Confirm/add an `addYearsIso(iso, years)` (or compute inline) helper in `date-utils.ts`.
- [ ] **Step 2:** Pass `maxDate={addYearsIso(todayLocalIsoDate(), 20)}` (and `minDate={todayLocalIsoDate()}` — an expiry shouldn't be in the past) to the cert-expiry `DateField` in CertCard.
- [ ] **Step 3: Verify interactively** that years through at least today+10 are selectable (web preview + dev build). The advisor flagged: must be tested live, not assumed.
- [ ] **Step 4: Commit** `fix(certs): allow cert expiry dates 20y out so 10y+ renewals are reachable`.

### Task 3: Edit Profile after onboarding (#5)

**Root cause:** `profile-service.ts` has only `getProfile`, `createProfile`, `updateAvatar` — no field-level edit. All target fields already exist on the `profiles` table; no schema/hash change.

**Files:**
- Modify: `src/domain/profile/types.ts` — add `UpdateProfileInput`.
- Modify: `src/domain/profile/profile-service.ts` — add `updateProfile`.
- Test: `__tests__/domain/profile-service.test.ts` — add updateProfile coverage.
- Modify: `src/domain/profile/use-profile.ts` — add `useUpdateProfile`.
- Create: `app/profile-edit.tsx` — edit screen mirroring setup.tsx CertCard UX.
- Modify: `app/_layout.tsx` — register the route.
- Modify: `app/(tabs)/more.tsx` — add an "Edit profile" affordance on the OperatorCard.

- [ ] **Step 1 (TDD): Write failing test** in `__tests__/domain/profile-service.test.ts`: create a profile, then `updateProfile({ full_name, sprat_level, sprat_expires_on, ... })`, assert the row reflects the new values and `updated_at` advanced.
- [ ] **Step 2:** Run it — expect FAIL (`updateProfile is not a function`).
- [ ] **Step 3:** Add `UpdateProfileInput` (all editable fields optional: full_name, primary_scheme, sprat_id/level/expires_on, irata_id/level/expires_on) to `types.ts`.
- [ ] **Step 4:** Implement `updateProfile(input)` in the service: read existing (throw `profile_not_found` if none), `UPDATE profiles SET …, updated_at=? WHERE id=?` using `COALESCE`-style "only set provided fields" semantics (build the SET clause from defined keys), return the reloaded profile.
- [ ] **Step 5:** Run the test — expect PASS. Run full `npm test` — green.
- [ ] **Step 6:** Add `useUpdateProfile` to `use-profile.ts` (mutate → `queryClient.setQueryData(['profile'], profile)`).
- [ ] **Step 7:** Create `app/profile-edit.tsx`: load `useProfile`, prefill a form reusing the CertCard/ChipSelect/Field/DateField primitives, Save calls `useUpdateProfile`, back on success. Reuse the Task-2 `maxDate` on expiry fields.
- [ ] **Step 8:** Register `<Stack.Screen name="profile-edit" />` in `app/_layout.tsx`.
- [ ] **Step 9:** Add an "Edit" affordance to the OperatorCard in `app/(tabs)/more.tsx` → `router.push('/profile-edit')`.
- [ ] **Step 10:** `npm run typecheck` + `npm test` green. Commit `feat(profile): editable profile after onboarding`.

---

## Self-review notes
- Spec coverage: #1 Task 1, #2 Task 2, #5 Task 3. #3/#4 → Batch 2 plan; #6/#7 → Batch 3 plan.
- No schema migration or `ENTRY_HASH_VERSION` change in Batch 1.
- `updateProfile` must NOT allow editing fields that don't exist yet (hours baselines arrive in Batch 2).
