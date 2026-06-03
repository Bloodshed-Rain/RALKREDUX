import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import { Button, Card, EmptyState, IconBtn, Pill, TopBar } from '@/src/ui/primitives/v2';
import { IconArrowLeft, IconCamera, IconPlus } from '@/src/ui/icons';
import { useArchives } from '@/src/domain/archive/use-archive';
import type { LegacyArchive } from '@/src/domain/archive/types';
import { formatIsoForDisplay } from '@/src/domain/date-utils';

function periodLabel(a: LegacyArchive): string {
  const from = formatIsoForDisplay(a.date_from);
  const to = formatIsoForDisplay(a.date_to);
  if (from && to) return `${from} – ${to}`;
  return from ?? to ?? 'No dates';
}

export default function ArchivesScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const archives = useArchives();
  const list = archives.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <TopBar
        title="Legacy logbook"
        subtitle="Self-declared · unverified historical records"
        leading={<IconBtn icon={IconArrowLeft} label="Back" size="md" onPress={() => router.back()} />}
        trailing={
          <IconBtn
            icon={IconPlus}
            label="Add archive"
            size="md"
            onPress={() => router.push('/archives/new' as never)}
          />
        }
      />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 28 + insets.bottom,
          gap: 10,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Card padding={12}>
          <Text style={{ ...type.cardSub, color: tokens.textDim, lineHeight: 18 }}>
            Photos of your previous paper logbooks, kept as supporting evidence for carried-forward
            hours. These are unverified and are never counted in your signed audit record.
          </Text>
        </Card>

        {list.length === 0 && archives.isFetched ? (
          <View style={{ paddingTop: 8, gap: 12 }}>
            <EmptyState
              icon={IconCamera}
              title="No archives yet"
              sub="Add photos of your old paper logbook pages to document hours from before you went digital."
            />
            <Button
              variant="primary"
              size="lg"
              full
              icon={IconPlus}
              onPress={() => router.push('/archives/new' as never)}
            >
              Add paper logbook
            </Button>
          </View>
        ) : null}

        {list.map((archive) => (
          <ArchiveRow key={archive.id} archive={archive} />
        ))}
      </ScrollView>
    </View>
  );
}

function ArchiveRow({ archive }: { archive: LegacyArchive }) {
  const { tokens } = useTheme();
  return (
    <Card padding={14} interactive onPress={() => router.push(`/archives/${archive.id}` as never)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text numberOfLines={1} style={{ ...type.cardTitle, color: tokens.text }}>
            {archive.label}
          </Text>
          <Text numberOfLines={1} style={{ ...type.cardSub, color: tokens.textDim }}>
            {periodLabel(archive)}
            {archive.hours_claimed != null ? ` · ${archive.hours_claimed.toFixed(0)} h claimed` : ''}
          </Text>
        </View>
        <Pill tone="warn" size="sm">
          UNVERIFIED
        </Pill>
      </View>
    </Card>
  );
}
