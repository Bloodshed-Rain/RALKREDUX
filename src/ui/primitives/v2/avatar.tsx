import React from 'react';
import { Image, Pressable, Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { isHeliotypeFamily } from '@/src/ui/theme/themes';

// Initials fallback for a missing/failed avatar. "Jane Doe" -> "JD",
// "Jane" -> "JA", empty -> "—".
export function deriveInitials(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '—';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface AvatarProps {
  /** Durable avatar file URI (profile.avatar_uri). Null/failed -> initials. */
  uri?: string | null;
  /** Full name, used to derive the initials fallback. */
  name?: string | null;
  size?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
}

// The profile avatar: the chosen photo, or initials on the accent fill when no
// photo is set (or the persisted file dangles after a device restore). Carries
// the Heliotype stamped hard-edge ring so it reads as a deliberate element on
// the bare header background, not a floating circle.
export function Avatar({ uri, name, size = 40, onPress, accessibilityLabel }: AvatarProps) {
  const { theme, tokens } = useTheme();
  const [failed, setFailed] = React.useState(false);
  // A fresh URI is a fresh photo — clear any prior load failure.
  React.useEffect(() => setFailed(false), [uri]);

  const showImage = !!uri && !failed;
  const stamped = isHeliotypeFamily(theme.key);

  const box: ViewStyle = {
    width: size,
    height: size,
    borderRadius: Math.round(size * 0.28),
    backgroundColor: tokens.accent,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: stamped ? 1.5 : 0,
    borderColor: tokens.line,
  };

  const content = showImage ? (
    <Image
      source={{ uri: uri as string }}
      onError={() => setFailed(true)}
      // Fill the content box (inside the border) so the stamped ring stays visible.
      style={{ width: '100%', height: '100%' }}
      resizeMode="cover"
    />
  ) : (
    <Text
      style={{
        fontFamily: 'Manrope_800ExtraBold',
        fontWeight: '800',
        fontSize: Math.round(size * 0.38),
        letterSpacing: -0.4,
        color: tokens.accentInk,
      }}
    >
      {deriveInitials(name)}
    </Text>
  );

  if (!onPress) {
    return (
      <View style={box} accessibilityLabel={accessibilityLabel}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={box}
    >
      {content}
    </Pressable>
  );
}
