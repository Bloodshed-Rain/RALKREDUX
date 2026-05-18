import React from 'react';
import { Alert, Pressable, ScrollView, Text, View, type TextStyle } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { haptics } from '@/src/ui/haptics';
import { useDeleteDraftEntry, useEntries } from '@/src/domain/logbook/use-logbook';
import type { LogbookEntry } from '@/src/domain/logbook/types';
import { useTheme } from '@/src/ui/theme/theme-provider';
import {
  Button,
  ChipSelect,
  EmptyState,
  EntryRow,
  Field,
  IconBtn,
  Pill,
  TopBar,
} from '@/src/ui/primitives/v2';
import { IconExport, IconFilter, IconSearch, IconVoid } from '@/src/ui/icons';

type FilterKey = 'all' | 'drafts' | 'pending' | 'signed' | 'amended';

const VALID_FILTERS: ReadonlySet<FilterKey> = new Set([
  'all',
  'drafts',
  'pending',
  'signed',
  'amended',
]);

function rowStatus(entry: LogbookEntry): 'draft' | 'signed' | 'amended' | 'pending' {
  if (entry.status === 'amended') return 'amended';
  if (entry.status === 'signed') return 'signed';
  if (entry.pending_signature_id) return 'pending';
  return 'draft';
}

function matchesFilter(entry: LogbookEntry, filter: FilterKey): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'drafts':
      return entry.status === 'draft' && !entry.pending_signature_id;
    case 'pending':
      return entry.status === 'draft' && !!entry.pending_signature_id;
    case 'signed':
      return entry.status === 'signed';
    case 'amended':
      return entry.status === 'amended';
  }
}

function matchesQuery(entry: LogbookEntry, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    entry.site.toLowerCase().includes(needle) ||
    entry.client.toLowerCase().includes(needle) ||
    entry.employer.toLowerCase().includes(needle) ||
    entry.work_task.toLowerCase().includes(needle) ||
    entry.description.toLowerCase().includes(needle)
  );
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface MonthGroup {
  key: string;
  label: string;
  entries: LogbookEntry[];
}

function groupByMonth(entries: LogbookEntry[]): MonthGroup[] {
  const order: string[] = [];
  const map = new Map<string, MonthGroup>();
  for (const entry of entries) {
    const iso = entry.date_to;
    const m = /^(\d{4})-(\d{2})/.exec(iso);
    const yearMonth = m ? `${m[1]}-${m[2]}` : 'unknown';
    if (!map.has(yearMonth)) {
      const label = m ? `${MONTH_NAMES[Number(m[2]) - 1]} ${m[1]}` : 'Undated';
      const group: MonthGroup = { key: yearMonth, label, entries: [] };
      map.set(yearMonth, group);
      order.push(yearMonth);
    }
    map.get(yearMonth)!.entries.push(entry);
  }
  return order.map((k) => map.get(k)!);
}

export default function RecordsScreen() {
  const entries = useEntries();
  const deleteDraft = useDeleteDraftEntry();
  const { tokens } = useTheme();

  // The Today screen's action tiles deep-link into this screen with a
  // `?filter=pending` (or drafts / signed / amended) param so a tap on
  // "Awaiting signature" lands on a pre-filtered list, not the full one.
  const params = useLocalSearchParams<{ filter?: string | string[] }>();
  const initialFilter = React.useMemo<FilterKey>(() => {
    const raw = Array.isArray(params.filter) ? params.filter[0] : params.filter;
    return raw && VALID_FILTERS.has(raw as FilterKey) ? (raw as FilterKey) : 'all';
  }, [params.filter]);

  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState<FilterKey>(initialFilter);

  // Honour route-param changes after mount (re-tap from Today on a different tile).
  React.useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  const entriesData = entries.data ?? [];
  const counts = React.useMemo(() => {
    let drafts = 0;
    let pending = 0;
    let signed = 0;
    let amended = 0;
    for (const e of entriesData) {
      if (e.status === 'draft') {
        if (e.pending_signature_id) pending += 1;
        else drafts += 1;
      } else if (e.status === 'signed') signed += 1;
      else if (e.status === 'amended') amended += 1;
    }
    return { drafts, pending, signed, amended, all: entriesData.length };
  }, [entriesData]);

  const filteredEntries = React.useMemo(() => {
    return entriesData.filter((e) => matchesFilter(e, filter) && matchesQuery(e, query));
  }, [entriesData, filter, query]);

  const monthGroups = React.useMemo(() => groupByMonth(filteredEntries), [filteredEntries]);

  function confirmDeleteDraft(entry: LogbookEntry) {
    haptics.warning();
    Alert.alert(
      'Delete draft?',
      `Permanently remove the draft for ${entry.site || 'this draft'}. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteDraft.mutate(entry.id, {
              onError: (err) => {
                const reason =
                  err instanceof Error && err.message === 'entry_has_pending_remote_request'
                    ? 'A remote signature request is still pending. Resolve it before deleting this draft.'
                    : err instanceof Error
                      ? err.message
                      : 'Could not delete the draft.';
                Alert.alert('Could not delete draft', reason);
              },
            });
          },
        },
      ],
    );
  }

  const sectionKickerStyle: TextStyle = {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontWeight: '600',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.5,
    color: tokens.textFaint,
    textTransform: 'uppercase',
    paddingTop: 18,
    paddingBottom: 6,
    backgroundColor: tokens.bg,
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <TopBar
        title="Records"
        subtitle={
          entriesData.length === 0
            ? 'No entries yet'
            : `${counts.signed + counts.amended} sealed · ${counts.drafts} ${counts.drafts === 1 ? 'draft' : 'drafts'}`
        }
        large
        trailing={
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <IconBtn
              icon={IconExport}
              label="Export"
              size="sm"
              onPress={() => router.push('/export' as never)}
            />
            <IconBtn icon={IconFilter} label="Filter" size="sm" />
          </View>
        }
      />

      <View style={{ paddingHorizontal: 20, paddingTop: 4, gap: 12 }}>
        <Field
          value={query}
          onChangeText={setQuery}
          placeholder="Search site, client, task…"
          suffix={<IconSearch size={19} color={tokens.textDim} />}
        />
        <ChipSelect<FilterKey>
          value={filter}
          options={[
            { value: 'all', label: 'All', count: counts.all },
            { value: 'drafts', label: 'Drafts', count: counts.drafts },
            { value: 'pending', label: 'Pending', count: counts.pending },
            { value: 'signed', label: 'Signed', count: counts.signed },
            { value: 'amended', label: 'Amended', count: counts.amended },
          ]}
          onChange={setFilter}
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 132 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!entries.data ? null : filteredEntries.length === 0 ? (
          <View style={{ paddingTop: 16 }}>
            <EmptyState
              icon={IconSearch}
              title={
                query
                  ? `Nothing matches "${query}"`
                  : filter !== 'all'
                    ? `No ${filter} entries yet`
                    : 'No entries yet'
              }
              sub={
                query || filter !== 'all'
                  ? 'Adjust your search or filter to see more.'
                  : 'Tap the center "+" to log your first job.'
              }
              action={
                query || filter !== 'all' ? (
                  <Button
                    variant="outline"
                    onPress={() => {
                      setQuery('');
                      setFilter('all');
                      haptics.selection();
                    }}
                  >
                    Clear filters
                  </Button>
                ) : null
              }
            />
          </View>
        ) : (
          <RecordsList
            groups={monthGroups}
            kickerStyle={sectionKickerStyle}
            onEntryPress={(id) => router.push(`/entry/${id}` as never)}
            onDeleteDraft={confirmDeleteDraft}
          />
        )}
      </ScrollView>
    </View>
  );
}

interface RecordsListProps {
  groups: MonthGroup[];
  kickerStyle: TextStyle;
  onEntryPress: (id: string) => void;
  onDeleteDraft: (entry: LogbookEntry) => void;
}

function RecordsList({ groups, kickerStyle, onEntryPress, onDeleteDraft }: RecordsListProps) {
  const { tokens } = useTheme();

  return (
    <View style={{ paddingHorizontal: 20 }}>
      <View>
        {groups.map((group) => (
          <View key={group.key}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 14,
                paddingBottom: 6,
                backgroundColor: tokens.bg,
              }}
            >
              <Text style={kickerStyle}>{group.label}</Text>
              <Pill tone="chip" size="sm">{`${group.entries.length}`}</Pill>
            </View>
            <View style={{ gap: 8 }}>
              {group.entries.map((entry) => {
                const isDraft = entry.status === 'draft';
                return (
                  <Pressable
                    key={entry.id}
                    onLongPress={() => {
                      // Power-user shortcut — explicit IconBtn below is the
                      // discoverable affordance per the audit fix.
                      if (isDraft) onDeleteDraft(entry);
                    }}
                  >
                    <EntryRow
                      status={rowStatus(entry)}
                      date={entry.date_to}
                      site={entry.site}
                      task={entry.work_task}
                      hours={entry.work_hours}
                      chainHash={entry.id}
                      onPress={() => onEntryPress(entry.id)}
                      action={
                        isDraft ? (
                          <IconBtn
                            icon={IconVoid}
                            label="Delete draft"
                            size="sm"
                            tone="danger"
                            onPress={() => onDeleteDraft(entry)}
                          />
                        ) : null
                      }
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

