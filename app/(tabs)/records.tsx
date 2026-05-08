import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useEntries } from '@/src/domain/logbook/use-logbook';
import { Button, Card, Screen, StatRow } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

export default function RecordsScreen() {
  const { colors, spacing, typography } = useTheme();
  const entries = useEntries();

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
        <Text selectable style={{ ...typography.title2, color: colors.textPrimary }}>
          Records
        </Text>
        <Button
          title="Add"
          onPress={() => router.push('/entry/new')}
          variant="secondary"
          style={{ minWidth: 88 }}
        />
      </View>

      {entries.data?.length ? (
        entries.data.map((entry) => (
          <Pressable
            key={entry.id}
            accessibilityRole="button"
            onPress={() => router.push(`/entry/${entry.id}`)}
          >
            <Card>
              <View style={{ gap: spacing.xs }}>
                <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
                  {entry.site || 'Unnamed site'}
                </Text>
                <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
                  {entry.employer} - {entry.client}
                </Text>
              </View>
              <StatRow label="Date" value={entry.date_from === entry.date_to ? entry.date_from : `${entry.date_from} to ${entry.date_to}`} />
              <StatRow label="Hours" value={entry.work_hours.toFixed(1)} />
              <StatRow label="Status" value={entry.status} />
              <Text selectable style={{ ...typography.body, color: colors.textPrimary }}>
                {entry.description}
              </Text>
            </Card>
          </Pressable>
        ))
      ) : (
        <Card>
          <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
            No entries yet
          </Text>
          <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
            Add the first draft entry and we will build signing, amendments, and export around it.
          </Text>
        </Card>
      )}
    </Screen>
  );
}
