import React from 'react';
import { View, Text, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';
import type { IconProps } from '@/src/ui/icons';
import {
  IconDraft,
  IconVerified,
  IconVoid,
  IconPending,
} from '@/src/ui/icons';

export type PillTone = 'chip' | 'accent' | 'ok' | 'warn' | 'danger';
export type PillSize = 'sm' | 'md';

export interface PillProps {
  tone?: PillTone;
  size?: PillSize;
  icon?: React.ComponentType<IconProps>;
  children: React.ReactNode;
}

const SIZE_SPEC: Record<
  PillSize,
  { paddingV: number; paddingH: number; fontSize: number; lineHeight: number; iconSize: number }
> = {
  sm: { paddingV: 3, paddingH: 8, fontSize: 11, lineHeight: 14, iconSize: 12 },
  md: { paddingV: 5, paddingH: 10, fontSize: 12, lineHeight: 16, iconSize: 14 },
};

function toneColors(tone: PillTone, tokens: ReturnType<typeof useTheme>['tokens']) {
  switch (tone) {
    case 'accent':
      return { bg: tokens.accentSoft, fg: tokens.accent };
    case 'ok':
      return { bg: tokens.okSoft, fg: tokens.ok };
    case 'warn':
      return { bg: tokens.warnSoft, fg: tokens.warn };
    case 'danger':
      return { bg: tokens.dangerSoft, fg: tokens.danger };
    case 'chip':
    default:
      return { bg: tokens.chip, fg: tokens.chipText };
  }
}

export function Pill({ tone = 'chip', size = 'sm', icon: Icon, children }: PillProps) {
  const { theme, tokens } = useTheme();
  const spec = SIZE_SPEC[size];
  const { bg, fg } = toneColors(tone, tokens);
  const isHeliotype = theme.key === 'heliotype';

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spec.paddingV,
    paddingHorizontal: spec.paddingH,
    borderRadius: 999,
    backgroundColor: bg,
    alignSelf: 'flex-start',
    borderWidth: isHeliotype ? 1.5 : 0,
    borderColor: isHeliotype ? fg : 'transparent',
  };

  const textStyle: TextStyle = {
    fontFamily: 'Manrope_600SemiBold',
    fontWeight: '600',
    fontSize: spec.fontSize,
    lineHeight: spec.lineHeight,
    color: fg,
    letterSpacing: 0.05,
  };

  return (
    <View style={containerStyle}>
      {Icon ? <Icon size={spec.iconSize} color={fg} fill={fg} fillOpacity={0.28} /> : null}
      <Text selectable={false} style={textStyle}>
        {children}
      </Text>
    </View>
  );
}

// StatusPill: convenience wrapper mapping the entry-status enum onto Pill.
export type EntryStatusKey = 'draft' | 'signed' | 'amended' | 'pending' | 'void';

const STATUS_CONFIG: Record<
  EntryStatusKey,
  { label: string; tone: PillTone; icon: React.ComponentType<IconProps> }
> = {
  draft: { label: 'Draft', tone: 'warn', icon: IconDraft },
  signed: { label: 'Signed', tone: 'ok', icon: IconVerified },
  amended: { label: 'Amended', tone: 'danger', icon: IconVoid },
  pending: { label: 'Pending', tone: 'warn', icon: IconPending },
  void: { label: 'Void', tone: 'danger', icon: IconVoid },
};

export interface StatusPillProps {
  status: EntryStatusKey;
  size?: PillSize;
}

export function StatusPill({ status, size = 'sm' }: StatusPillProps) {
  const cfg = STATUS_CONFIG[status];
  return (
    <Pill tone={cfg.tone} size={size} icon={cfg.icon}>
      {cfg.label}
    </Pill>
  );
}
