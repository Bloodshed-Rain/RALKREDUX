import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import { Button, Card, IconBtn, SectionH, TopBar } from '@/src/ui/primitives/v2';
import { IconArrowLeft } from '@/src/ui/icons';
import { haptics } from '@/src/ui/haptics';
import { useAuth } from '@/src/providers/auth-provider';

function providerLabel(provider: unknown): string {
  switch (provider) {
    case 'apple':
      return 'Apple';
    case 'google':
      return 'Google';
    case 'email':
      return 'Email';
    default:
      return 'Account';
  }
}

export default function AccountScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { configured, user, signOut } = useAuth();
  const [signingOut, setSigningOut] = React.useState(false);

  const provider = providerLabel(user?.app_metadata?.provider);
  const email = user?.email ?? 'Signed in';

  async function onSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      haptics.success();
      // Signing out flips the gate to the sign-in screen automatically.
    } catch {
      haptics.error();
      setSigningOut(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <TopBar
        title="Account"
        subtitle="Sign-in and subscription"
        leading={<IconBtn icon={IconArrowLeft} label="Back" size="md" onPress={() => router.back()} />}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 28 + insets.bottom, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {!configured ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
            <Card padding={14}>
              <Text style={{ ...type.cardSub, color: tokens.textDim, lineHeight: 20 }}>
                Cloud accounts aren&apos;t configured in this build. The logbook works fully
                offline; sign-in becomes available once the backend is set up.
              </Text>
            </Card>
          </View>
        ) : (
          <>
            <SectionH kicker="SIGNED IN" title="Your account" />
            <View style={{ paddingHorizontal: 20, gap: 8 }}>
              <Card padding={14}>
                <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>{provider.toUpperCase()}</Text>
                <Text style={{ ...type.cardTitle, color: tokens.text, marginTop: 4 }}>{email}</Text>
              </Card>
            </View>

            <SectionH kicker="SUBSCRIPTION" title="Plan" />
            <View style={{ paddingHorizontal: 20 }}>
              <Card padding={14}>
                <Text style={{ ...type.cardSub, color: tokens.textDim, lineHeight: 20 }}>
                  Subscription management arrives with billing. Your account is the identity your
                  plan will attach to.
                </Text>
              </Card>
            </View>

            <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
              <Button variant="danger" full disabled={signingOut} onPress={onSignOut}>
                {signingOut ? 'Signing out…' : 'Sign out'}
              </Button>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
