import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { IconClose } from '@/src/ui/icons';
import { IconBtn } from './icon-btn';
import { type } from '@/src/ui/theme/type';

interface InfoSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  kicker?: string;
  children: React.ReactNode;
}

// Bottom-anchored modal sheet used for About / in-development notices /
// inline info screens. Tap the backdrop or the close icon to dismiss.
export function InfoSheet({ visible, onClose, title, kicker, children }: InfoSheetProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const backdropStyle: ViewStyle = {
    flex: 1,
    backgroundColor: tokens.scrim,
    justifyContent: 'flex-end',
  };

  const sheetStyle: ViewStyle = {
    backgroundColor: tokens.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: tokens.lineSoft,
    paddingBottom: Math.max(insets.bottom, 16),
    maxHeight: '85%',
  };

  const handleStyle: ViewStyle = {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.lineSoft,
    marginTop: 10,
    marginBottom: 6,
  };

  const headerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 8,
    gap: 12,
  };

  const titleStyle: TextStyle = {
    fontFamily: 'Manrope_700Bold',
    fontWeight: '700',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.6,
    color: tokens.text,
  };

  const kickerStyle: TextStyle = {
    ...type.monoKicker,
    color: tokens.textFaint,
    marginBottom: 2,
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={backdropStyle} onPress={onClose} accessibilityLabel="Close sheet">
        <Pressable
          // Inner pressable swallows backdrop taps so taps inside the sheet
          // don't close it. onPress is intentionally a no-op.
          onPress={() => undefined}
          style={sheetStyle}
        >
          <View style={handleStyle} />
          <View style={headerStyle}>
            <View style={{ flex: 1 }}>
              {kicker ? <Text style={kickerStyle}>{kicker}</Text> : null}
              <Text style={titleStyle}>{title}</Text>
            </View>
            <IconBtn icon={IconClose} label="Close" size="sm" onPress={onClose} />
          </View>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 18, gap: 12 }}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
