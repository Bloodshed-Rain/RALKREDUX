import React from 'react';
import { Keyboard, Pressable, Text, View } from 'react-native';
import SignatureCanvas, { SignatureViewRef } from 'react-native-signature-canvas';
import { RotateCcw } from 'lucide-react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { useTheme } from '../theme/theme-provider';

interface SignaturePadProps {
  label: string;
  value: string;
  onChange: (signature: string) => void;
  height?: number;
  onStrokeStart?: () => void;
  onStrokeEnd?: () => void;
}

const SIGNATURE_VIEWBOX_WIDTH = 1000;
const SIGNATURE_VIEWBOX_HEIGHT = 400;

function isImageSignature(value: string): boolean {
  return value.startsWith('data:image/');
}

export function SignaturePad({
  label,
  value,
  onChange,
  height = 220,
  onStrokeStart,
  onStrokeEnd,
}: SignaturePadProps) {
  const { colors, radii, spacing, typography, touchTarget } = useTheme();
  const signatureRef = React.useRef<SignatureViewRef>(null);
  const isImageValue = isImageSignature(value);
  const [hasStarted, setHasStarted] = React.useState(false);
  const isSigned = Boolean(value);
  const showHint = !isSigned && !hasStarted;
  const showClear = isSigned || hasStarted;

  function handleStart() {
    Keyboard.dismiss();
    if (!hasStarted) setHasStarted(true);
    onStrokeStart?.();
  }

  function handleEnd() {
    signatureRef.current?.readSignature();
    onStrokeEnd?.();
  }

  function clear() {
    signatureRef.current?.clearSignature();
    onChange('');
    setHasStarted(false);
    onStrokeEnd?.();
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
        <Text selectable style={{ ...typography.label, color: colors.textPrimary }}>
          {label}
        </Text>
        {showClear ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear signature"
            onPress={clear}
            hitSlop={8}
            style={({ pressed }) => ({
              minHeight: touchTarget.min,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              borderRadius: radii.sm,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              backgroundColor: pressed ? colors.bgMuted : colors.bgSurface,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <RotateCcw size={16} color={colors.textPrimary} strokeWidth={2.2} />
            <Text selectable={false} style={{ ...typography.label, color: colors.textPrimary }}>
              Clear
            </Text>
          </Pressable>
        ) : null}
      </View>
      <View
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleStart}
        onResponderTerminationRequest={() => false}
        onResponderRelease={handleEnd}
        onResponderTerminate={handleEnd}
        style={{
          height,
          borderRadius: radii.sm,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: '#ffffff',
          overflow: 'hidden',
        }}
      >
        {isSigned && !isImageValue ? (
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
            <Path d={value} fill="none" stroke={colors.textPrimary} strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
          </Svg>
        ) : (
          <>
            <SignatureCanvas
              ref={signatureRef}
              autoClear={false}
              backgroundColor="#ffffff"
              dataURL={isImageValue ? value : undefined}
              descriptionText=""
              imageType="image/png"
              minDistance={1}
              minWidth={1.6}
              maxWidth={3.2}
              nestedScrollEnabled={false}
              onBegin={handleStart}
              onEnd={handleEnd}
              onOK={onChange}
              onClear={() => onChange('')}
              penColor={colors.textPrimary}
              scrollable={false}
              trimWhitespace
              webStyle={`
                .m-signature-pad { box-shadow: none; border: none; height: 100%; }
                .m-signature-pad--body { border: none; background-color: #ffffff; inset: 0; height: 100%; }
                .m-signature-pad--body canvas { height: 100% !important; width: 100% !important; touch-action: none; }
                .m-signature-pad--footer { display: none; }
                body,html { height: 100%; margin: 0; overflow: hidden; background: #ffffff; }
              `}
              webviewProps={{
                scrollEnabled: false,
                bounces: false,
              }}
            />
            {showHint ? (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  alignItems: 'center',
                  paddingHorizontal: spacing.lg,
                  paddingBottom: spacing.md,
                  gap: spacing.xs,
                }}
              >
                <View style={{ alignSelf: 'stretch', height: 1, backgroundColor: colors.divider }} />
                <Text selectable={false} style={{ ...typography.caption, color: colors.textMuted }}>
                  Sign here
                </Text>
              </View>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}
