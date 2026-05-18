import React from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { scaled } from '@/src/ui/scale';
import type { IconProps } from '@/src/ui/icons';

export type IconBtnSize = 'sm' | 'md' | 'lg';

export interface IconBtnProps {
  icon: React.ComponentType<IconProps>;
  label: string;
  onPress?: () => void;
  size?: IconBtnSize;
  tone?: 'text' | 'accent' | 'ok' | 'warn' | 'danger' | 'textDim';
  disabled?: boolean;
  style?: ViewStyle;
}

// Box, icon and radius track UI_SCALE. The hitSlop fallback below still
// guarantees ≥44px touch target on every size — sm boxes grow to ~33px
// visual but always 44px tappable.
const SIZES: Record<IconBtnSize, { box: number; icon: number; radius: number }> = {
  sm: { box: scaled(28), icon: scaled(16), radius: scaled(8) },
  md: { box: scaled(36), icon: scaled(20), radius: scaled(10) },
  lg: { box: scaled(44), icon: scaled(24), radius: scaled(12) },
};

export function IconBtn({
  icon: Icon,
  label,
  onPress,
  size = 'md',
  tone = 'text',
  disabled,
  style,
}: IconBtnProps) {
  const { tokens } = useTheme();
  const spec = SIZES[size];
  const color =
    tone === 'accent'
      ? tokens.accent
      : tone === 'ok'
        ? tokens.ok
        : tone === 'warn'
          ? tokens.warn
          : tone === 'danger'
            ? tokens.danger
            : tone === 'textDim'
              ? tokens.textDim
              : tokens.text;

  // Expand the touch target to at least 44px without enlarging the visual chrome.
  // Gloved-finger users hit the visual icon centroid; the hitSlop catches near-misses.
  const slop = Math.max(0, Math.round((44 - spec.box) / 2));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={slop > 0 ? slop : undefined}
      style={({ pressed }) => [
        {
          width: spec.box,
          height: spec.box,
          borderRadius: spec.radius,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed && !disabled ? tokens.surface2 : 'transparent',
          opacity: disabled ? 0.45 : 1,
        },
        // Keep `transform` out of the base object so the key is absent when
        // not pressed. Under Fabric, `transform: undefined` can serialize to
        // `null` and trip `_validateTransforms` with "Cannot read property
        // 'forEach' of null". Spread-conditional avoids the failure mode.
        pressed && !disabled ? { transform: [{ scale: 0.94 }] } : null,
        style,
      ]}
    >
      <View style={{ width: spec.icon, height: spec.icon }}>
        <Icon size={spec.icon} color={color} />
      </View>
    </Pressable>
  );
}
