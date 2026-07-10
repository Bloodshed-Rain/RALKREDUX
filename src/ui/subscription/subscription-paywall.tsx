import React from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';
import { useAuth } from '@/src/providers/auth-provider';
import { useSubscription } from '@/src/domain/subscription/subscription-provider';
import { shouldAdvertiseTrial } from '@/src/domain/subscription/revenuecat';
import {
  PRIVACY_POLICY_URL,
  STORE_DISPLAY_NAME,
  TERMS_OF_USE_URL,
} from '@/src/domain/subscription/store-details';
import {
  SubscriptionLegalSheet,
  type SubscriptionLegalSheetKind,
} from '@/src/ui/legal/subscription-legal-sheet';
import { IconBrand, IconCheck, IconCloudBackup, IconLock, IconVerified } from '@/src/ui/icons';
import { haptics } from '@/src/ui/haptics';
import { Button, Card, Pill } from '@/src/ui/primitives/v2';
import { type } from '@/src/ui/theme/type';
import { scaled } from '@/src/ui/scale';
import { useTheme } from '@/src/ui/theme/theme-provider';

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function periodWords(iso: string | null | undefined, cycles = 1): string | null {
  if (!iso) return null;
  const match = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?$/.exec(iso);
  if (!match) return null;
  const parts = [
    { value: Number(match[1] ?? 0), singular: 'year' },
    { value: Number(match[2] ?? 0), singular: 'month' },
    { value: Number(match[3] ?? 0), singular: 'week' },
    { value: Number(match[4] ?? 0), singular: 'day' },
  ].filter((p) => p.value > 0);
  if (parts.length !== 1) return null;
  const total = parts[0].value * cycles;
  return `${total} ${parts[0].singular}${total === 1 ? '' : 's'}`;
}

function packageTitle(pkg: PurchasesPackage): string {
  switch (pkg.packageType) {
    case 'MONTHLY':
      return 'Monthly';
    case 'ANNUAL':
      return 'Annual';
    case 'LIFETIME':
      return 'Lifetime';
    case 'WEEKLY':
      return 'Weekly';
    case 'SIX_MONTH':
      return 'Six months';
    case 'THREE_MONTH':
      return 'Three months';
    case 'TWO_MONTH':
      return 'Two months';
    default:
      return pkg.product.title || 'Subscription';
  }
}

function packageCadence(pkg: PurchasesPackage): string | null {
  const period =
    pkg.product.subscriptionPeriod ??
    pkg.product.defaultOption?.fullPricePhase?.billingPeriod?.iso8601 ??
    null;
  const words = periodWords(period);
  if (!words) return null;
  return words === '1 month'
    ? 'per month'
    : words === '1 year'
      ? 'per year'
      : `every ${words}`;
}

function trialLabel(pkg: PurchasesPackage): string | null {
  const intro = pkg.product.introPrice;
  if (intro && intro.price === 0) {
    const words = periodWords(intro.period, intro.cycles);
    return words ? `${words} free trial` : 'Free trial included';
  }
  const freePhase = pkg.product.defaultOption?.freePhase;
  if (freePhase) {
    const words = periodWords(freePhase.billingPeriod.iso8601, freePhase.billingCycleCount ?? 1);
    return words ? `${words} free trial` : 'Free trial included';
  }
  return null;
}

function renewalLine(pkg: PurchasesPackage | null): string {
  if (!pkg) return `Payment and renewal are handled by ${STORE_DISPLAY_NAME}.`;
  const cadence = packageCadence(pkg);
  const price = pkg.product.priceString;
  return cadence
    ? `${price} ${cadence}. Payment and renewal are handled by ${STORE_DISPLAY_NAME}.`
    : `${price}. Payment and renewal are handled by ${STORE_DISPLAY_NAME}.`;
}

function statusCopy(status: ReturnType<typeof useSubscription>['status'], expires: string | null) {
  if (status === 'needs_connection') {
    return 'Connect once to verify your subscription for this account.';
  }
  if (status === 'error') {
    return 'Subscription verification could not finish. Retry or restore purchases.';
  }
  if (expires) {
    return `Your last verified access runs through ${expires}.`;
  }
  return 'Start a subscription or restore an existing purchase to continue.';
}

function PlanCard({
  pkg,
  trial,
  selected,
  onPress,
}: {
  pkg: PurchasesPackage;
  trial: string | null;
  selected: boolean;
  onPress: () => void;
}) {
  const { tokens } = useTheme();
  const cadence = packageCadence(pkg);

  const containerStyle: ViewStyle = {
    borderRadius: 14,
    borderWidth: selected ? 2 : 1,
    borderColor: selected ? tokens.accent : tokens.lineSoft,
    backgroundColor: selected ? tokens.accentSoft : tokens.surface,
    padding: 14,
  };

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${packageTitle(pkg)} subscription`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [containerStyle, pressed ? { transform: [{ scale: 0.99 }] } : null]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: selected ? tokens.accent : tokens.line,
            backgroundColor: selected ? tokens.accent : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {selected ? <IconCheck size={14} color={tokens.accentInk} /> : null}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ ...type.cardTitle, color: tokens.text }}>{packageTitle(pkg)}</Text>
          <Text style={{ ...type.cardSub, color: tokens.textDim }} numberOfLines={2}>
            {[pkg.product.priceString, cadence].filter(Boolean).join(' ')}
          </Text>
        </View>
        {trial ? (
          <Pill tone="accent" size="sm">
            Trial
          </Pill>
        ) : null}
      </View>
      {trial ? (
        <Text style={{ ...type.cardSub, color: tokens.text, marginTop: 10 }}>{trial}</Text>
      ) : null}
    </Pressable>
  );
}

export function SubscriptionPaywall() {
  const subscription = useSubscription();
  const auth = useAuth();
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [legalSheet, setLegalSheet] = React.useState<SubscriptionLegalSheetKind | null>(null);
  const [accountBusy, setAccountBusy] = React.useState<'none' | 'sign_out' | 'delete'>('none');
  const [selectedId, setSelectedId] = React.useState<string | null>(
    subscription.defaultPackage?.identifier ?? null,
  );

  // A trial is only advertised when the store will actually honor it — a
  // lapsed subscriber who already consumed the intro offer sees plain pricing.
  const trialFor = React.useCallback(
    (pkg: PurchasesPackage): string | null =>
      shouldAdvertiseTrial(subscription.trialEligibility, pkg.product.identifier, subscription.platform)
        ? trialLabel(pkg)
        : null,
    [subscription.platform, subscription.trialEligibility],
  );

  React.useEffect(() => {
    const ids = new Set(subscription.packages.map((p) => p.identifier));
    if (!selectedId || !ids.has(selectedId)) {
      setSelectedId(subscription.defaultPackage?.identifier ?? null);
    }
  }, [selectedId, subscription.defaultPackage?.identifier, subscription.packages]);

  const selectedPackage =
    subscription.packages.find((pkg) => pkg.identifier === selectedId) ??
    subscription.defaultPackage;
  const expires = formatDate(subscription.cached?.expirationDate);
  const primaryLabel =
    selectedPackage && trialFor(selectedPackage)
      ? 'Start free trial'
      : selectedPackage
        ? 'Subscribe'
        : 'Load plans';
  const actionBusy =
    subscription.busy === 'purchase' || subscription.busy === 'restore' || accountBusy !== 'none';

  async function onPurchase() {
    if (!selectedPackage) {
      await subscription.refresh();
      return;
    }
    try {
      const result = await subscription.purchase(selectedPackage);
      if (result.cancelled) return;
      if (result.active) {
        haptics.success();
      } else {
        haptics.selection();
        Alert.alert('Purchase pending', 'Your purchase is processing. Restore purchases after it completes.');
      }
    } catch {
      haptics.error();
      Alert.alert('Purchase failed', 'The store could not complete the purchase. Please try again.');
    }
  }

  async function onRestore() {
    try {
      const result = await subscription.restore();
      if (result.active) {
        haptics.success();
        Alert.alert('Restored', 'Your subscription is active on this device.');
      } else {
        haptics.selection();
        Alert.alert('No active purchase', 'We could not find an active subscription for this store account.');
      }
    } catch {
      haptics.error();
      Alert.alert('Restore failed', 'The store could not restore purchases. Please try again.');
    }
  }

  async function onRetry() {
    await subscription.refresh();
  }

  // The paywall replaces the whole navigation stack, so account actions must
  // be reachable from here: a lapsed subscriber can always sign out, and App
  // Store 5.1.1(v) account deletion cannot sit behind the subscription wall.
  function onSignOut() {
    Alert.alert('Sign out?', 'You can sign back in any time. Your logbook stays on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setAccountBusy('sign_out');
            try {
              await auth.signOut();
            } catch {
              haptics.error();
              Alert.alert(
                'Could not sign out',
                'The server could not be reached to end the session. Check your connection and try again.',
              );
            } finally {
              setAccountBusy('none');
            }
          })();
        },
      },
    ]);
  }

  function onDeleteAccount() {
    Alert.alert(
      'Delete your account?',
      `This permanently deletes your cloud account, all cloud backups, and any pending remote-signing links. It cannot be undone.\n\nThe logbook stored on this device is not deleted. An active subscription is managed by ${STORE_DISPLAY_NAME} and must be cancelled there.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setAccountBusy('delete');
              try {
                await auth.deleteAccount();
                haptics.success();
              } catch {
                haptics.error();
                Alert.alert(
                  'Account deletion did not finish',
                  'Some cloud data may already have been removed, but your account still exists and your sign-in and this device’s logbook are unchanged. Check your connection and try again to finish deleting the account.',
                );
              } finally {
                setAccountBusy('none');
              }
            })();
          },
        },
      ],
    );
  }

  async function onOpenLegal(kind: SubscriptionLegalSheetKind) {
    const url = kind === 'privacy' ? PRIVACY_POLICY_URL : TERMS_OF_USE_URL;
    if (url) {
      try {
        await Linking.openURL(url);
        return;
      } catch {
        // Fall through to the in-app copy if the OS cannot open the link.
      }
    }
    setLegalSheet(kind);
  }

  const heroTitleStyle: TextStyle = {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: scaled(30),
    lineHeight: scaled(36),
    fontWeight: '800',
    color: tokens.text,
    textAlign: 'center',
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 20) + 24,
          paddingHorizontal: 20,
          paddingBottom: Math.max(insets.bottom, 20) + 28,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', gap: 14 }}>
          <IconBrand size={72} color={tokens.text} fill={tokens.accent} />
          <View style={{ gap: 8, alignItems: 'center' }}>
            <Text style={heroTitleStyle}>Unlock Rope Access Logbook</Text>
            <Text style={{ ...type.body, color: tokens.textDim, textAlign: 'center', maxWidth: 340 }}>
              Keep your signed logbook, backups, exports, remote signing, and gear records under one store subscription.
            </Text>
          </View>
        </View>

        <Card padding={14}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: tokens.accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconVerified size={22} color={tokens.accent} fill={tokens.accent} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>SUBSCRIPTION</Text>
              <Text style={{ ...type.cardTitle, color: tokens.text }}>
                {statusCopy(subscription.status, expires)}
              </Text>
              {subscription.error ? (
                <Text style={{ ...type.cardSub, color: tokens.danger }}>{subscription.error}</Text>
              ) : null}
            </View>
          </View>
        </Card>

        <View style={{ gap: 8 }}>
          {subscription.packages.length > 0 ? (
            subscription.packages.map((pkg) => (
              <PlanCard
                key={pkg.identifier}
                pkg={pkg}
                trial={trialFor(pkg)}
                selected={pkg.identifier === selectedPackage?.identifier}
                onPress={() => {
                  setSelectedId(pkg.identifier);
                  haptics.selection();
                }}
              />
            ))
          ) : (
            <Card padding={14}>
              <Text style={{ ...type.cardTitle, color: tokens.text }}>Plans are temporarily unavailable</Text>
              <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 4 }}>
                The store did not return a purchasable subscription plan for this device. Retry, then restore
                purchases if you already subscribed.
              </Text>
              {subscription.planIssue ? (
                <Text style={{ ...type.cardSub, color: tokens.danger, marginTop: 8 }}>
                  {subscription.planIssue}
                </Text>
              ) : null}
              <View style={{ marginTop: 12 }}>
                <Button variant="outline" full disabled={subscription.busy !== 'none'} onPress={onRetry}>
                  Retry
                </Button>
              </View>
            </Card>
          )}
        </View>

        <View style={{ gap: 10 }}>
          <Button
            full
            size="lg"
            icon={IconLock}
            disabled={actionBusy || (!selectedPackage && subscription.busy !== 'none')}
            onPress={onPurchase}
          >
            {subscription.busy === 'purchase' ? 'Opening store...' : primaryLabel}
          </Button>
          <Button
            full
            variant="outline"
            icon={IconCloudBackup}
            disabled={actionBusy}
            onPress={onRestore}
          >
            {subscription.busy === 'restore' ? 'Restoring...' : 'Restore purchases'}
          </Button>
          {subscription.status === 'error' || subscription.status === 'needs_connection' ? (
            <Button
              full
              variant="ghost"
              disabled={subscription.busy !== 'none'}
              onPress={onRetry}
            >
              Retry verification
            </Button>
          ) : null}
        </View>

        <Text style={{ ...type.cardSub, color: tokens.textFaint, textAlign: 'center', lineHeight: scaled(18) }}>
          {renewalLine(selectedPackage)} You can cancel from your store subscription settings.
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 14 }}>
          <Pressable
            accessibilityRole="link"
            onPress={() => {
              void onOpenLegal('privacy');
            }}
          >
            <Text style={{ ...type.cardSub, color: tokens.accent }}>Privacy Policy</Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={() => {
              void onOpenLegal('terms');
            }}
          >
            <Text style={{ ...type.cardSub, color: tokens.accent }}>Terms of Use (EULA)</Text>
          </Pressable>
        </View>

        <View style={{ marginTop: 8, gap: 10 }}>
          <Button full variant="ghost" disabled={actionBusy} onPress={onSignOut}>
            {accountBusy === 'sign_out' ? 'Signing out...' : 'Sign out'}
          </Button>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete account"
            disabled={actionBusy}
            onPress={onDeleteAccount}
            style={{ alignSelf: 'center', paddingVertical: 4, paddingHorizontal: 12 }}
          >
            <Text style={{ ...type.cardSub, color: tokens.danger }}>
              {accountBusy === 'delete' ? 'Deleting account...' : 'Delete account'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
      <SubscriptionLegalSheet
        kind={legalSheet}
        visible={legalSheet !== null}
        onClose={() => setLegalSheet(null)}
      />
    </View>
  );
}
