import React from 'react';
import { Pressable, Text, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { PulleySpinner } from './pulley-spinner';
import { useTheme } from '../theme/theme-provider';

interface DocActionButtonProps {
  title: string;
  onPress: () => void;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

/**
 * Tidewater action button used in screen footers and inline action rows.
 * When `loading`, displays the M.2 pulley sheave spinner instead of the icon.
 */
export function DocActionButton({
  title,
  onPress,
  icon: Icon,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: DocActionButtonProps) {
  const { spacing, typography, touchTarget, tidewater } = useTheme();
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';
  const foreground = disabled ? tidewater.ink3 : isPrimary ? tidewater.paper : tidewater.ink;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: isPrimary ? touchTarget.preferred + 4 : touchTarget.preferred,
        borderWidth: isGhost ? 0 : 1.5,
        borderColor: tidewater.ink,
        paddingHorizontal: spacing.base,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: spacing.sm,
        backgroundColor: disabled
          ? tidewater.paper2
          : isPrimary
            ? pressed
              ? tidewater.ink2
              : tidewater.accent
            : isGhost
              ? 'transparent'
              : tidewater.white,
        opacity: disabled ? 0.82 : 1,
        ...style,
      })}
    >
      {loading ? (
        <PulleySpinner size={20} color={foreground} />
      ) : Icon ? (
        <Icon size={18} color={foreground} strokeWidth={2.2} />
      ) : null}
      <Text
        selectable={false}
        style={{ ...typography.displaySm, color: foreground, letterSpacing: 1.5 }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
