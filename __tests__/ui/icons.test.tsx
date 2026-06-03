import React from 'react';
import renderer from 'react-test-renderer';
import { SvgXml } from 'react-native-svg';

import { IconPlus } from '@/src/ui/icons';
import plusXml from '@/src/ui/icons/custom/plus';
import { scaledIcon } from '@/src/ui/scale';

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
    tokens: { text: '#111111', accent: '#ff8800' },
    theme: { mode: 'light' },
    setTheme: jest.fn(),
  }),
}));

describe('custom icons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores generated custom SVGs as currentColor-only assets', () => {
    expect(plusXml).toContain('fill="currentColor"');
    expect(plusXml).not.toMatch(/fill="(?:#|white|url\()/i);
  });

  it('passes the icon color through to SvgXml and applies the global ICON_SCALE', () => {
    renderer.act(() => {
      renderer.create(<IconPlus size={31} color="#123456" />);
    });

    expect(SvgXml).toHaveBeenCalledWith(
      expect.objectContaining({
        xml: plusXml,
        // size is multiplied by the global ICON_SCALE inside CustomIcon.
        width: scaledIcon(31),
        height: scaledIcon(31),
        color: '#123456',
      }),
      undefined,
    );
  });
});
