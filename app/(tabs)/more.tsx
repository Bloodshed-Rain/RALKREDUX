import React from 'react';
import { ChevronDown, ChevronUp, RotateCcw, Share2 } from 'lucide-react-native';
import { Share, Text, TextInput, View } from 'react-native';
import { useCreateBackupSnapshot, useRestoreBackupSnapshot } from '@/src/domain/backup/use-backup';
import { BackupSnapshot } from '@/src/domain/backup/types';
import { formatDateOrDash } from '@/src/domain/date-format';
import { useProfile } from '@/src/domain/profile/use-profile';
import {
  AnimatedStamp,
  CheckboxRow,
  Chip,
  DocActionButton,
  DocBand,
  Screen,
  SectionH,
} from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

export default function ProfileScreen() {
  const { spacing, typography, touchTarget, tidewater, hairlines } = useTheme();
  const profile = useProfile();
  const createBackup = useCreateBackupSnapshot();
  const restoreBackup = useRestoreBackupSnapshot();
  const [restoreText, setRestoreText] = React.useState('');
  const [restoreError, setRestoreError] = React.useState<string | null>(null);
  const [showRestore, setShowRestore] = React.useState(false);
  const [restoreConfirmed, setRestoreConfirmed] = React.useState(false);
  const [previewSnapshot, setPreviewSnapshot] = React.useState<BackupSnapshot | null>(null);
  const p = profile.data;
  const primaryCertNumber = p?.primary_scheme === 'sprat' ? p.sprat_id : p?.irata_id;
  const primaryLevel = p?.primary_scheme === 'sprat' ? p.sprat_level : p?.irata_level;
  const primaryExpires = p?.primary_scheme === 'sprat' ? p.sprat_expires_on : p?.irata_expires_on;
  const certLabel = p
    ? `${p.primary_scheme.toUpperCase()}${primaryLevel ? ` ${primaryLevel}` : ''}`
    : 'NO CERT';

  async function shareBackupSnapshot() {
    const snapshot = await createBackup.mutateAsync();
    await Share.share({
      title: 'RALB recovery snapshot',
      message: JSON.stringify(snapshot, null, 2),
    });
  }

  function previewRestoreText() {
    setRestoreError(null);
    try {
      const trimmed = restoreText.trim();
      if (!trimmed) {
        setRestoreError('Paste a recovery snapshot before previewing.');
        return;
      }
      const parsed = JSON.parse(trimmed) as Partial<BackupSnapshot>;
      if (!parsed || typeof parsed !== 'object' || !parsed.data || !parsed.backup_schema_version) {
        setRestoreError('That does not look like a RALB recovery snapshot.');
        return;
      }
      setPreviewSnapshot(parsed as BackupSnapshot);
    } catch {
      setRestoreError('Recovery file could not be parsed as JSON.');
    }
  }

  async function restoreSnapshot() {
    if (!previewSnapshot) {
      previewRestoreText();
      return;
    }
    setRestoreError(null);
    try {
      await restoreBackup.mutateAsync(previewSnapshot);
      setRestoreText('');
      setRestoreConfirmed(false);
      setPreviewSnapshot(null);
      setShowRestore(false);
    } catch {
      setRestoreError('Restore failed. The local ledger is unchanged.');
    }
  }

  function clearPreview() {
    setPreviewSnapshot(null);
    setRestoreConfirmed(false);
    setRestoreError(null);
  }

  return (
    <Screen padded={false} safeTop>
      <DocBand
        variant="top"
        formId="CH.10 - PROFILE & BACKUP"
        rev={p ? 'PROFILE ON FILE' : 'NO PROFILE'}
        effective="ENTRY-HASH v2"
        rightLabel={certLabel}
      />

      <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.base, gap: spacing.lg }}>
        {/* Header card */}
        <View
          style={{
            borderWidth: hairlines.standard.width,
            borderColor: hairlines.standard.color,
            backgroundColor: tidewater.white,
          }}
        >
          <View
            style={{
              padding: spacing.md,
              borderBottomWidth: 1.5,
              borderBottomColor: tidewater.hair,
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: spacing.sm,
              alignItems: 'flex-start',
            }}
          >
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.8 }}>
                OPERATOR PROFILE
              </Text>
              <Text selectable style={{ ...typography.displayMd, color: tidewater.ink }} numberOfLines={2}>
                {p?.full_name || 'No profile'}
              </Text>
              <Text style={{ ...typography.monoSm, color: tidewater.ink2 }}>
                LOCAL LEDGER ON THIS DEVICE
              </Text>
            </View>
            <AnimatedStamp tone={p ? 'green' : 'mute'} rotation="light">
              {p ? 'ON FILE' : 'NONE'}
            </AnimatedStamp>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, padding: spacing.md }}>
            <Chip tone="ink">{certLabel}</Chip>
            {primaryCertNumber ? <Chip tone="mute">{`# ${primaryCertNumber}`}</Chip> : null}
            <Chip tone={primaryExpires ? 'green' : 'mute'}>
              {primaryExpires ? `EXPIRES ${formatDateOrDash(primaryExpires).toUpperCase()}` : 'EXPIRY NOT SET'}
            </Chip>
          </View>
        </View>

        {/* § 33 Backup */}
        <View>
          <SectionH n="33" right="LOCAL LEDGER">
            Backup and recovery
          </SectionH>
          <View
            style={{
              borderWidth: hairlines.standard.width,
              borderColor: hairlines.standard.color,
              backgroundColor: tidewater.white,
              padding: spacing.md,
              gap: spacing.md,
            }}
          >
            <Text style={{ ...typography.body, color: tidewater.ink2 }}>
              Share a backup snapshot to keep a copy of this device's logbook off-device. Restoring replaces the local
              ledger with the snapshot.
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <DocActionButton
                title={createBackup.isPending ? 'PREPARING' : 'SHARE BACKUP'}
                icon={Share2}
                onPress={shareBackupSnapshot}
                loading={createBackup.isPending}
                style={{ flex: 1 }}
              />
              <DocActionButton
                title={showRestore ? 'CLOSE RESTORE' : 'RESTORE'}
                icon={showRestore ? ChevronUp : ChevronDown}
                variant="secondary"
                onPress={() => {
                  setRestoreConfirmed(false);
                  setShowRestore((value) => !value);
                }}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>

        {/* § 34 Restore (collapsible) */}
        {showRestore ? (
          <View>
            <SectionH n="34" right="DESTRUCTIVE">
              Restore from snapshot
            </SectionH>
            <View
              style={{
                borderWidth: 1.5,
                borderColor: tidewater.yellowDeep,
                backgroundColor: tidewater.yellowSoft,
                padding: spacing.md,
                gap: spacing.xs,
              }}
            >
              <Text style={{ ...typography.displaySm, color: tidewater.ink, letterSpacing: 1.2 }}>
                THIS REPLACES THE LOCAL LEDGER
              </Text>
              <Text style={{ ...typography.monoSm, color: tidewater.ink2 }}>
                Share a backup first if you need to keep the current data on this device.
              </Text>
            </View>
            <View
              style={{
                marginTop: spacing.sm,
                borderWidth: hairlines.standard.width,
                borderColor: hairlines.standard.color,
                backgroundColor: tidewater.white,
                padding: spacing.md,
                gap: spacing.md,
              }}
            >
              <View style={{ gap: spacing.xs }}>
                <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.5 }}>
                  RECOVERY FILE TEXT
                </Text>
                <Text style={{ ...typography.monoSm, color: tidewater.ink3 }}>
                  Open the snapshot you shared earlier (Mail, Messages, Files) and paste its
                  contents here. Preview first; the actual restore is a second confirmed step.
                </Text>
                <TextInput
                  value={restoreText}
                  onChangeText={(value) => {
                    setRestoreText(value);
                    if (previewSnapshot) clearPreview();
                  }}
                  editable={!previewSnapshot}
                  multiline
                  placeholder="Paste recovery file text"
                  placeholderTextColor={tidewater.ink3}
                  style={{
                    borderWidth: 1.5,
                    borderColor: tidewater.hair,
                    backgroundColor: previewSnapshot ? tidewater.paper2 : tidewater.white,
                    padding: spacing.sm,
                    ...typography.body,
                    color: tidewater.ink,
                    minHeight: 120,
                    textAlignVertical: 'top',
                  }}
                />
              </View>

              {previewSnapshot ? (
                <View
                  style={{
                    borderWidth: 1.5,
                    borderColor: tidewater.green,
                    backgroundColor: tidewater.greenSoft,
                    padding: spacing.sm,
                    gap: spacing.xs,
                  }}
                >
                  <Text style={{ ...typography.displaySm, color: tidewater.green, letterSpacing: 1.2 }}>
                    SNAPSHOT PREVIEW
                  </Text>
                  <SnapshotSummaryRow
                    label="EXPORTED"
                    value={formatDateOrDash(previewSnapshot.exported_at)}
                  />
                  <SnapshotSummaryRow
                    label="OPERATOR"
                    value={previewSnapshot.data.profiles[0]?.full_name || '—'}
                  />
                  <SnapshotSummaryRow
                    label="ENTRIES"
                    value={String(previewSnapshot.data.entries.length)}
                  />
                  <SnapshotSummaryRow
                    label="SIGNATURES"
                    value={String(previewSnapshot.data.signatures.length)}
                  />
                  <SnapshotSummaryRow
                    label="GEAR ITEMS"
                    value={String(previewSnapshot.data.gear_items.length)}
                  />
                </View>
              ) : null}

              {previewSnapshot ? (
                <>
                  <View
                    style={{
                      borderWidth: 1.5,
                      borderColor: restoreConfirmed ? tidewater.green : tidewater.hairSoft,
                      backgroundColor: restoreConfirmed ? tidewater.greenSoft : tidewater.white,
                      padding: spacing.sm,
                    }}
                  >
                    <CheckboxRow
                      checked={restoreConfirmed}
                      label="I understand this will replace the local logbook on this device."
                      onChange={setRestoreConfirmed}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <DocActionButton
                      title="BACK TO PASTE"
                      variant="secondary"
                      onPress={clearPreview}
                      disabled={restoreBackup.isPending}
                      style={{ flex: 1 }}
                    />
                    <DocActionButton
                      title={restoreBackup.isPending ? 'RESTORING' : 'RESTORE LEDGER'}
                      icon={RotateCcw}
                      onPress={restoreSnapshot}
                      disabled={!restoreConfirmed || restoreBackup.isPending}
                      loading={restoreBackup.isPending}
                      style={{ flex: 1 }}
                    />
                  </View>
                </>
              ) : (
                <DocActionButton
                  title="PREVIEW SNAPSHOT"
                  variant="secondary"
                  onPress={previewRestoreText}
                  disabled={!restoreText.trim()}
                />
              )}

              {restoreError ? (
                <Text style={{ ...typography.monoSm, color: tidewater.red, letterSpacing: 1.2 }}>
                  {restoreError.toUpperCase()}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {restoreBackup.isSuccess ? (
          <View
            style={{
              borderWidth: 1.5,
              borderColor: tidewater.green,
              backgroundColor: tidewater.greenSoft,
              padding: spacing.md,
            }}
          >
            <Text style={{ ...typography.displaySm, color: tidewater.green, letterSpacing: 1.2 }}>
              RECOVERY FILE RESTORED
            </Text>
            <Text style={{ ...typography.monoSm, color: tidewater.ink2, marginTop: 4 }}>
              The local logbook now reflects the snapshot.
            </Text>
          </View>
        ) : null}

        {/* § 35 About this device */}
        <View>
          <SectionH n="35">About this device</SectionH>
          <View
            style={{
              borderWidth: 1.5,
              borderColor: tidewater.hair,
              backgroundColor: tidewater.white,
            }}
          >
            <DocRow label="OPERATOR" value={p?.full_name || '—'} />
            <DocRow label="PRIMARY" value={p ? `${p.primary_scheme.toUpperCase()} ${primaryLevel ?? '—'}` : '—'} />
            <DocRow label="CERT NUMBER" value={primaryCertNumber || '—'} />
            <DocRow label="EXPIRES" value={formatDateOrDash(primaryExpires)} />
            <DocRow label="LEDGER" value="LOCAL · OFFLINE-FIRST" mono last />
          </View>
        </View>
      </View>

      <View style={{ marginTop: spacing.lg }}>
        <DocBand
          variant="footer"
          text={
            showRestore
              ? 'RESTORE IS DESTRUCTIVE - SHARE A BACKUP BEFORE CONTINUING'
              : 'LOCAL LEDGER ONLY - BACKUPS LEAVE THIS DEVICE WHEN YOU SHARE'
          }
          page={p?.primary_scheme.toUpperCase() ?? 'NO CERT'}
        />
      </View>
    </Screen>
  );
}

function DocRow({
  label,
  value,
  mono = false,
  last = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  last?: boolean;
}) {
  const { spacing, typography, tidewater } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs + 2,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: tidewater.hairFaint,
        gap: spacing.sm,
      }}
    >
      <Text style={{ ...typography.monoSm, color: tidewater.ink3, width: 96, letterSpacing: 1.5 }}>
        {label}
      </Text>
      <Text
        selectable
        style={{
          flex: 1,
          ...(mono ? typography.monoMd : typography.body),
          color: tidewater.ink,
        }}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

function SnapshotSummaryRow({ label, value }: { label: string; value: string }) {
  const { spacing, typography, tidewater } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
      <Text
        style={{
          ...typography.monoSm,
          color: tidewater.ink3,
          letterSpacing: 1.5,
          width: 88,
        }}
      >
        {label}
      </Text>
      <Text style={{ ...typography.bodyMed, color: tidewater.ink, flex: 1 }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

