import React from 'react';
import { BadgeCheck, ChevronDown, ChevronUp, RotateCcw, Share2, UserRound } from 'lucide-react-native';
import { Share, Text, View } from 'react-native';
import { useCreateBackupSnapshot, useRestoreBackupSnapshot } from '@/src/domain/backup/use-backup';
import { BackupSnapshot } from '@/src/domain/backup/types';
import { useProfile } from '@/src/domain/profile/use-profile';
import { ActionTile, Button, Card, Field, Screen, StatRow } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

function CertPill({ value }: { value: string }) {
  const { colors, radii, spacing, typography } = useTheme();

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        minHeight: 30,
        borderRadius: radii.pill,
        backgroundColor: colors.statusInfoTint,
        paddingHorizontal: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: spacing.xs,
      }}
    >
      <BadgeCheck size={14} color={colors.statusInfo} strokeWidth={2.2} />
      <Text selectable={false} style={{ ...typography.caption, color: colors.statusInfo }}>
        {value}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { colors, spacing, typography } = useTheme();
  const profile = useProfile();
  const createBackup = useCreateBackupSnapshot();
  const restoreBackup = useRestoreBackupSnapshot();
  const [restoreText, setRestoreText] = React.useState('');
  const [restoreError, setRestoreError] = React.useState<string | null>(null);
  const [showRestore, setShowRestore] = React.useState(false);
  const p = profile.data;
  const primaryCertNumber = p?.primary_scheme === 'sprat' ? p.sprat_id : p?.irata_id;
  const primaryExpires = p?.primary_scheme === 'sprat' ? p.sprat_expires_on : p?.irata_expires_on;

  async function shareBackupSnapshot() {
    const snapshot = await createBackup.mutateAsync();
    await Share.share({
      title: 'RALB recovery snapshot',
      message: JSON.stringify(snapshot, null, 2),
    });
  }

  async function restoreSnapshot() {
    setRestoreError(null);
    try {
      const snapshot = JSON.parse(restoreText) as BackupSnapshot;
      await restoreBackup.mutateAsync(snapshot);
      setRestoreText('');
      setShowRestore(false);
    } catch {
      setRestoreError('Restore snapshot could not be read.');
    }
  }

  return (
    <Screen safeTop>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md }}>
          <View style={{ flex: 1, gap: spacing.sm }}>
            <CertPill value={p?.primary_scheme.toUpperCase() ?? 'No cert'} />
            <Text selectable style={{ ...typography.title1, color: colors.textPrimary }}>
              {p?.full_name ?? 'Profile'}
            </Text>
          </View>
          <UserRound size={30} color={colors.accentPrimary} strokeWidth={2.1} />
        </View>
        <StatRow label="Cert number" value={primaryCertNumber ?? '-'} />
        <StatRow label="Expires" value={primaryExpires ?? '-'} />
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <ActionTile
          title="Backup"
          icon={Share2}
          value={createBackup.isPending ? '...' : 'Share'}
          onPress={shareBackupSnapshot}
          tone="accent"
        />
        <ActionTile
          title="Restore"
          icon={RotateCcw}
          value={showRestore ? 'Open' : 'JSON'}
          onPress={() => setShowRestore((value) => !value)}
          tone={showRestore ? 'warn' : 'default'}
        />
      </View>

      {showRestore ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
            <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
              Restore
            </Text>
            <Button
              title="Close"
              icon={showRestore ? ChevronUp : ChevronDown}
              variant="ghost"
              onPress={() => setShowRestore(false)}
              style={{ minWidth: 92 }}
            />
          </View>
          <Field
            label="Snapshot JSON"
            value={restoreText}
            onChangeText={setRestoreText}
            multiline
            textAlignVertical="top"
            style={{ minHeight: 120 }}
            placeholder="Paste recovery snapshot"
          />
          <Button
            title={restoreBackup.isPending ? 'Restoring' : 'Restore'}
            icon={RotateCcw}
            onPress={restoreSnapshot}
            variant="secondary"
            disabled={!restoreText.trim() || restoreBackup.isPending}
          />
          {restoreError ? (
            <Text selectable style={{ ...typography.caption, color: colors.statusErr }}>
              {restoreError}
            </Text>
          ) : null}
        </Card>
      ) : null}

      {restoreBackup.isSuccess ? (
        <Text selectable style={{ ...typography.caption, color: colors.statusOk }}>
          Snapshot restored.
        </Text>
      ) : null}
    </Screen>
  );
}
