import React from 'react';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../theme/theme-provider';

interface MarkPlateProps {
  size?: number;
  /** Override the plate fill color. Default tidewater.ink. */
  color?: string;
  /** Override the plate background (visible behind the rounded plate body). */
  bg?: string;
}

/**
 * D5 PLATE — industrial nameplate with reversed RALB and full-name caption.
 * Mirrors `MarkPlate` from the brand handoff (viewBox 0 0 56 42).
 */
export function MarkPlate({ size = 56, color, bg = 'transparent' }: MarkPlateProps) {
  const { tidewater } = useTheme();
  const ink = color ?? tidewater.ink;
  const paper = tidewater.paper;
  const height = Math.round(size * 0.75);

  return (
    <Svg width={size} height={height} viewBox="0 0 56 42">
      {bg !== 'transparent' ? <Rect x={0} y={0} width={56} height={42} fill={bg} /> : null}
      <Rect x={2} y={2} width={52} height={38} fill={ink} />
      <Rect
        x={4}
        y={4}
        width={48}
        height={34}
        fill="none"
        stroke={paper}
        strokeWidth={0.5}
        opacity={0.45}
      />
      {/* Corner rivets */}
      <Circle cx={6} cy={6} r={1.2} fill={paper} opacity={0.5} />
      <Circle cx={50} cy={6} r={1.2} fill={paper} opacity={0.5} />
      <Circle cx={6} cy={36} r={1.2} fill={paper} opacity={0.5} />
      <Circle cx={50} cy={36} r={1.2} fill={paper} opacity={0.5} />
      {/* Reversed RALB monogram */}
      <SvgText
        x={28}
        y={22}
        textAnchor="middle"
        fontFamily="Archivo_900Black"
        fontWeight="900"
        fontSize={13}
        fill={paper}
        letterSpacing={2}
      >
        RALB
      </SvgText>
      {/* Divider */}
      <Line x1={10} y1={26} x2={46} y2={26} stroke={paper} strokeWidth={0.5} opacity={0.5} />
      {/* Caption */}
      <SvgText
        x={28}
        y={33}
        textAnchor="middle"
        fontFamily="IBMPlexMono_400Regular"
        fontSize={3.2}
        fill={paper}
        opacity={0.9}
        letterSpacing={0.2}
      >
        ROPE ACCESS LOGBOOK
      </SvgText>
    </Svg>
  );
}
