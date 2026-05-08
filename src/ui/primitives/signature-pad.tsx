import React from 'react';
import { PanResponder, Pressable, Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { useTheme } from '../theme/theme-provider';

interface Point {
  x: number;
  y: number;
}

interface SignaturePadProps {
  label: string;
  value: string;
  onChange: (path: string) => void;
  height?: number;
}

const SIGNATURE_VIEWBOX_WIDTH = 1000;
const SIGNATURE_VIEWBOX_HEIGHT = 400;

function pointToSegment(point: Point, index: number): string {
  const x = point.x.toFixed(1);
  const y = point.y.toFixed(1);
  return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
}

function strokeToPath(points: Point[]): string {
  return points.map(pointToSegment).join(' ');
}

export function SignaturePad({ label, value, onChange, height = 180 }: SignaturePadProps) {
  const { colors, radii, spacing, typography } = useTheme();
  const [activeStroke, setActiveStroke] = React.useState<Point[]>([]);
  const [size, setSize] = React.useState({ width: 1, height });
  const pathRef = React.useRef(value);
  const activeStrokeRef = React.useRef<Point[]>([]);

  React.useEffect(() => {
    pathRef.current = value;
  }, [value]);

  function clampPoint(x: number, y: number): Point {
    return {
      x: (Math.max(0, Math.min(size.width, x)) / size.width) * SIGNATURE_VIEWBOX_WIDTH,
      y: (Math.max(0, Math.min(size.height, y)) / size.height) * SIGNATURE_VIEWBOX_HEIGHT,
    };
  }

  function commitStroke(points: Point[]) {
    const strokePath = strokeToPath(points);
    if (!strokePath) return;
    const next = pathRef.current ? `${pathRef.current} ${strokePath}` : strokePath;
    pathRef.current = next;
    onChange(next);
  }

  const responder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const point = clampPoint(event.nativeEvent.locationX, event.nativeEvent.locationY);
          activeStrokeRef.current = [point];
          setActiveStroke([point]);
        },
        onPanResponderMove: (event) => {
          const point = clampPoint(event.nativeEvent.locationX, event.nativeEvent.locationY);
          const next = [...activeStrokeRef.current, point];
          activeStrokeRef.current = next;
          setActiveStroke(next);
        },
        onPanResponderRelease: () => {
          commitStroke(activeStrokeRef.current);
          activeStrokeRef.current = [];
          setActiveStroke([]);
        },
        onPanResponderTerminate: () => {
          commitStroke(activeStrokeRef.current);
          activeStrokeRef.current = [];
          setActiveStroke([]);
        },
      }),
    [size.height, size.width],
  );

  function clear() {
    pathRef.current = '';
    setActiveStroke([]);
    onChange('');
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
        <Text selectable style={{ ...typography.label, color: colors.textPrimary }}>
          {label}
        </Text>
        <Pressable accessibilityRole="button" onPress={clear}>
          <Text selectable={false} style={{ ...typography.label, color: colors.accentPrimary }}>
            Clear
          </Text>
        </Pressable>
      </View>
      <View
        {...responder.panHandlers}
        onLayout={(event) => {
          setSize({
            width: Math.max(1, event.nativeEvent.layout.width),
            height: Math.max(1, event.nativeEvent.layout.height),
          });
        }}
        style={{
          height,
          borderRadius: radii.sm,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.bgSurface,
          overflow: 'hidden',
        }}
      >
        <Svg width="100%" height="100%" viewBox={`0 0 ${SIGNATURE_VIEWBOX_WIDTH} ${SIGNATURE_VIEWBOX_HEIGHT}`}>
          <Line
            x1={48}
            x2={SIGNATURE_VIEWBOX_WIDTH - 48}
            y1={SIGNATURE_VIEWBOX_HEIGHT - 76}
            y2={SIGNATURE_VIEWBOX_HEIGHT - 76}
            stroke={colors.divider}
            strokeWidth={3}
          />
          {value ? (
            <Path d={value} fill="none" stroke={colors.textPrimary} strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
          ) : null}
          {activeStroke.length ? (
            <Path
              d={strokeToPath(activeStroke)}
              fill="none"
              stroke={colors.textPrimary}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
            />
          ) : null}
        </Svg>
      </View>
      <Text selectable style={{ ...typography.caption, color: colors.textSecondary }}>
        Sign inside the box.
      </Text>
    </View>
  );
}
