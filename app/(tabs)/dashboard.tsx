import { router } from 'expo-router';
import { BookOpen, ClipboardCheck, HardHat, Plus, ShieldCheck, Wrench } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { useCareerStats, useDashboardSummary } from '@/src/domain/logbook/use-logbook';
import { useProfile } from '@/src/domain/profile/use-profile';
import { ActionTile, Card, Screen, StatRow } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const { colors, radii, spacing, typography } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        minWidth: 118,
        borderRadius: radii.sm,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bgSurface,
        padding: spacing.md,
        gap: spacing.xs,
      }}
    >
      <Text selectable style={{ ...typography.title2, color: colors.textPrimary, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <Text selectable={false} style={{ ...typography.caption, color: colors.textSecondary }}>
        {label}
      </Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { colors, spacing, typography } = useTheme();
  const profile = useProfile();
  const summary = useDashboardSummary();
  const career = useCareerStats();
  const data = summary.data;
  const stats = career.data;

  return (
    <Screen>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text selectable style={{ ...typography.caption, color: colors.textSecondary, textTransform: 'uppercase' }}>
              Today
            </Text>
            <Text selectable style={{ ...typography.title1, color: colors.textPrimary }}>
              {profile.data?.full_name ?? 'Your logbook'}
            </Text>
          </View>
          <ShieldCheck size={30} color={colors.accentPrimary} strokeWidth={2.1} />
        </View>
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <ActionTile
          title="New entry"
          icon={Plus}
          tone="accent"
          onPress={() => router.push('/entry/new')}
        />
        <ActionTile
          title="Records"
          value={String(data?.totalEntries ?? 0)}
          icon={BookOpen}
          onPress={() => router.push('/records')}
        />
        <ActionTile
          title="Gear"
          value={String((data?.overdueGearItems ?? 0) + (data?.dueSoonGearItems ?? 0))}
          icon={HardHat}
          tone={(data?.overdueGearItems ?? 0) > 0 ? 'warn' : 'default'}
          onPress={() => router.push('/gear')}
        />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <Metric label="Signed hours" value={(data?.signedHours ?? 0).toFixed(1)} />
        <Metric label="Drafts" value={String(data?.draftEntries ?? 0)} />
        <Metric label="Pending" value={String(data?.pendingSignatureRequests ?? 0)} />
        <Metric label="Career hours" value={(stats?.totalHours ?? 0).toFixed(1)} />
      </View>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <ClipboardCheck size={18} color={colors.textSecondary} strokeWidth={2.1} />
          <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
            Readiness
          </Text>
        </View>
        {data?.expiringCerts.map((alert) => (
          <StatRow
            key={alert.label}
            label={alert.label}
            value={
              alert.severity === 'missing'
                ? 'Not set'
                : `${alert.value} (${alert.daysRemaining} days)`
            }
          />
        ))}
        <StatRow label="Overdue gear" value={String(data?.overdueGearItems ?? 0)} />
        <StatRow label="Gear due soon" value={String(data?.dueSoonGearItems ?? 0)} />
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Wrench size={18} color={colors.textSecondary} strokeWidth={2.1} />
          <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
            Top work
          </Text>
        </View>
        {stats?.byTask.slice(0, 3).map((bucket) => (
          <StatRow key={bucket.label} label={bucket.label} value={`${bucket.hours.toFixed(1)} hr`} />
        ))}
      </Card>
    </Screen>
  );
}
