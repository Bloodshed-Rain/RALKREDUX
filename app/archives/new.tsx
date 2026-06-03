import React from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import {
  Button,
  Card,
  ChipSelect,
  DateField,
  Field,
  IconBtn,
  SectionH,
  TopBar,
} from '@/src/ui/primitives/v2';
import { IconArrowLeft, IconCheck, IconClose, IconPlus } from '@/src/ui/icons';
import { captureOrPickPhoto } from '@/src/ui/photo-picker';
import { persistAttachmentFile } from '@/src/ui/attachment-storage';
import { useCreateArchive } from '@/src/domain/archive/use-archive';
import { haptics } from '@/src/ui/haptics';

type SchemeChoice = 'sprat' | 'irata' | 'both';

const SCHEME_OPTIONS: Array<{ value: SchemeChoice; label: string }> = [
  { value: 'sprat', label: 'SPRAT' },
  { value: 'irata', label: 'IRATA' },
  { value: 'both', label: 'Both' },
];

interface DraftPhoto {
  uri: string;
  mime_type: string | null;
}

export default function NewArchiveScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const createArchive = useCreateArchive();

  const [label, setLabel] = React.useState('');
  const [scheme, setScheme] = React.useState<SchemeChoice>('both');
  const [dateFrom, setDateFrom] = React.useState<string | null>(null);
  const [dateTo, setDateTo] = React.useState<string | null>(null);
  const [hours, setHours] = React.useState('');
  const [witness, setWitness] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [photos, setPhotos] = React.useState<DraftPhoto[]>([]);
  const [adding, setAdding] = React.useState(false);

  const canSave = label.trim().length > 0 && !createArchive.isPending;

  async function addPhoto() {
    if (adding) return;
    setAdding(true);
    try {
      const picked = await captureOrPickPhoto({
        promptTitle: 'Add logbook page',
        promptMessage: 'Photograph a page or pick a scan from your library.',
      });
      if (picked) {
        const durable = await persistAttachmentFile(picked.uri);
        setPhotos((prev) => [...prev, { uri: durable, mime_type: picked.mimeType }]);
        haptics.selection();
      }
    } catch (err) {
      haptics.error();
      Alert.alert(
        'Could not add photo',
        err instanceof Error ? err.message : 'The photo could not be saved.',
      );
    } finally {
      setAdding(false);
    }
  }

  function removePhoto(uri: string) {
    setPhotos((prev) => prev.filter((photo) => photo.uri !== uri));
  }

  function save() {
    if (!canSave) return;
    const hoursNum = hours ? Number(hours) : null;
    createArchive.mutate(
      {
        label: label.trim(),
        scheme,
        date_from: dateFrom,
        date_to: dateTo,
        hours_claimed: hoursNum != null && Number.isFinite(hoursNum) ? hoursNum : null,
        witness_name: witness.trim() || null,
        notes: notes.trim() || null,
        photos: photos.map((photo) => ({ uri: photo.uri, mime_type: photo.mime_type })),
      },
      {
        onSuccess: () => {
          haptics.success();
          router.back();
        },
        onError: (err) => {
          haptics.error();
          Alert.alert(
            'Could not save archive',
            err instanceof Error ? err.message : 'Something went wrong saving this archive.',
          );
        },
      },
    );
  }

  const introStyle: TextStyle = { ...type.cardSub, color: tokens.textDim, lineHeight: 20 };
  const labelStyle: TextStyle = { ...type.monoKicker, color: tokens.textFaint, marginBottom: 6 };

  const footerStyle: ViewStyle = {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: insets.bottom + 12,
    backgroundColor: tokens.bg,
    borderTopWidth: 1,
    borderTopColor: tokens.lineSoft,
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <TopBar
        title="Add paper logbook"
        leading={<IconBtn icon={IconArrowLeft} label="Back" size="md" onPress={() => router.back()} />}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
            <Text style={introStyle}>
              Capture or upload pages from a previous paper logbook as supporting evidence. This is
              stored as unverified historical reference — it is never added to your signed audit
              record or counted in attested totals.
            </Text>
          </View>

          <SectionH kicker="01 PAGES" title="Photos" />
          <View style={{ paddingHorizontal: 20 }}>
            <PhotoStrip photos={photos} onAdd={addPhoto} onRemove={removePhoto} adding={adding} />
          </View>

          <SectionH kicker="02 DETAILS" title="About this logbook" />
          <View style={{ paddingHorizontal: 20, gap: 12 }}>
            <Field
              label="Label"
              value={label}
              onChangeText={setLabel}
              placeholder="e.g. 2019–2021 SPRAT logbook"
              autoCapitalize="sentences"
            />
            <View>
              <Text style={labelStyle}>SCHEME</Text>
              <ChipSelect<SchemeChoice> value={scheme} options={SCHEME_OPTIONS} onChange={setScheme} />
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={labelStyle}>FROM</Text>
                <DateField value={dateFrom} onChange={setDateFrom} placeholder="Start" clearable />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={labelStyle}>TO</Text>
                <DateField value={dateTo} onChange={setDateTo} placeholder="End" clearable />
              </View>
            </View>
            <Field
              label="Hours claimed"
              value={hours}
              onChangeText={(v) => setHours(v.replace(/[^0-9.]/g, ''))}
              placeholder="Optional"
              keyboardType="decimal-pad"
              helper="Total rope-access hours represented by these pages."
            />
            <Field
              label="Witness / supervisor"
              value={witness}
              onChangeText={setWitness}
              placeholder="Optional — who can vouch for this record"
              autoCapitalize="words"
            />
            <Field
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional"
              autoCapitalize="sentences"
            />
          </View>
        </ScrollView>

        <View style={footerStyle}>
          <Button
            variant="primary"
            size="lg"
            full
            icon={IconCheck}
            onPress={save}
            disabled={!canSave}
          >
            {createArchive.isPending ? 'Saving…' : label.trim() ? 'Save archive' : 'Add a label'}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function PhotoStrip({
  photos,
  onAdd,
  onRemove,
  adding,
}: {
  photos: DraftPhoto[];
  onAdd: () => void;
  onRemove: (uri: string) => void;
  adding: boolean;
}) {
  const { tokens } = useTheme();
  const tile: ViewStyle = {
    width: 96,
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: tokens.surface2,
  };
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
      {photos.map((photo) => (
        <View key={photo.uri} style={tile}>
          <Image source={{ uri: photo.uri }} style={{ width: 96, height: 96 }} resizeMode="cover" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove page"
            onPress={() => onRemove(photo.uri)}
            hitSlop={8}
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: 'rgba(0,0,0,0.55)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconClose size={14} color="#fff" />
          </Pressable>
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add page photo"
        onPress={onAdd}
        disabled={adding}
        style={[
          tile,
          {
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: tokens.line,
            borderStyle: 'dashed',
            backgroundColor: tokens.surface,
            opacity: adding ? 0.6 : 1,
          },
        ]}
      >
        <IconPlus size={22} color={tokens.textDim} />
        <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginTop: 4 }}>
          {adding ? '…' : 'ADD'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
