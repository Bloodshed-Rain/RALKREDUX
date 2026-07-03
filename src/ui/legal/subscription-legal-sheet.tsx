import React from 'react';
import { Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import {
  PRIVACY_POLICY_URL,
  STORE_DISPLAY_NAME,
  TERMS_OF_USE_INTRO,
  TERMS_OF_USE_LINK_LABEL,
  TERMS_OF_USE_URL,
} from '@/src/domain/subscription/store-details';
import { Button } from '@/src/ui/primitives/v2';
import { type } from '@/src/ui/theme/type';
import { useTheme } from '@/src/ui/theme/theme-provider';

export type SubscriptionLegalSheetKind = 'privacy' | 'terms';

const SUPPORT_EMAIL_URL = 'mailto:chaddubuisson@gmail.com';

interface LegalSection {
  title: string;
  body: string[];
}

const privacySections: LegalSection[] = [
  {
    title: 'Data stored on your device',
    body: [
      'Rope Access Logbook stores your logbook entries, signatures, attached photos, gear records, and profile details locally on your device.',
      'This data stays on your device unless you sign in and use cloud backup, restore, or remote signing.',
    ],
  },
  {
    title: 'Account, backup, and remote signing',
    body: [
      'Sign-in, cloud backup, and remote signing use Supabase so your private backups and signing requests can be tied to your account.',
      'Remote-signing links show the entry being signed. Signing tokens are hashed before storage.',
    ],
  },
  {
    title: 'Subscriptions',
    body: [
      `Subscriptions are purchased through ${STORE_DISPLAY_NAME} and managed with RevenueCat, which receives the purchase information needed to unlock your subscription.`,
      "We do not receive your payment details, sell personal data, show ads, or track you across other companies' apps or websites.",
    ],
  },
  {
    title: 'Deletion and contact',
    body: [
      'Local data remains until you delete it or remove the app. Cloud backups remain until you delete them or delete your account from the Account screen.',
      'For privacy questions or data requests, contact chaddubuisson@gmail.com.',
    ],
  },
];

const termsSections: LegalSection[] = [
  {
    title: 'Terms of Use (EULA)',
    body: [
      TERMS_OF_USE_INTRO,
      'The app is licensed to you for personal professional recordkeeping. You are responsible for the accuracy of the records you create and export.',
    ],
  },
  {
    title: 'Auto-renewing subscription',
    body: [
      `The selected plan title, length, and price are shown before purchase. Payment and renewal are handled by ${STORE_DISPLAY_NAME}.`,
      'Subscriptions renew automatically until canceled. You can manage or cancel from your store subscription settings, and access remains active until the end of the paid period.',
    ],
  },
  {
    title: 'Professional use',
    body: [
      'Rope Access Logbook is an independent product and is not endorsed by, affiliated with, or officially accepted by SPRAT or IRATA.',
      'The app provides audit-ready records, exports, and tamper-evident signatures, but it does not replace your responsibility to meet employer, client, certification-body, or legal requirements.',
    ],
  },
];

function sectionsForKind(kind: SubscriptionLegalSheetKind | null): LegalSection[] {
  return kind === 'privacy' ? privacySections : termsSections;
}

function titleForKind(kind: SubscriptionLegalSheetKind | null): string {
  return kind === 'privacy' ? 'Privacy Policy' : 'Terms of Use (EULA)';
}

export function SubscriptionLegalSheet({
  kind,
  visible,
  onClose,
}: {
  kind: SubscriptionLegalSheetKind | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { tokens } = useTheme();
  const sections = sectionsForKind(kind);
  const termsUrl = kind === 'terms' ? TERMS_OF_USE_URL : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.34)',
        }}
      >
        <Pressable style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} />
        <View
          style={{
            maxHeight: '84%',
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            backgroundColor: tokens.surface,
            borderWidth: 1,
            borderColor: tokens.lineSoft,
            overflow: 'hidden',
          }}
        >
          <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
            <View style={{ gap: 6 }}>
              <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>LEGAL</Text>
              <Text style={{ ...type.screenTitle, color: tokens.text }}>{titleForKind(kind)}</Text>
            </View>
            {sections.map((section) => (
              <View key={section.title} style={{ gap: 8 }}>
                <Text style={{ ...type.cardTitle, color: tokens.text }}>{section.title}</Text>
                {section.body.map((paragraph) => (
                  <Text key={paragraph} selectable style={{ ...type.body, color: tokens.textDim, lineHeight: 22 }}>
                    {paragraph}
                  </Text>
                ))}
              </View>
            ))}
            {termsUrl ? (
              <Pressable
                accessibilityRole="link"
                onPress={() => {
                  void Linking.openURL(termsUrl);
                }}
              >
                <Text style={{ ...type.cardSub, color: tokens.accent }}>
                  {TERMS_OF_USE_LINK_LABEL}
                </Text>
              </Pressable>
            ) : kind === 'privacy' ? (
              <View style={{ gap: 10 }}>
                <Pressable
                  accessibilityRole="link"
                  onPress={() => {
                    void Linking.openURL(PRIVACY_POLICY_URL);
                  }}
                >
                  <Text style={{ ...type.cardSub, color: tokens.accent }}>
                    Open full Privacy Policy
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="link"
                  onPress={() => {
                    void Linking.openURL(SUPPORT_EMAIL_URL);
                  }}
                >
                  <Text style={{ ...type.cardSub, color: tokens.accent }}>
                    Contact privacy support
                  </Text>
                </Pressable>
              </View>
            ) : null}
            <Button full onPress={onClose}>
              Done
            </Button>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
