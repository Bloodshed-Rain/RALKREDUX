import React from 'react';
import renderer, { type ReactTestRenderer } from 'react-test-renderer';
import { StyleSheet } from 'react-native';

import { DateField } from '@/src/ui/primitives/v2/date-field';

const DANGER = '#a00';

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

// DatePickerSheet pulls heavy deps and isn't under test here.
jest.mock('@/src/ui/primitives/v2/date-picker-sheet', () => ({
  DatePickerSheet: () => null,
}));

jest.mock('@/src/ui/theme/theme-provider', () => ({
  useTheme: () => ({
    theme: { key: 'tungsten', mode: 'light' },
    tokens: {
      text: '#111', textDim: '#555', textFaint: '#999',
      surface: '#1a1a1a', line: '#333', lineSoft: '#222', danger: '#a00',
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

describe('DateField error state', () => {
  it('renders the error message in the danger color', () => {
    const tree = render(<DateField value={null} onChange={() => {}} error="Invalid range" />);
    const errorText = tree.root
      .findAll((n) => n.type === 'Text')
      .find((n) => n.props.children === 'Invalid range');
    expect(errorText).toBeTruthy();
    expect(StyleSheet.flatten(errorText!.props.style).color).toBe(DANGER);
  });

  it('paints the field row with a 1.5px danger border when errored', () => {
    const tree = render(<DateField value={null} onChange={() => {}} error="Invalid range" />);
    const row = tree.root.find(
      (n) => n.type === 'View' && n.props.accessibilityRole === 'button',
    );
    const style = StyleSheet.flatten(row.props.style) as Record<string, unknown>;
    expect(style.borderColor).toBe(DANGER);
    expect(style.borderWidth).toBe(1.5);
  });
});
