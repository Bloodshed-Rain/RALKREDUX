import { Redirect } from 'expo-router';
import { Text } from 'react-native';
import { useProfile } from '@/src/domain/profile/use-profile';
import { Screen } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

export default function IndexRoute() {
  const profile = useProfile();
  const { colors, typography } = useTheme();

  if (profile.isLoading) {
    return (
      <Screen>
        <Text selectable style={{ ...typography.body, color: colors.textPrimary }}>
          Loading profile
        </Text>
      </Screen>
    );
  }

  if (!profile.data) return <Redirect href="/setup" />;
  return <Redirect href="/today" />;
}

