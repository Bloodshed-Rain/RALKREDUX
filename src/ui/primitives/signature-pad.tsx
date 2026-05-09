import React from 'react';
import { Pressable, Text, View } from 'react-native';
import SignatureCanvas, { SignatureViewRef } from 'react-native-signature-canvas';
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
  height = 180,
  onStrokeStart,
  onStrokeEnd,
}: SignaturePadProps) {
  const { colors, radii, spacing, typography } = useTheme();
  const signatureRef = React.useRef<SignatureViewRef>(null);
  const isImageValue = isImageSignature(value);

  function clear() {
    signatureRef.current?.clearSignature();
    onChange('');
    onStrokeEnd?.();
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
        onTouchStart={onStrokeStart}
        onTouchEnd={onStrokeEnd}
        onTouchCancel={onStrokeEnd}
        style={{
          height,
          borderRadius: radii.sm,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: '#ffffff',
          overflow: 'hidden',
        }}
      >
        {value && !isImageValue ? (
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
            onBegin={onStrokeStart}
            onEnd={() => {
              signatureRef.current?.readSignature();
              onStrokeEnd?.();
            }}
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
        )}
      </View>
      <Text selectable style={{ ...typography.caption, color: colors.textSecondary }}>
        Sign inside the box.
      </Text>
    </View>
  );
}
