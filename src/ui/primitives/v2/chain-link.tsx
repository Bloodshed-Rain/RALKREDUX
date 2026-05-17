import React from 'react';
import { View, Text, type TextStyle, type ViewStyle } from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { HashGlyph } from './hash-glyph';
import { Pill } from './pill';

export interface ChainLinkItem {
  hash: string;
  label: string;
  // Marks this link as the entry currently being viewed; renders a "HEAD" pill.
  head?: boolean;
  // Dims the bullet (e.g. for an unsigned/pending link in the future).
  dim?: boolean;
}

export interface ChainLinkProps {
  links: ChainLinkItem[];
}

// Vertical chain-ladder visualization. Each link is a row: bullet on the rail,
// hash + label in the middle, HashGlyph on the right. The rail is a single
// continuous vertical line clipped to the inner edge of the bullets so the
// ladder reads as a single chain rather than a stack of disconnected cards.
export function ChainLink({ links }: ChainLinkProps) {
  const { tokens } = useTheme();

  if (links.length === 0) return null;

  const containerStyle: ViewStyle = {
    paddingVertical: 4,
    position: 'relative',
  };

  // The rail spans from the first bullet to the last bullet vertically. Each
  // link row is 56 px tall (14 + 28 + 14) by default; the rail sits at
  // x = bulletGutter + bulletSize/2 - railWidth/2.
  const BULLET_GUTTER = 7;
  const BULLET_SIZE = 14;
  const RAIL_WIDTH = 2;
  const railLeft = BULLET_GUTTER + BULLET_SIZE / 2 - RAIL_WIDTH / 2;

  return (
    <View style={containerStyle}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 28,
          bottom: 28,
          left: railLeft,
          width: RAIL_WIDTH,
          backgroundColor: tokens.line,
        }}
      />
      {links.map((link, i) => (
        <ChainLinkRow key={`${i}-${link.hash}`} link={link} />
      ))}
    </View>
  );
}

function ChainLinkRow({ link }: { link: ChainLinkItem }) {
  const { tokens } = useTheme();
  const short = link.hash.length > 14 ? `${link.hash.slice(0, 8)}…${link.hash.slice(-4)}` : link.hash;

  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  };

  const bulletStyle: ViewStyle = {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: link.dim ? tokens.surface3 : tokens.accent,
    marginHorizontal: 7,
    // Ring around bullet for raised feel.
    borderWidth: 4,
    borderColor: link.dim ? tokens.surface2 : tokens.accentSoft,
    zIndex: 1,
  };

  const hashStyle: TextStyle = {
    fontFamily: 'JetBrainsMono_500Medium',
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 16,
    color: tokens.text,
    letterSpacing: -0.12,
  };

  const labelStyle: TextStyle = {
    fontFamily: 'Manrope_500Medium',
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 16,
    color: tokens.textDim,
  };

  return (
    <View style={rowStyle}>
      <View style={bulletStyle} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={hashStyle} numberOfLines={1}>
            {short}
          </Text>
          {link.head ? <Pill tone="accent" size="sm">HEAD</Pill> : null}
        </View>
        <Text style={labelStyle} numberOfLines={1}>
          {link.label}
        </Text>
      </View>
      <HashGlyph hash={link.hash} size={20} />
    </View>
  );
}
