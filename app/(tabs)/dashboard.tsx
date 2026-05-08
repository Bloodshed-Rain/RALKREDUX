import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useDashboardSummary } from '@/src/domain/logbook/use-logbook';
import { useProfile } from '@/src/domain/profile/use-profile';
import { Button, Card, Screen, StatRow } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

export default function DashboardScreen() {
  const { colors, spacing, typography } = useTheme();
  const profile = useProfile();
  const summary = useDashboardSummary();
  const data = summary.data;

  return (
    <Screen>
      <Card>
        <Text selectable style={{ ...typography.caption, color: colors.textSecondary, textTransform: 'uppercase' }}>
          Rope Access Logbook
        </Text>
        <Text selectable style={{ ...typography.title1, color: colors.textPrimary }}>
          {profile.data?.full_name ?? 'Your logbook'}
        </Text>
        <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
          Local-first foundation is live. The next layers are signatures, export, cloud recovery, and supervisor flows.
        </Text>
      </Card>

      <Card>
        <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
          Logbook summary
        </Text>
        <StatRow label="Total entries" value={String(data?.totalEntries ?? 0)} />
        <StatRow label="Draft entries" value={String(data?.draftEntries ?? 0)} />
        <StatRow label="Signed entries" value={String(data?.signedEntries ?? 0)} />
        <StatRow label="Amended entries" value={String(data?.amendedEntries ?? 0)} />
        <StatRow label="Pending signatures" value={String(data?.pendingSignatureRequests ?? 0)} />
        <StatRow label="Draft hours" value={(data?.draftHours ?? 0).toFixed(1)} />
        <StatRow label="Signed hours" value={(data?.signedHours ?? 0).toFixed(1)} />
      </Card>

      <View style={{ gap: spacing.sm }}>
        <Button title="Add work entry" onPress={() => router.push('/entry/new')} />
        <Text selectable style={{ ...typography.caption, color: colors.textSecondary }}>
          Entries start as drafts, then lock after supervisor sign-off.
        </Text>
      </View>
    </Screen>
  );
}
