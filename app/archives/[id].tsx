import React from 'react';
import { Alert, Image, ScrollView, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import { Button, Card, IconBtn, Pill, TopBar } from '@/src/ui/primitives/v2';
import { IconArrowLeft } from '@/src/ui/icons';
import { useArchive, useDeleteArchive } from '@/src/domain/archive/use-archive';
import { formatIsoForDisplay } from '@/src/domain/date-utils';

function schemeLabel(scheme: string | null): string {
  switch (scheme) {
    case 'sprat':
      return 'SPRAT';
    case 'irata':
      return 'IRATA';
    case 'both':
      return 'SPRAT + IRATA';
    default:
      return scheme || '—';
  }
}

function periodLabel(from: string | null, to: string | null): string {
  const f = formatIsoForDisplay(from);
  const t = formatIsoForDisplay(to);
  if (f && t) return `${f} – ${t}`;
  return f ?? t ?? '—';
}

export default function ArchiveDetailScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const archiveId = typeof id === 'string' ? id : '';
  const archive = useArchive(archiveId);
  const del = useDeleteArchive();
  const data = archive.data;

  function onDelete() {
    Alert.alert(
      'Delete archive?',
      'This removes the archive and its photos from this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => del.mutate(archiveId, { onSuccess: () => router.back() }),
        },
      ],
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <TopBar
        title={data?.label ?? 'Archive'}
        leading={<IconBtn icon={IconArrowLeft} label="Back" size="md" onPress={() => router.back()} />}
      />
      {data ? (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 28 + insets.bottom,
            gap: 12,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pill tone="warn">UNVERIFIED · SELF-DECLARED</Pill>
          </View>

          {data.photos.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {data.photos.map((photo) => (
                <Image
                  key={photo.id}
                  source={{ uri: photo.uri }}
                  style={{
                    width: '31.5%',
                    aspectRatio: 1,
                    borderRadius: 10,
                    backgroundColor: tokens.surface2,
                  }}
                  resizeMode="cover"
                />
              ))}
            </View>
          ) : (
            <Card padding={14}>
              <Text style={{ ...type.cardSub, color: tokens.textDim }}>No photos in this archive.</Text>
            </Card>
          )}

          <Card padding={16}>
            <MetaRow label="Scheme" value={schemeLabel(data.scheme)} />
            <MetaRow label="Period" value={periodLabel(data.date_from, data.date_to)} />
            <MetaRow
              label="Hours claimed"
              value={data.hours_claimed != null ? `${data.hours_claimed.toFixed(1)} h` : '—'}
            />
            <MetaRow label="Witness" value={data.witness_name || '—'} />
            {data.notes ? <MetaRow label="Notes" value={data.notes} /> : null}
          </Card>

          <Card padding={12}>
            <Text style={{ ...type.cardSub, color: tokens.textFaint, lineHeight: 18 }}>
              Unverified historical evidence. Never included in your signed audit export or counted in
              attested hour totals.
            </Text>
          </Card>

          <Button variant="outline" size="lg" full onPress={onDelete} disabled={del.isPending}>
            {del.isPending ? 'Deleting…' : 'Delete archive'}
          </Button>
        </ScrollView>
      ) : null}
    </View>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
        paddingVertical: 7,
      }}
    >
      <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>{label}</Text>
      <Text style={{ ...type.body, color: tokens.text, flex: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}
