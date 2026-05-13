import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControlProps,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/theme-provider';
import { WatermarkSeal } from './watermark-seal';
import { WeaveBackdrop } from './weave-backdrop';

interface ScreenProps {
  background?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  padded?: boolean;
  preserveChildTouches?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  safeTop?: boolean;
  scrollEnabled?: boolean;
  /**
   * Enable the M.6 security weave backdrop and the stationary watermark seal
   * underneath it. Off by default — opt in on signing-sensitive screens so
   * the two motifs together read as "this surface is sealed."
   */
  weave?: boolean;
}

export function Screen({
  background,
  children,
  footer,
  padded = true,
  preserveChildTouches = false,
  refreshControl,
  safeTop = false,
  scrollEnabled = true,
  weave = false,
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
      {weave ? (
        <>
          <WatermarkSeal />
          <WeaveBackdrop />
        </>
      ) : null}
      {background ? (
        <View pointerEvents="none" style={{ ...StyleSheet.absoluteFillObject }}>
          {background}
        </View>
      ) : null}
      <ScrollView
        automaticallyAdjustKeyboardInsets
        canCancelContentTouches={!childTouchIsCapturing}
        contentInsetAdjustmentBehavior="automatic"
        disableScrollViewPanResponder={childTouchIsCapturing}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
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
            paddingBottom: spacing.base + insets.bottom,
          }}
        >
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
