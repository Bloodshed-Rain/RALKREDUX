import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/theme-provider';

const ScreenScrollLockContext = React.createContext((_locked: boolean) => {});

interface ScreenProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  padded?: boolean;
  safeTop?: boolean;
}

export function useScreenScrollLock() {
  return React.use(ScreenScrollLockContext);
}

export function Screen({ children, footer, padded = true, safeTop = false }: ScreenProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const [scrollLockCount, setScrollLockCount] = React.useState(0);
  const setScrollLocked = React.useCallback((locked: boolean) => {
    setScrollLockCount((count) => Math.max(0, count + (locked ? 1 : -1)));
  }, []);
  const scrollLocked = scrollLockCount > 0;

  return (
    <ScreenScrollLockContext.Provider value={setScrollLocked}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={footer ? 72 : 0}
        style={{ flex: 1, backgroundColor: colors.bgApp }}
      >
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentInsetAdjustmentBehavior="automatic"
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!scrollLocked}
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
    </ScreenScrollLockContext.Provider>
  );
}
