---
name: audit-2026-05-28-settings-system
description: UX-flow audit of Settings & system screens (more/account/security/export/attachments) on 2026-05-28; offline false-reassurance is the headline
metadata:
  type: project
---

Reviewed the Settings & system screen group on 2026-05-28 (UX flow & field-context lens): app/(tabs)/more.tsx, app/account.tsx, app/security.tsx, app/export.tsx, app/attachments.tsx. No P0 in this scope — correct outcome, did not manufacture one.

Headline + durable findings:

- **account.tsx offline false-reassurance (P1, headline).** `backups = backupsQuery.data?.ok ? ... : []`. `listBackups()` catches internally and returns `{ok:false, reason}` instead of throwing, so React Query `isError` NEVER fires and `ok:false` (offline / list_failed / not_signed_in) collapses to the SAME empty UI as "No cloud backups yet" — under copy claiming auto-backup is working. A signed-in tech who is offline with real cloud backups is told they have none, and the only restore path is hidden (`backups.length > 0` gate). This is the structural cousin of the KNOWN-BACKLOG "isError unhandled" pattern but worse because the service swallows the error into a success-shaped value.

- **Navigation registration gap (verified per assignment ask).** app/_layout.tsx does NOT register account/security/attachments as `<Stack.Screen>`. Parent `<Stack screenOptions>` does NOT set headerShown:false globally (default = header shown). All three (and export, which IS registered) self-declare `<Stack.Screen options={{headerShown:false}} />` in-component, so NO persistent double-header. Residual risk: native-header flash on mount (unregistered routes default title to route name "account"/"security"/"attachments") before in-component option applies. needs-on-device P3. Worth recording as explicitly checked.

- **more.tsx shareBackupSnapshot has no try/catch (P2, code-certain).** Sibling `ChainIntegrityPanel.shareHash` (more.tsx:606-612) DOES wrap Share.share in try/catch with comment "user cancelled or share unsupported". So merely cancelling the OS share sheet throws an unhandled rejection in shareBackupSnapshot but is handled in shareHash — same file, inconsistent. Airtight via the contrast.

- **export.tsx auditor-handoff inconsistency (P2, code-certain).** PDF path writes a file + uses Sharing.shareAsync (real file attachment). JSON ("Audit packet", the compliance artifact) and CSV go through `Share.share({message})` — arrive as message-body TEXT, not a .json/.csv file. Poor auditor handoff regardless of size; large logbooks add a needs-on-device big-string reliability risk. Recommend JSON/CSV mirror the PDF file-write path.

- **more.tsx dead chevron (P2, NEW instance of dead-affordance family).** SettingsRow always renders `<IconChevron>` and applies the pressed scale transform even when `onPress={undefined}` (Chain integrity row pre-first-signature). Depresses on touch, does nothing. Same family as memory's dead More / retire-gear buttons. Low frequency (pre-first-signature only) = P2 not P1.

- **"subscription" copy over-promise (P2).** account.tsx TopBar subtitle "Sign-in and subscription" + more.tsx Account row sub "Sign-in, subscription, and sign out" promise a subscription feature that exists nowhere. In unconfigured mode the row also promises "sign out" the screen can't show.

- attachments.tsx:149 renders `item.entry_date` (ISO string) raw instead of formatDateOrDash used elsewhere (P3 consistency nit). attachments correctly distinguishes loading vs empty via `groups.length===0 && all.isFetched`.

Did NOT flag (settled): local restore inline checkbox+preview+danger-CTA without Alert.alert (blessed in 2026-05-20 memory — do NOT apply the every-destructive-write-needs-Alert rule here); export date inputs (now DateField sheet picker, memory was stale, resolved); Fabric transform:undefined + missing keys (all conditional transforms use `: null`, all maps keyed — clean); loading=null / isError-unhandled as standalone (KNOWN-BACKLOG).

Related: [[audit-2026-05-28-create-edit-amend]], [[project-audit-2026-05-20]], [[feedback-destructive-confirmation-audit]].
