import React from 'react';
import { View, Text, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { scaled } from '@/src/ui/scale';
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

// Text + icon dimensions track UI_SCALE. Padding kept verbatim so the pill
// reads as "more readable" rather than "blockier".
const SIZE_SPEC: Record<
  PillSize,
  { paddingV: number; paddingH: number; fontSize: number; lineHeight: number; iconSize: number }
> = {
  sm: { paddingV: 3, paddingH: 8, fontSize: scaled(11), lineHeight: scaled(14), iconSize: scaled(12) },
  md: { paddingV: 5, paddingH: 10, fontSize: scaled(12), lineHeight: scaled(16), iconSize: scaled(14) },
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
  const isForge = theme.key === 'forge';

  // On Heliotype, accent and danger collapse to the same oxblood. Distinguish them
  // by SHAPE rather than color: danger swaps to an outlined ink-on-bone treatment
  // (canvas-fill + oxblood text + 1.5px oxblood ring) while accent stays filled.
  const heliotypeDangerOutline = isHeliotype && tone === 'danger';

  // Forge keeps a bright ember accent, which fails contrast as text on its pale
  // accentSoft. Render the accent tone as a FILLED ember chip (ember fill + dark
  // accentInk) so emphasis pills stay legible and on-brand on Forge only.
  const forgeAccentFill = isForge && tone === 'accent';
  const effectiveBg = forgeAccentFill ? tokens.accent : heliotypeDangerOutline ? tokens.bg : bg;
  const contentColor = forgeAccentFill ? tokens.accentInk : fg;

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spec.paddingV,
    paddingHorizontal: spec.paddingH,
    borderRadius: 999,
    backgroundColor: effectiveBg,
    alignSelf: 'flex-start',
    borderWidth: isHeliotype ? 1.5 : 0,
    borderColor: isHeliotype ? fg : 'transparent',
  };

  const textStyle: TextStyle = {
    fontFamily: 'Manrope_600SemiBold',
    fontWeight: '600',
    fontSize: spec.fontSize,
    lineHeight: spec.lineHeight,
    color: contentColor,
    letterSpacing: 0.05,
  };

  return (
    <View style={containerStyle}>
      {Icon ? (
        // Bound the icon to the text line-height and center it, so the larger
        // (scaledIcon) glyph doesn't push the pill's row height or sit off the
        // text baseline.
        <View style={{ height: spec.lineHeight, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={spec.iconSize} color={contentColor} fill={contentColor} fillOpacity={0.28} />
        </View>
      ) : null}
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
