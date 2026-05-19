import React from 'react';
import { Keyboard, Platform, Pressable, Text, View, type ViewStyle, type TextStyle } from 'react-native';
import SignatureCanvas, { type SignatureViewRef } from 'react-native-signature-canvas';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';

export interface SigPadProps {
  value: string;
  onChange: (signature: string) => void;
  onStrokeStart?: () => void;
  onStrokeEnd?: () => void;
  height?: number;
}

// 180 px tall (per v2 spec) capture surface with a hairline baseline 32 px
// from the bottom and a mono "✕ SIGN HERE" hint overlay at the lower-left.
// Wraps `react-native-signature-canvas` and re-themes the canvas via its
// webStyle string. Clear button is exposed via the section header in the
// parent screen — see the `onClear` prop and `clear()` ref method below.
export const SigPad = React.forwardRef<SigPadHandle, SigPadProps>(function SigPad(
  { value, onChange, onStrokeStart, onStrokeEnd, height = 180 },
  ref,
) {
  const { tokens } = useTheme();
  const canvasRef = React.useRef<SignatureViewRef>(null);
  const [hasStarted, setHasStarted] = React.useState(Boolean(value));

  React.useImperativeHandle(
    ref,
    () => ({
      clear: () => {
        canvasRef.current?.clearSignature();
        onChange('');
        setHasStarted(false);
        onStrokeEnd?.();
      },
    }),
    [onChange, onStrokeEnd],
  );

  function handleStart() {
    Keyboard.dismiss();
    if (!hasStarted) setHasStarted(true);
    onStrokeStart?.();
  }

  function handleEnd() {
    canvasRef.current?.readSignature();
    onStrokeEnd?.();
  }

  const webStyle = `
    .m-signature-pad { box-shadow: none; border-radius: 0; border: none; }
    .m-signature-pad--body { border: none; }
    .m-signature-pad--footer { display: none; margin: 0; }
    body, html { background: transparent; margin: 0; padding: 0; }
    canvas { background: transparent !important; }
  `;

  const containerStyle: ViewStyle = {
    height,
    backgroundColor: tokens.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tokens.lineSoft,
    overflow: 'hidden',
    position: 'relative',
  };

  const baselineStyle: ViewStyle = {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
    height: 1,
    backgroundColor: tokens.line,
  };

  const hintStyle: TextStyle = {
    position: 'absolute',
    left: 16,
    bottom: 12,
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontWeight: '600',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.6,
    color: tokens.textFaint,
  };

  if (Platform.OS === 'web') {
    return (
      <View style={[containerStyle, { alignItems: 'center', justifyContent: 'center', padding: 20 }]}>
        <Text style={{ color: tokens.textDim, textAlign: 'center', marginBottom: 12, ...type.body }}>
          Signature canvas requires native WebView.
        </Text>
        <Pressable 
          onPress={() => {
            setHasStarted(true);
            onChange('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
            onStrokeEnd?.();
          }}
          style={{ paddingVertical: 8, paddingHorizontal: 12, backgroundColor: tokens.surface2, borderRadius: 8, borderWidth: 1, borderColor: tokens.lineSoft }}
        >
          <Text style={{ color: tokens.text, ...type.body, fontFamily: 'Manrope_600SemiBold', fontWeight: '600' }}>Mock Signature</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <View style={baselineStyle} />
      {!hasStarted ? <Text style={hintStyle}>✕  SIGN HERE</Text> : null}
      <SignatureCanvas
        ref={canvasRef}
        onOK={onChange}
        onEmpty={() => onChange('')}
        onBegin={handleStart}
        onEnd={handleEnd}
        autoClear={false}
        webStyle={webStyle}
        backgroundColor="transparent"
        penColor={tokens.text}
        descriptionText=""
        imageType="image/png"
        // The library renders a small footer with Clear/Confirm by default;
        // hiding it via webStyle and driving via ref instead.
        style={{ flex: 1 }}
      />
    </View>
  );
});

export interface SigPadHandle {
  clear: () => void;
}
