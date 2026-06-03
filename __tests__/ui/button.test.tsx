import React from 'react';
import renderer, { type ReactTestRenderer } from 'react-test-renderer';
import { StyleSheet } from 'react-native';

import { Button } from '@/src/ui/primitives/v2/button';

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
      text: '#111', accent: '#f80', accentInk: '#fff', surface2: '#222', line: '#333',
      danger: '#a00', bg: '#000',
    },
    setTheme: jest.fn(),
  }),
}));

function render(node: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  renderer.act(() => {
    tree = renderer.create(node);
  });
  return tree;
}

function containerStyle(tree: ReactTestRenderer) {
  const row = tree.root.find((n) => n.type === 'View' && n.props.accessibilityRole === 'button');
  return StyleSheet.flatten(row.props.style) as Record<string, unknown>;
}

describe('Button grow', () => {
  it('fills its share of the row when grow is set', () => {
    const style = containerStyle(render(<Button grow>Go</Button>));
    expect(style.flexGrow).toBe(1);
    expect(style.flexBasis).toBe(0);
  });

  it('hugs its content by default (no grow)', () => {
    const style = containerStyle(render(<Button>Go</Button>));
    expect(style.flexGrow).toBeUndefined();
    expect(style.alignSelf).toBe('flex-start');
  });
});
