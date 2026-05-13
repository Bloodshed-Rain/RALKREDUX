import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, Path, Text as SvgText, TextPath } from 'react-native-svg';
import { useTheme } from '../theme/theme-provider';

interface WatermarkSealProps {
  size?: number;
  opacity?: number;
}

/**
 * Watermark seal — ported from `design_handoff_ralkredux/brand/brand.jsx`.
 * Concentric circles + circular perimeter text + RALB monogram + EST. ANNO IV
 * cartouche + N/E/S/W tick marks at opacity 0.18. Stationary; meant to sit
 * beneath the drifting `WeaveBackdrop` so the layered reading is "fabric
 * moves, seal holds."
 */
export function WatermarkSeal({ size = 280, opacity = 0.18 }: WatermarkSealProps) {
  const { tidewater } = useTheme();
  const ink = tidewater.ink;

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}
    >
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <G opacity={opacity}>
          <Circle cx={100} cy={100} r={90} fill="none" stroke={ink} strokeWidth={1.5} />
          <Circle cx={100} cy={100} r={80} fill="none" stroke={ink} strokeWidth={0.8} />
          <Circle cx={100} cy={100} r={62} fill="none" stroke={ink} strokeWidth={0.5} />
          <Defs>
            <Path id="seal-arc" d="M 100 100 m -78 0 a 78 78 0 1 1 156 0 a 78 78 0 1 1 -156 0" />
          </Defs>
          <SvgText fontFamily="IBMPlexMono_500Medium" fontSize={9} fill={ink} letterSpacing={5}>
            <TextPath href="#seal-arc">
              ROPE ACCESS LOGBOOK · FORM 27-A · ROPE ACCESS LOGBOOK · FORM 27-A ·{' '}
            </TextPath>
          </SvgText>
          <SvgText
            x={100}
            y={110}
            textAnchor="middle"
            fontFamily="Archivo_900Black"
            fontSize={32}
            fill={ink}
            letterSpacing={2}
          >
            RALB
          </SvgText>
          <Line x1={55} y1={118} x2={145} y2={118} stroke={ink} strokeWidth={1} />
          <SvgText
            x={100}
            y={130}
            textAnchor="middle"
            fontFamily="IBMPlexMono_500Medium"
            fontSize={7}
            fill={ink}
            letterSpacing={2}
          >
            EST. ANNO IV
          </SvgText>
          {[0, 90, 180, 270].map((deg) => (
            <Line
              key={deg}
              x1={100}
              y1={2}
              x2={100}
              y2={12}
              stroke={ink}
              strokeWidth={1.5}
              transform={`rotate(${deg} 100 100)`}
            />
          ))}
        </G>
      </Svg>
    </View>
  );
}
