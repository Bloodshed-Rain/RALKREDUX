import React from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  ScrollView,
  Text,
  View,
  type ScrollViewProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Svg, Circle } from 'react-native-svg';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { IconChain } from '@/src/ui/icons';
import { useReducedMotion } from '@/src/ui/animation/use-reduced-motion';

const THRESHOLD = 72;
const SETTLED_OFFSET = 56;

type PullState = 'idle' | 'pulling' | 'ready' | 'refreshing';

export interface PullToRefreshProps extends Omit<ScrollViewProps, 'refreshControl'> {
  onRefresh: () => void | Promise<void>;
  children?: React.ReactNode;
  refreshing?: boolean;
}

// Bespoke chain-icon pull-to-refresh built on PanResponder + Animated. No
// reanimated/gesture-handler dependency. Functional contract: matches the
// handoff's 3-stage label ("Pull to refresh" → "Release to sync" → "Syncing
// chain…") and 72px threshold. Motion is honest about RN limits — not as
// smooth as a Reanimated worklet would be, but no native rebuild required.
export function PullToRefresh({
  onRefresh,
  children,
  refreshing,
  contentContainerStyle,
  style,
  ...scrollProps
}: PullToRefreshProps) {
  const { tokens } = useTheme();
  const reduced = useReducedMotion();
  const translateY = React.useRef(new Animated.Value(0)).current;
  const [state, setState] = React.useState<PullState>('idle');
  const [pull, setPull] = React.useState(0);
  const armedRef = React.useRef(false);
  const scrollOffsetRef = React.useRef(0);
  const stateRef = React.useRef<PullState>('idle');
  const spin = React.useRef(new Animated.Value(0)).current;

  const setStateBoth = React.useCallback(
    (next: PullState) => {
      stateRef.current = next;
      setState(next);
    },
    [],
  );

  // External `refreshing` toggles let callers drive the spinner from their
  // own async work; otherwise this primitive runs the cycle locally.
  React.useEffect(() => {
    if (refreshing === true) {
      setStateBoth('refreshing');
      Animated.timing(translateY, {
        toValue: SETTLED_OFFSET,
        duration: 220,
        easing: Easing.bezier(0.2, 0.7, 0.3, 1),
        useNativeDriver: true,
      }).start();
    } else if (refreshing === false && stateRef.current === 'refreshing') {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        easing: Easing.bezier(0.2, 0.7, 0.3, 1),
        useNativeDriver: true,
      }).start(() => {
        setPull(0);
        setStateBoth('idle');
      });
    }
  }, [refreshing, setStateBoth, translateY]);

  // Continuous spin while refreshing.
  React.useEffect(() => {
    if (state !== 'refreshing' || reduced) {
      spin.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [state, reduced, spin]);

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_e, g) => {
          if (stateRef.current === 'refreshing') return false;
          if (scrollOffsetRef.current > 1) return false;
          return g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx);
        },
        onPanResponderGrant: () => {
          armedRef.current = true;
        },
        onPanResponderMove: (_e, g) => {
          if (!armedRef.current) return;
          if (g.dy <= 0) {
            setPull(0);
            translateY.setValue(0);
            setStateBoth('idle');
            return;
          }
          const eased = Math.min(120, Math.pow(g.dy, 0.86));
          setPull(eased);
          translateY.setValue(eased);
          setStateBoth(eased > THRESHOLD ? 'ready' : 'pulling');
        },
        onPanResponderRelease: () => {
          if (!armedRef.current) return;
          armedRef.current = false;
          if (stateRef.current === 'ready') {
            setStateBoth('refreshing');
            Animated.timing(translateY, {
              toValue: SETTLED_OFFSET,
              duration: 220,
              easing: Easing.bezier(0.2, 0.7, 0.3, 1),
              useNativeDriver: true,
            }).start();
            Promise.resolve(onRefresh()).finally(() => {
              if (refreshing !== true) {
                Animated.timing(translateY, {
                  toValue: 0,
                  duration: 320,
                  easing: Easing.bezier(0.2, 0.7, 0.3, 1),
                  useNativeDriver: true,
                }).start(() => {
                  setPull(0);
                  setStateBoth('idle');
                });
              }
            });
          } else {
            Animated.timing(translateY, {
              toValue: 0,
              duration: 240,
              easing: Easing.bezier(0.2, 0.7, 0.3, 1),
              useNativeDriver: true,
            }).start(() => {
              setPull(0);
              setStateBoth('idle');
            });
          }
        },
        onPanResponderTerminate: () => {
          armedRef.current = false;
        },
      }),
    [onRefresh, refreshing, setStateBoth, translateY],
  );

  const labels: Record<PullState, string> = {
    idle: 'Pull to refresh',
    pulling: 'Pull to refresh',
    ready: 'Release to sync',
    refreshing: 'Syncing chain…',
  };
  const progress = Math.min(1, pull / THRESHOLD);

  const indicatorOpacity = pull > 4 || state === 'refreshing' ? 1 : 0;

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 60,
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: 4,
          opacity: indicatorOpacity,
          zIndex: 1,
        }}
      >
        <PullIndicator
          progress={progress}
          active={state === 'refreshing'}
          label={labels[state]}
          spin={spin}
          accent={tokens.accent}
          lineSoft={tokens.lineSoft}
          textDim={tokens.textDim}
        />
      </View>
      <Animated.View
        style={{
          flex: 1,
          transform: [{ translateY }] as unknown as ViewStyle['transform'],
        }}
      >
        <ScrollView
          {...scrollProps}
          style={style}
          contentContainerStyle={contentContainerStyle}
          scrollEventThrottle={16}
          onScroll={(e) => {
            scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
            scrollProps.onScroll?.(e);
          }}
        >
          {children}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

interface PullIndicatorProps {
  progress: number;
  active: boolean;
  label: string;
  spin: Animated.Value;
  accent: string;
  lineSoft: string;
  textDim: string;
}

function PullIndicator({
  progress,
  active,
  label,
  spin,
  accent,
  lineSoft,
  textDim,
}: PullIndicatorProps) {
  const radius = 11;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const labelStyle: TextStyle = {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontWeight: '600',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.6,
    color: textDim,
    textTransform: 'uppercase',
    marginTop: 6,
  };

  return (
    <View style={{ alignItems: 'center', gap: 6, paddingTop: 8 }}>
      <View style={{ width: 28, height: 28, position: 'relative' }}>
        <Svg width={28} height={28} viewBox="0 0 28 28" style={{ position: 'absolute', top: 0, left: 0 }}>
          <Circle cx={14} cy={14} r={radius} fill="none" stroke={lineSoft} strokeWidth={1.5} />
          <Circle
            cx={14}
            cy={14}
            r={radius}
            fill="none"
            stroke={accent}
            strokeWidth={2}
            strokeDasharray={`${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 14 14)`}
          />
        </Svg>
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              width: 28,
              height: 28,
              alignItems: 'center',
              justifyContent: 'center',
            },
            active ? { transform: [{ rotate }] } : null,
          ]}
        >
          <IconChain size={17} color={accent} fill={accent} />
        </Animated.View>
      </View>
      <Text selectable={false} style={labelStyle}>
        {label}
      </Text>
    </View>
  );
}
