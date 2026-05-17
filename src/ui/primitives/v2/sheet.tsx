import React from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  Text,
  View,
  useWindowDimensions,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { IconClose } from '@/src/ui/icons';
import { IconBtn } from './icon-btn';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
  heightPercent?: number; // 0..1; defaults to 0.92 (the handoff's 92% max)
}

export function Sheet({
  open,
  onClose,
  title,
  trailing,
  children,
  heightPercent = 0.92,
}: SheetProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const sheetHeight = Math.round(screenHeight * heightPercent);

  const translateY = React.useRef(new Animated.Value(sheetHeight)).current;
  const scrimOpacity = React.useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = React.useState(open);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 280,
          easing: Easing.bezier(0.2, 0.7, 0.3, 1.1),
          useNativeDriver: true,
        }),
        Animated.timing(scrimOpacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: sheetHeight,
          duration: 240,
          easing: Easing.bezier(0.4, 0, 0.6, 1),
          useNativeDriver: true,
        }),
        Animated.timing(scrimOpacity, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [open, mounted, sheetHeight, translateY, scrimOpacity]);

  if (!mounted) return null;

  const sheetStyle: ViewStyle = {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: sheetHeight,
    backgroundColor: tokens.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    transform: [{ translateY }] as unknown as ViewStyle['transform'],
  };

  const grabStyle: ViewStyle = {
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: tokens.line,
    alignSelf: 'center',
    marginTop: 8,
  };

  const headStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 6,
    gap: 12,
  };

  const titleStyle: TextStyle = {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.36,
    color: tokens.text,
    flex: 1,
  };

  return (
    <Modal transparent animationType="none" visible={mounted} onRequestClose={onClose}>
      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: tokens.scrim,
          opacity: scrimOpacity,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={onClose}
          style={{ flex: 1 }}
        />
      </Animated.View>
      <Animated.View style={sheetStyle}>
        <View style={grabStyle} />
        {title ? (
          <View style={headStyle}>
            <Text style={titleStyle} numberOfLines={1}>
              {title}
            </Text>
            {trailing ?? (
              <IconBtn icon={IconClose} label="Close" onPress={onClose} size="md" />
            )}
          </View>
        ) : null}
        <View style={{ flex: 1, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 12) + 12 }}>
          {children}
        </View>
      </Animated.View>
    </Modal>
  );
}
