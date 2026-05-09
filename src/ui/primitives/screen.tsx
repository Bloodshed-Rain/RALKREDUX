import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/theme-provider';

interface ScreenProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  padded?: boolean;
  preserveChildTouches?: boolean;
  safeTop?: boolean;
  scrollEnabled?: boolean;
}

export function Screen({
  children,
  footer,
  padded = true,
  preserveChildTouches = false,
  safeTop = false,
  scrollEnabled = true,
}: ScreenProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const childTouchIsCapturing = preserveChildTouches && !scrollEnabled;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={footer ? 72 : 0}
      style={{ flex: 1, backgroundColor: colors.bgApp }}
    >
      <ScrollView
        automaticallyAdjustKeyboardInsets
        canCancelContentTouches={!childTouchIsCapturing}
        contentInsetAdjustmentBehavior="automatic"
        disableScrollViewPanResponder={childTouchIsCapturing}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        scrollEnabled={scrollEnabled}
        contentContainerStyle={{
          paddingHorizontal: padded ? spacing.base : 0,
          paddingTop: spacing.base + (safeTop ? insets.top : 0),
          paddingBottom: footer ? spacing.xxl + spacing.xl : spacing.base,
          gap: spacing.base,
        }}
      >
        {children}
      </ScrollView>
      {footer ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.bgSurface,
            paddingHorizontal: spacing.base,
            paddingTop: spacing.sm,
            paddingBottom: spacing.base,
          }}
        >
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
