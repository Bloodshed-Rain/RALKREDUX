import { Text } from 'react-native';
import { useProfile } from '@/src/domain/profile/use-profile';
import { Card, Screen, StatRow } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

export default function ProfileScreen() {
  const { colors, typography } = useTheme();
  const profile = useProfile();
  const p = profile.data;

  return (
    <Screen>
      <Card>
        <Text selectable style={{ ...typography.title2, color: colors.textPrimary }}>
          Profile
        </Text>
        <StatRow label="Name" value={p?.full_name ?? 'Not set'} />
        <StatRow label="Primary cert" value={p?.primary_scheme.toUpperCase() ?? '-'} />
        <StatRow
          label="Cert number"
          value={p?.primary_scheme === 'sprat' ? p.sprat_id ?? '-' : p?.irata_id ?? '-'}
        />
        <StatRow
          label="Expires"
          value={p?.primary_scheme === 'sprat' ? p.sprat_expires_on ?? '-' : p?.irata_expires_on ?? '-'}
        />
      </Card>
      <Card>
        <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
          Upcoming
        </Text>
        <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
          This surface will become the home for cloud state, subscription ownership, cert edits, and account controls.
        </Text>
      </Card>
    </Screen>
  );
}

