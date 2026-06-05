import React from 'react';
import { Image, Pressable, ScrollView, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import { Button, Card, EmptyState, IconBtn, TopBar } from '@/src/ui/primitives/v2';
import { IconArrowLeft, IconCamera } from '@/src/ui/icons';
import { useAllAttachments } from '@/src/domain/logbook/use-logbook';
import type { EntryAttachmentWithEntry } from '@/src/domain/logbook/types';
import { formatDateOrDash } from '@/src/domain/date-format';

const MONTH_LABEL_FMT = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });

interface MonthGroup {
  key: string;
  label: string;
  items: EntryAttachmentWithEntry[];
}

function groupByMonth(items: EntryAttachmentWithEntry[]): MonthGroup[] {
  const buckets = new Map<string, EntryAttachmentWithEntry[]>();
  for (const item of items) {
    const date = new Date(item.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const list = buckets.get(key);
    if (list) list.push(item);
    else buckets.set(key, [item]);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([key, items]) => {
      const sample = new Date(items[0].created_at);
      return { key, label: MONTH_LABEL_FMT.format(sample).toUpperCase(), items };
    });
}

function isImageMime(mime: string | null, uri: string): boolean {
  if (mime && mime.startsWith('image/')) return true;
  return /\.(jpg|jpeg|png|gif|webp|heic|heif)(\?|$)/i.test(uri);
}

export default function AttachmentsScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const all = useAllAttachments();

  const groups = React.useMemo(
    () => (all.data ? groupByMonth(all.data) : []),
    [all.data],
  );

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <TopBar
        title="Attachments"
        subtitle={
          all.data
            ? `${all.data.length} ${all.data.length === 1 ? 'file' : 'files'} across the ledger`
            : 'Loading…'
        }
        leading={
          <IconBtn icon={IconArrowLeft} label="Back" size="md" onPress={() => router.back()} />
        }
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 28 + insets.bottom, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {all.isError ? (
          // A read FAILURE must not masquerade as an empty ledger — surface it
          // explicitly with a retry, mirroring entry/gear detail. Without this the
          // "No attachments yet" empty-state below renders over a failed fetch.
          <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 16 }}>
            <Text style={{ ...type.heroCardTitle, color: tokens.text }}>
              Couldn&apos;t load attachments
            </Text>
            <Text style={{ ...type.body, color: tokens.textDim }}>
              Something went wrong reading the evidence index. Check your connection and try again.
            </Text>
            <Button variant="primary" onPress={() => all.refetch()}>
              Retry
            </Button>
          </View>
        ) : groups.length === 0 && all.isFetched ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
            <EmptyState
              icon={IconCamera}
              title="No attachments yet"
              sub="Photos and files added to entries will show up here. Attach evidence from an entry's detail screen."
            />
          </View>
        ) : null}
        {groups.map((group) => (
          <MonthSection key={group.key} group={group} />
        ))}
      </ScrollView>
    </View>
  );
}

function MonthSection({ group }: { group: MonthGroup }) {
  const { tokens } = useTheme();
  const kickerStyle: TextStyle = {
    ...type.monoKicker,
    color: tokens.textFaint,
    marginBottom: 8,
  };
  return (
    <View style={{ paddingHorizontal: 20 }}>
      <Text style={kickerStyle}>{group.label}</Text>
      <View style={{ gap: 8 }}>
        {group.items.map((item) => (
          <AttachmentRow key={item.id} item={item} />
        ))}
      </View>
    </View>
  );
}

function AttachmentRow({ item }: { item: EntryAttachmentWithEntry }) {
  const { tokens } = useTheme();
  const isImage = isImageMime(item.mime_type, item.uri);
  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  };
  return (
    <Card padding={0} interactive onPress={() => router.push(`/entry/${item.entry_id}` as never)}>
      <View style={containerStyle}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            backgroundColor: tokens.surface2,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isImage ? (
            <Image source={{ uri: item.uri }} style={{ width: 52, height: 52 }} />
          ) : (
            <IconCamera size={22} color={tokens.textFaint} />
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{
              ...type.cardTitle,
              color: tokens.text,
              fontSize: 14,
              lineHeight: 18,
            }}
          >
            {item.label}
          </Text>
          <Text numberOfLines={1} style={{ ...type.cardSub, color: tokens.textDim }}>
            {item.entry_site || 'Untitled entry'} · {formatDateOrDash(item.entry_date)}
          </Text>
        </View>
      </View>
    </Card>
  );
}
