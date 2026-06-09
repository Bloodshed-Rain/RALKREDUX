import React from 'react';
import {
  AccessibilityInfo,
  Animated,
  Modal,
  Pressable,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/ui/theme/theme-provider';
import type { ThemeTokens } from '@/src/ui/theme/themes';
import { isHeliotypeFamily } from '@/src/ui/theme/themes';
import { haptics } from '@/src/ui/haptics';
import { useReducedMotion } from '@/src/ui/animation/use-reduced-motion';
import { AnimatedPressable, usePressScale } from '@/src/ui/animation/use-press-scale';
import { durations, easings, entrance, press as pressTokens } from '@/src/ui/animation/motion';
import { type IconProps } from '@/src/ui/icons';

export interface FabChoice {
  key: string;
  label: string;
  hint: string;
  Icon: React.ComponentType<IconProps>;
  onSelect: () => void;
}

interface FabChooserProps {
  open: boolean;
  // Visual + a11y close. Selecting a choice or tapping the scrim both call this.
  onClose: () => void;
  choices: FabChoice[];
  // Right edge inset so the menu column aligns over the centered FAB. The tab bar
  // pads horizontally; we mirror that so the tiles sit above the "+", not flush.
  bottomOffset: number;
}

// A single stamped "paper" action tile. Press-scales on the shared house spring;
// rendered into the staggered reveal column by FabChooser.
function ChoiceTile({
  choice,
  tokens,
  isHeliotype,
}: {
  choice: FabChoice;
  tokens: ThemeTokens;
  isHeliotype: boolean;
}) {
  const pressScale = usePressScale(pressTokens.scale.card);

  const tileStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 56,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: tokens.surface,
    borderWidth: isHeliotype ? 1.5 : 1,
    borderColor: tokens.line,
    // Hard, no-blur ink ledge for the Heliotype stamp; soft elsewhere.
    shadowColor: isHeliotype ? tokens.line : tokens.shadow,
    shadowOffset: { width: 0, height: isHeliotype ? 3 : 8 },
    shadowOpacity: isHeliotype ? 1 : 0.25,
    shadowRadius: isHeliotype ? 0 : 14,
    elevation: 6,
  };

  const labelStyle: TextStyle = {
    fontFamily: 'Manrope_700Bold',
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.2,
    color: tokens.text,
  };

  const hintStyle: TextStyle = {
    fontFamily: 'Manrope_500Medium',
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 15,
    color: tokens.textDim,
    marginTop: 1,
  };

  const iconWrap: ViewStyle = {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.accentSoft,
    borderWidth: isHeliotype ? 1.5 : 0,
    borderColor: tokens.line,
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`${choice.label}. ${choice.hint}`}
      onPress={choice.onSelect}
      onPressIn={pressScale.onPressIn}
      onPressOut={pressScale.onPressOut}
      style={[tileStyle, pressScale.style]}
    >
      <View style={iconWrap}>
        <choice.Icon size={22} color={tokens.accent} fill={tokens.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text selectable={false} style={labelStyle}>
          {choice.label}
        </Text>
        <Text selectable={false} style={hintStyle}>
          {choice.hint}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

// The FAB chooser overlay. Rendered inside a transparent core-RN Modal so it sits
// above content AND the tab bar on both platforms (a sibling absolute layer that
// extended above the tab-bar parent would not receive scrim taps on Android).
//
// One Animated.Value (`progress`, 0→1) drives the whole choreography: the scrim
// fade and each tile's staggered scale+fade+rise. `visible` (separate state)
// keeps the Modal mounted through the close animation so the exit actually plays.
// Reduced motion lands on the end state with no transform nodes.
export function FabChooser({ open, onClose, choices, bottomOffset }: FabChooserProps) {
  const { theme, tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const isHeliotype = isHeliotypeFamily(theme.key);

  const [visible, setVisible] = React.useState(open);
  const progress = React.useRef(new Animated.Value(open ? 1 : 0)).current;

  React.useEffect(() => {
    if (open) {
      setVisible(true);
      AccessibilityInfo.announceForAccessibility('New record menu opened');
      if (reduced) {
        progress.setValue(1);
        return;
      }
      const anim = Animated.timing(progress, {
        toValue: 1,
        duration: durations.entrance,
        easing: easings.decelerate,
        useNativeDriver: true,
      });
      // Defer one frame: setVisible(true) mounts the Modal on this commit, but the
      // scrim's animated view isn't attached until the next. Starting a native
      // animation before its view attaches can no-op the first open (scrim pops in
      // at full opacity instead of fading). rAF lets the view land first.
      const raf = requestAnimationFrame(() => anim.start());
      return () => {
        cancelAnimationFrame(raf);
        anim.stop();
      };
    }

    // Closing: play the exit, then unmount the Modal in the completion callback.
    if (!visible) return; // never opened yet — nothing to animate out
    AccessibilityInfo.announceForAccessibility('New record menu closed');
    if (reduced) {
      progress.setValue(0);
      setVisible(false);
      return;
    }
    const anim = Animated.timing(progress, {
      toValue: 0,
      duration: durations.reveal,
      easing: easings.standard,
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) setVisible(false);
    });
    return () => anim.stop();
    // `visible` intentionally omitted: it's set *by* this effect; including it
    // would re-run the close branch after unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reduced, progress]);

  if (!visible) return null;

  const scrimStyle: ViewStyle = {
    flex: 1,
    backgroundColor: tokens.scrim,
    justifyContent: 'flex-end',
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View style={[scrimStyle, { opacity: progress }]} pointerEvents={open ? 'auto' : 'none'}>
        {/* Backdrop tap target — fills the scrim, dismisses without routing. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss new record menu"
          onPress={onClose}
          style={absoluteFill}
        />
        <View
          // The menu column floats just above the FAB: full-width stamped tiles
          // stacked with comfortable gloved gaps, lifted clear of the tab bar.
          pointerEvents="box-none"
          style={{
            paddingHorizontal: 20,
            paddingBottom: bottomOffset + Math.max(insets.bottom, 12),
            gap: 12,
          }}
        >
          {choices.map((choice, i) => {
            // Stagger each tile across its own slice of `progress`. Item 0 leads;
            // later items start a beat later (and, on close, settle a beat later).
            const start = Math.min(i * 0.18, 0.4);
            const end = Math.min(start + 0.6, 1);

            const tileAnim = reduced
              ? null
              : {
                  opacity: progress.interpolate({
                    inputRange: [start, end],
                    outputRange: [0, 1],
                    extrapolate: 'clamp' as const,
                  }),
                  transform: [
                    {
                      translateY: progress.interpolate({
                        inputRange: [start, end],
                        outputRange: [entrance.offsetY + 8, 0],
                        extrapolate: 'clamp' as const,
                      }),
                    },
                    {
                      scale: progress.interpolate({
                        inputRange: [start, end],
                        outputRange: [0.92, 1],
                        extrapolate: 'clamp' as const,
                      }),
                    },
                  ],
                };

            return (
              <Animated.View key={choice.key} style={tileAnim}>
                <ChoiceTile choice={choice} tokens={tokens} isHeliotype={isHeliotype} />
              </Animated.View>
            );
          })}
        </View>
      </Animated.View>
    </Modal>
  );
}

const absoluteFill: ViewStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
