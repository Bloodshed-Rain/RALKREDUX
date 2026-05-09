import React from 'react';
import { PanResponder, Pressable, Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { useScreenScrollLock } from './screen';
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
const MIN_POINT_DISTANCE = 3;
const MIN_STROKE_POINTS = 2;

function pointToSegment(point: Point, index: number): string {
  const x = point.x.toFixed(1);
  const y = point.y.toFixed(1);
  return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
}

function strokeToPath(points: Point[]): string {
  return points.map(pointToSegment).join(' ');
}

function distanceBetween(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function SignaturePad({ label, value, onChange, height = 180 }: SignaturePadProps) {
  const { colors, radii, spacing, typography } = useTheme();
  const setScreenScrollLocked = useScreenScrollLock();
  const [activeStroke, setActiveStroke] = React.useState<Point[]>([]);
  const [size, setSize] = React.useState({ width: 1, height });
  const pathRef = React.useRef(value);
  const activeStrokeRef = React.useRef<Point[]>([]);
  const strokeStartRef = React.useRef<Point | null>(null);
  const scrollLockedRef = React.useRef(false);

  React.useEffect(() => {
    pathRef.current = value;
  }, [value]);

  React.useEffect(() => () => {
    if (scrollLockedRef.current) {
      scrollLockedRef.current = false;
      setScreenScrollLocked(false);
    }
  }, [setScreenScrollLocked]);

  function clampPoint(x: number, y: number): Point {
    return {
      x: (Math.max(0, Math.min(size.width, x)) / size.width) * SIGNATURE_VIEWBOX_WIDTH,
      y: (Math.max(0, Math.min(size.height, y)) / size.height) * SIGNATURE_VIEWBOX_HEIGHT,
    };
  }

  function lockScreenScroll() {
    if (scrollLockedRef.current) return;
    scrollLockedRef.current = true;
    setScreenScrollLocked(true);
  }

  function unlockScreenScroll() {
    if (!scrollLockedRef.current) return;
    scrollLockedRef.current = false;
    setScreenScrollLocked(false);
  }

  function commitStroke(points: Point[]) {
    if (points.length < MIN_STROKE_POINTS) return;
    const strokePath = strokeToPath(points);
    if (!strokePath) return;
    const next = pathRef.current ? `${pathRef.current} ${strokePath}` : strokePath;
    pathRef.current = next;
    onChange(next);
  }

  function appendPoint(point: Point) {
    const current = activeStrokeRef.current;
    const previous = current[current.length - 1];
    if (previous && distanceBetween(previous, point) < MIN_POINT_DISTANCE) return;

    const next = [...current, point];
    activeStrokeRef.current = next;
    setActiveStroke(next);
  }

  function finishStroke() {
    commitStroke(activeStrokeRef.current);
    activeStrokeRef.current = [];
    strokeStartRef.current = null;
    setActiveStroke([]);
    unlockScreenScroll();
  }

  const responder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          lockScreenScroll();
          const start = {
            x: event.nativeEvent.locationX,
            y: event.nativeEvent.locationY,
          };
          strokeStartRef.current = start;
          const startPoint = clampPoint(start.x, start.y);
          activeStrokeRef.current = [startPoint];
          setActiveStroke([startPoint]);
        },
        onPanResponderMove: (_event, gestureState) => {
          const start = strokeStartRef.current;
          if (!start) return;
          appendPoint(
            clampPoint(start.x + gestureState.dx, start.y + gestureState.dy),
          );
        },
        onPanResponderRelease: (_event, gestureState) => {
          const start = strokeStartRef.current;
          if (start) {
            appendPoint(
              clampPoint(start.x + gestureState.dx, start.y + gestureState.dy),
            );
          }
          finishStroke();
        },
        onPanResponderTerminate: (_event, gestureState) => {
          const start = strokeStartRef.current;
          if (start) {
            appendPoint(
              clampPoint(start.x + gestureState.dx, start.y + gestureState.dy),
            );
          }
          finishStroke();
        },
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    [size.height, size.width],
  );

  function clear() {
    pathRef.current = '';
    setActiveStroke([]);
    activeStrokeRef.current = [];
    strokeStartRef.current = null;
    unlockScreenScroll();
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
        collapsable={false}
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
        <Svg
          pointerEvents="none"
          width="100%"
          height="100%"
          viewBox={`0 0 ${SIGNATURE_VIEWBOX_WIDTH} ${SIGNATURE_VIEWBOX_HEIGHT}`}
        >
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
