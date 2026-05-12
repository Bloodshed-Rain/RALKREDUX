import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/theme-provider';

export type StampTone = 'green' | 'yellow' | 'red' | 'ink' | 'mute';
export type StampRotation = 'light' | 'standard' | 'heavy' | 'forward';

interface StampProps {
  tone?: StampTone;
  rotation?: StampRotation | number;
  big?: boolean;
  children: string;
}

export function Stamp({ tone = 'green', rotation = 'standard', big, children }: StampProps) {
  const { stamp, typography, spacing } = useTheme();
  const tintColor = stamp.tones[tone];
  const rotateDeg = typeof rotation === 'number' ? rotation : stamp.rotation[rotation];

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderWidth: stamp.borderWidth,
        borderColor: tintColor,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        opacity: stamp.opacity,
        transform: [{ rotate: `${rotateDeg}deg` }],
      }}
    >
      <Text
        style={{
          ...typography.italicStamp,
          color: tintColor,
          fontSize: big ? 30 : typography.italicStamp.fontSize,
          lineHeight: big ? 32 : typography.italicStamp.lineHeight,
        }}
      >
        {children.toUpperCase()}
      </Text>
    </View>
  );
}
