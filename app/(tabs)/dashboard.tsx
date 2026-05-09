import { router } from 'expo-router';
import { BookOpen, ClipboardCheck, Clock3, Plus, Send, ShieldCheck, TrendingUp } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Image, Text, View } from 'react-native';
import { useCareerStats, useDashboardSummary } from '@/src/domain/logbook/use-logbook';
import type { CertLevel, CertScheme, Profile } from '@/src/domain/profile/types';
import { useProfile } from '@/src/domain/profile/use-profile';
import { ActionTile, Card, Screen, StatRow } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

const mastheadLogo = require('@/assets/branding/masthead-logo.png');

type CertProgress = {
  scheme: CertScheme;
  title: string;
  target: number;
  value: number;
  detail: string;
  progress: number;
};

function nextLevelLabel(level: CertLevel | null): string {
  if (!level) return 'Add current level';
  if (level === 'I') return 'Level II';
  if (level === 'II') return 'Level III';
  return 'Level III renewal';
}

function hourTarget(scheme: CertScheme, level: CertLevel | null): number {
  if (!level) return 0;
  if (scheme === 'sprat') return level === 'I' ? 500 : 1000;
  return 1000;
}

function buildCertProgress(
  scheme: CertScheme,
  level: CertLevel | null,
  signedHours: number,
): CertProgress {
  const target = hourTarget(scheme, level);
  const title = `${scheme.toUpperCase()} ${nextLevelLabel(level)}`;
  const progress = target > 0 ? Math.min(signedHours / target, 1) : 0;
  const remaining = target > 0 ? Math.max(target - signedHours, 0) : 0;

  return {
    scheme,
    title,
    target,
    value: signedHours,
    progress,
    detail: target > 0
      ? `${signedHours.toFixed(1)} of ${target} signed hours - ${remaining.toFixed(1)} left`
      : 'Add this cert in Profile to track progress',
  };
}

function dashboardLine(data: ReturnType<typeof useDashboardSummary>['data']): string {
  if ((data?.pendingSignatureRequests ?? 0) > 0) {
    return 'Verifier requests are out. Keep the next entry ready.';
  }
  if ((data?.draftEntries ?? 0) > 0) {
    return 'Drafts are staged. Finish the details, then send for sign-off.';
  }
  if ((data?.signedEntries ?? 0) > 0) {
    return 'Signed hours are stacking. Log the next rope day while it is fresh.';
  }
  return 'Start with one clean entry. The rest gets easier.';
}

function certsForProfile(profile: Profile | null | undefined, signedHours: number): CertProgress[] {
  const progress: CertProgress[] = [];
  if (profile?.sprat_level) {
    progress.push(buildCertProgress('sprat', profile.sprat_level, signedHours));
  }
  if (profile?.irata_level) {
    progress.push(buildCertProgress('irata', profile.irata_level, signedHours));
  }
  return progress;
}

function StatusTile({
  label,
  value,
  note,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  tone?: 'default' | 'warn' | 'ok' | 'info';
}) {
  const { colors, radii, spacing, typography } = useTheme();
  const toneColor = tone === 'ok'
    ? colors.statusOk
    : tone === 'warn'
      ? colors.statusWarn
      : tone === 'info'
        ? colors.statusInfo
        : colors.accentPrimary;
  const toneBg = tone === 'ok'
    ? colors.statusOkTint
    : tone === 'warn'
      ? colors.statusWarnTint
      : tone === 'info'
        ? colors.statusInfoTint
        : colors.accentTint;

  return (
    <View
      style={{
        flex: 1,
        minWidth: 150,
        borderRadius: radii.sm,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bgSurface,
        padding: spacing.md,
        gap: spacing.sm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: radii.sm,
            backgroundColor: toneBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={18} color={toneColor} strokeWidth={2.2} />
        </View>
        <Text selectable style={{ ...typography.title2, color: colors.textPrimary, fontVariant: ['tabular-nums'] }}>
          {value}
        </Text>
      </View>
      <View style={{ gap: spacing.xs }}>
        <Text selectable={false} style={{ ...typography.label, color: colors.textPrimary }}>
          {label}
        </Text>
        <Text selectable={false} style={{ ...typography.caption, color: colors.textSecondary }}>
          {note}
        </Text>
      </View>
    </View>
  );
}

function CertProgressBar({ item }: { item: CertProgress }) {
  const { colors, radii, spacing, typography } = useTheme();
  const fillColor = item.scheme === 'sprat' ? colors.accentPrimary : colors.statusInfo;

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text selectable style={{ ...typography.label, color: colors.textPrimary }}>
            {item.title}
          </Text>
          <Text selectable style={{ ...typography.caption, color: colors.textSecondary }}>
            {item.detail}
          </Text>
        </View>
        <Text selectable style={{ ...typography.label, color: colors.textPrimary, fontVariant: ['tabular-nums'] }}>
          {Math.round(item.progress * 100)}%
        </Text>
      </View>
      <View
        style={{
          height: 10,
          borderRadius: radii.pill,
          backgroundColor: colors.bgMuted,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${Math.round(item.progress * 100)}%`,
            minWidth: item.progress > 0 ? 8 : 0,
            height: '100%',
            borderRadius: radii.pill,
            backgroundColor: fillColor,
          }}
        />
      </View>
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
  const isLoading = profile.isLoading || summary.isLoading || career.isLoading;
  const hasError = profile.isError || summary.isError || career.isError;
  const signedHours = data?.signedHours ?? 0;
  const draftHours = Math.max((stats?.totalHours ?? 0) - signedHours, 0);
  const certProgress = certsForProfile(profile.data, signedHours);

  return (
    <Screen
      safeTop
      background={
        <View
          style={{
            position: 'absolute',
            top: 18,
            left: -96,
            right: -96,
            height: 210,
            justifyContent: 'center',
          }}
        >
          <Image
            source={mastheadLogo}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
            style={{ width: '142%', height: 192, alignSelf: 'center' }}
          />
        </View>
      }
    >
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text selectable style={{ ...typography.caption, color: colors.textSecondary, textTransform: 'uppercase' }}>
              Field logbook
            </Text>
            <Text selectable style={{ ...typography.title1, color: colors.textPrimary }}>
              {profile.data?.full_name ?? 'Your logbook'}
            </Text>
            <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
              {dashboardLine(data)}
            </Text>
          </View>
          <ShieldCheck size={30} color={colors.accentPrimary} strokeWidth={2.1} />
        </View>
      </Card>

      {isLoading ? (
        <Card>
          <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
            Loading logbook
          </Text>
          <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
            Your records and profile are opening.
          </Text>
        </Card>
      ) : null}

      {hasError ? (
        <Card>
          <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
            Dashboard could not load
          </Text>
          <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
            Your data is still on this device. Try refreshing from another tab.
          </Text>
        </Card>
      ) : null}

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
      </View>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <TrendingUp size={18} color={colors.textSecondary} strokeWidth={2.1} />
          <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
            Certification progress
          </Text>
        </View>
        <Text selectable style={{ ...typography.caption, color: colors.textSecondary }}>
          Based on signed hours in this app. Time-in-level and assessor requirements still need to be checked separately.
        </Text>
        {certProgress.length ? (
          certProgress.map((item) => (
            <CertProgressBar key={item.scheme} item={item} />
          ))
        ) : (
          <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
            Add SPRAT or IRATA details in Profile to track signed-hour progress here.
          </Text>
        )}
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <ClipboardCheck size={18} color={colors.textSecondary} strokeWidth={2.1} />
          <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
            Logbook status
          </Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <StatusTile
            label="Signed records"
            value={String(data?.signedEntries ?? 0)}
            note={`${signedHours.toFixed(1)} verified hours`}
            icon={ShieldCheck}
            tone="ok"
          />
          <StatusTile
            label="Drafts to finish"
            value={String(data?.draftEntries ?? 0)}
            note={`${draftHours.toFixed(1)} unsignatured hours`}
            icon={Clock3}
            tone="warn"
          />
          <StatusTile
            label="Waiting on verifier"
            value={String(data?.pendingSignatureRequests ?? 0)}
            note="Remote requests out"
            icon={Send}
            tone="info"
          />
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <BookOpen size={18} color={colors.textSecondary} strokeWidth={2.1} />
          <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
            Recent work mix
          </Text>
        </View>
        {stats?.byTask.length ? (
          stats.byTask.slice(0, 3).map((bucket) => (
            <StatRow key={bucket.label} label={bucket.label} value={`${bucket.hours.toFixed(1)} hr`} />
          ))
        ) : (
          <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
            Add a signed entry to see your most common work types.
          </Text>
        )}
      </Card>
    </Screen>
  );
}
