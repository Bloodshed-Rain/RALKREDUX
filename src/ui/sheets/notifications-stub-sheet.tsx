import React from 'react';
import { Text, View, type TextStyle } from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import { InfoSheet } from '@/src/ui/primitives/v2';

interface NotificationsStubSheetProps {
  visible: boolean;
  onClose: () => void;
}

// Shared in-development notice surfaced from both the Today bell and the
// More tab's Notifications row. Replace this with a real prefs screen + push
// integration when the notifications system lands.
export function NotificationsStubSheet({ visible, onClose }: NotificationsStubSheetProps) {
  const { tokens } = useTheme();
  const bodyStyle: TextStyle = {
    ...type.cardSub,
    color: tokens.textDim,
    lineHeight: 20,
  };
  const bulletStyle: TextStyle = {
    ...type.cardSub,
    color: tokens.text,
    lineHeight: 20,
  };
  return (
    <InfoSheet visible={visible} onClose={onClose} kicker="IN DEVELOPMENT" title="Notifications">
      <Text style={bodyStyle}>
        Push and in-app notifications aren't wired yet. When this lands you'll be alerted on:
      </Text>
      <View style={{ gap: 6, paddingLeft: 4 }}>
        <Text style={bulletStyle}>· Gear inspections coming due or overdue</Text>
        <Text style={bulletStyle}>· Remote signature requests completed or expired</Text>
        <Text style={bulletStyle}>· Backup / sync events that need your attention</Text>
      </View>
      <Text style={{ ...type.cardSub, color: tokens.textFaint, fontStyle: 'italic' }}>
        Notification permission, scheduling, and a delivery log are in scope. No data is sent
        to any server until you opt in.
      </Text>
    </InfoSheet>
  );
}
