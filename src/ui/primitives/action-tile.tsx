import React from 'react';
import { Pressable, Text, View, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../theme/theme-provider';

interface ActionTileProps {
  title: string;
  value?: string;
  icon: LucideIcon;
  onPress: () => void;
  tone?: 'default' | 'accent' | 'warn';
  style?: ViewStyle;
}

export function ActionTile({
  title,
  value,
  icon: Icon,
  onPress,
  tone = 'default',
  style,
}: ActionTileProps) {
  const { colors, radii, spacing, typography } = useTheme();
  const isAccent = tone === 'accent';
  const isWarn = tone === 'warn';
  const color = isAccent ? colors.accentPrimary : isWarn ? colors.statusWarn : colors.textSecondary;
  const backgroundColor = isAccent ? colors.accentTint : isWarn ? colors.statusWarnTint : colors.bgSurface;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 96,
        minWidth: 132,
        borderRadius: radii.sm,
        borderWidth: 1,
        borderColor: isAccent ? colors.accentPrimary : colors.border,
        backgroundColor,
        opacity: pressed ? 0.82 : 1,
        padding: spacing.md,
        justifyContent: 'space-between',
        ...style,
      })}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: radii.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bgSurface,
        }}
      >
        <Icon size={19} color={color} strokeWidth={2.2} />
      </View>
      <View style={{ gap: spacing.xs }}>
        {value ? (
          <Text selectable style={{ ...typography.title3, color: colors.textPrimary, fontVariant: ['tabular-nums'] }}>
            {value}
          </Text>
        ) : null}
        <Text selectable={false} style={{ ...typography.label, color: colors.textPrimary }}>
          {title}
        </Text>
      </View>
    </Pressable>
  );
}
