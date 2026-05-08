import { Text } from 'react-native';
import { Card, Screen, StatRow } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

export default function GearScreen() {
  const { colors, typography } = useTheme();
  return (
    <Screen>
      <Card>
        <Text selectable style={{ ...typography.title2, color: colors.textPrimary }}>
          Gear
        </Text>
        <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
          The database tables for gear and inspections are already present. The next pass will add CRUD, due-date math, and inspection history.
        </Text>
        <StatRow label="Storage" value="SQLite" />
        <StatRow label="Mode" value="Local-first" />
      </Card>
    </Screen>
  );
}

