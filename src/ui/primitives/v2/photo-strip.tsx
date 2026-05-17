import React from 'react';
import { Image, Pressable, ScrollView, Text, View, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { IconCamera } from '@/src/ui/icons';

const TILE = 88;
const SLOT_LABELS = ['Anchors', 'Workzone', 'Hazard'] as const;

export interface PhotoStripItem {
  id: string;
  uri: string;
  label?: string;
}

export interface PhotoStripProps {
  photos: PhotoStripItem[];
  onCapture: () => void;
  capturePending?: boolean;
  disabled?: boolean;
}

// Horizontally-scrolling row: leading "Capture" tile (accent-filled with
// IconCamera), then up to three 88×88 outlined slot tiles labeled
// Anchors / Workzone / Hazard. Tapping Capture appends a real 88×88
// thumbnail tile with a mono filename overlay. Filled photos collapse the
// matching slot from the trailing side, so the strip never grows beyond
// max(slots, photos+capture).
export function PhotoStrip({ photos, onCapture, capturePending, disabled }: PhotoStripProps) {
  const remainingSlots = Math.max(0, SLOT_LABELS.length - photos.length);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      <CaptureTile
        onPress={onCapture}
        pending={!!capturePending}
        disabled={!!disabled}
      />
      {photos.map((p) => (
        <PhotoTile key={p.id} photo={p} />
      ))}
      {Array.from({ length: remainingSlots }).map((_, i) => (
        <SlotTile key={`slot-${i}`} label={SLOT_LABELS[i + photos.length]} />
      ))}
    </ScrollView>
  );
}

function CaptureTile({
  onPress,
  pending,
  disabled,
}: {
  onPress: () => void;
  pending: boolean;
  disabled: boolean;
}) {
  const { tokens } = useTheme();
  const tileStyle: ViewStyle = {
    width: TILE,
    height: TILE,
    borderRadius: 14,
    backgroundColor: tokens.accent,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.45 : 1,
  };
  const labelStyle: TextStyle = {
    fontFamily: 'Manrope_600SemiBold',
    fontWeight: '600',
    fontSize: 11,
    lineHeight: 14,
    color: tokens.accentInk,
    marginTop: 6,
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Capture evidence photo"
      onPress={onPress}
      disabled={disabled || pending}
      style={({ pressed }) => [tileStyle, pressed ? { transform: [{ scale: 0.97 }] } : null]}
    >
      <IconCamera size={24} color={tokens.accentInk} fill={tokens.accentInk} fillOpacity={0.2} />
      <Text style={labelStyle}>{pending ? 'Working…' : 'Capture'}</Text>
    </Pressable>
  );
}

function SlotTile({ label }: { label: string }) {
  const { tokens } = useTheme();
  const tileStyle: ViewStyle = {
    width: TILE,
    height: TILE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tokens.lineSoft,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  };
  const labelStyle: TextStyle = {
    fontFamily: 'JetBrainsMono_500Medium',
    fontWeight: '500',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.2,
    color: tokens.textFaint,
    textTransform: 'uppercase',
  };
  return (
    <View style={tileStyle}>
      <Text style={labelStyle}>{label}</Text>
    </View>
  );
}

function PhotoTile({ photo }: { photo: PhotoStripItem }) {
  const { tokens } = useTheme();
  const tileStyle: ViewStyle = {
    width: TILE,
    height: TILE,
    borderRadius: 14,
    backgroundColor: tokens.surface2,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  };
  const overlayStyle: ViewStyle = {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
  };
  const overlayTextStyle: TextStyle = {
    fontFamily: 'JetBrainsMono_500Medium',
    fontWeight: '500',
    fontSize: 9,
    lineHeight: 11,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  };
  return (
    <View style={tileStyle}>
      <Image
        source={{ uri: photo.uri }}
        resizeMode="cover"
        style={{ width: TILE, height: TILE }}
      />
      {photo.label ? (
        <View style={overlayStyle}>
          <Text style={overlayTextStyle} numberOfLines={1}>
            {photo.label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

