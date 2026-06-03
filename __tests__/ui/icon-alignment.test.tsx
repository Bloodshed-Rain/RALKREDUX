import React from 'react';
import renderer, { type ReactTestRenderer } from 'react-test-renderer';
import { StyleSheet } from 'react-native';

import { Button } from '@/src/ui/primitives/v2/button';
import { IconBtn } from '@/src/ui/primitives/v2/icon-btn';
import { SyncChip } from '@/src/ui/primitives/v2/sync-chip';
import { Pill } from '@/src/ui/primitives/v2/pill';
import { IconPlus } from '@/src/ui/icons';
import { scaled, scaledIcon } from '@/src/ui/scale';

// Mock react-native-svg so every CustomIcon renders a flat <SvgXml> host node
// whose parent is the wrapper box we want to assert on (mirrors icons.test.tsx).
jest.mock('react-native-svg', () => {
  const React = require('react');
  return {
    Svg: jest.fn((props) => React.createElement('Svg', props, props.children)),
    SvgXml: jest.fn((props) => React.createElement('SvgXml', props)),
    G: jest.fn((props) => React.createElement('G', props, props.children)),
    Path: jest.fn((props) => React.createElement('Path', props, props.children)),
    Rect: jest.fn((props) => React.createElement('Rect', props, props.children)),
    Circle: jest.fn((props) => React.createElement('Circle', props, props.children)),
  };
});

jest.mock('@/src/ui/theme/theme-provider', () => ({
  useTheme: () => ({
    theme: { key: 'tungsten', mode: 'light' },
    tokens: {
      text: '#111', textDim: '#555', accent: '#f80', accentInk: '#fff', accentSoft: '#fe8',
      ok: '#0a0', okSoft: '#cfc', warn: '#a80', warnSoft: '#fec', danger: '#a00', dangerSoft: '#fcc',
      surface2: '#222', line: '#333', bg: '#000', chip: '#222', chipText: '#ddd',
    },
    setTheme: jest.fn(),
  }),
}));

jest.mock('@/src/ui/animation/use-reduced-motion', () => ({
  useReducedMotion: () => false,
}));

// Find the nearest host <View> ancestor of the rendered icon and flatten its
// style. (`.parent` returns composites too — IconPlus -> CustomIcon -> SvgXml —
// so walk up past them to the first host View, which is the wrapper box.)
function iconWrapperStyle(tree: ReactTestRenderer) {
  const svg = tree.root.findAll((n) => n.type === 'SvgXml')[0];
  let p: typeof svg.parent | null = svg.parent;
  while (p && p.type !== 'View') p = p.parent;
  if (!p) throw new Error('no View wrapper found above the icon');
  return (StyleSheet.flatten(p.props.style) ?? {}) as Record<string, unknown>;
}

function render(node: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  renderer.act(() => {
    tree = renderer.create(node);
  });
  return tree;
}

describe('icon wrapper boxes match the rendered (scaledIcon) size and center the glyph', () => {
  it('Button: wrapper box equals scaledIcon(iconSize), centered', () => {
    const style = iconWrapperStyle(render(<Button icon={IconPlus}>Save</Button>)); // md
    const expected = scaledIcon(scaled(16)); // md iconSize = scaled(16)
    expect(style.width).toBe(expected);
    expect(style.height).toBe(expected);
    expect(style.alignItems).toBe('center');
    expect(style.justifyContent).toBe('center');
  });

  it('IconBtn: wrapper box equals scaledIcon(icon), centered', () => {
    const style = iconWrapperStyle(render(<IconBtn icon={IconPlus} label="Add" />)); // md
    const expected = scaledIcon(scaled(20)); // md icon = scaled(20)
    expect(style.width).toBe(expected);
    expect(style.height).toBe(expected);
    expect(style.alignItems).toBe('center');
    expect(style.justifyContent).toBe('center');
  });

  it('SyncChip: spin box equals scaledIcon(14) so the pivot is the glyph center', () => {
    const style = iconWrapperStyle(render(<SyncChip state="synced" />));
    const expected = scaledIcon(14);
    expect(style.width).toBe(expected);
    expect(style.height).toBe(expected);
    expect(style.alignItems).toBe('center');
    expect(style.justifyContent).toBe('center');
  });

  it('Pill: icon is wrapped in a line-height-bounded centered box', () => {
    const style = iconWrapperStyle(render(<Pill tone="ok" icon={IconPlus}>Signed</Pill>)); // sm
    expect(style.height).toBe(scaled(14)); // sm lineHeight
    expect(style.alignItems).toBe('center');
    expect(style.justifyContent).toBe('center');
  });
});
