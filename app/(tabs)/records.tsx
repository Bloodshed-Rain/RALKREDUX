import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  SectionList,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { haptics } from '@/src/ui/haptics';
import { useDeleteDraftEntry, useEntries } from '@/src/domain/logbook/use-logbook';
import type { LogbookEntry } from '@/src/domain/logbook/types';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { isHeliotypeFamily } from '@/src/ui/theme/themes';
import { type } from '@/src/ui/theme/type';
import {
  Button,
  ChipSelect,
  EmptyState,
  EntryRow,
  Field,
  IconBtn,
  Pill,
  SwipeableRow,
  TopBar,
} from '@/src/ui/primitives/v2';
import { IconExport, IconSearch } from '@/src/ui/icons';
import { Reveal } from '@/src/ui/animation/reveal';
import { NdtLedger } from '@/src/ui/ndt/ndt-ledger';

type RecordsTab = 'rope' | 'ndt';

// Once per app session: play a wiggle on the first deletable draft so users
// discover that draft rows can be swiped. The decision is made in an effect
// (not during render) so StrictMode / concurrent discarded renders can't
// consume the flag without the hint ever painting.
let swipeHintConsumed = false;

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

  // Two prominent tabs switch content IN PLACE: the rope-access logbook (this
  // screen's original content) and the NDT ledger (embedded inline via the
  // shared <NdtLedger/>). Default to rope. This screen stays mounted while NDT
  // detail/new routes are pushed on top, so plain local state survives the
  // round-trip — do NOT add a focus listener that resets it.
  const [tab, setTab] = React.useState<RecordsTab>('rope');

  // Honour route-param changes after mount (re-tap from Today on a different
  // tile). `?filter=` is rope-only, so a deep-link also forces the rope tab —
  // otherwise a re-tap from Today would set a pending filter silently behind the
  // NDT ledger.
  React.useEffect(() => {
    setFilter(initialFilter);
    if (initialFilter !== 'all') setTab('rope');
  }, [initialFilter]);

  function selectTab(next: RecordsTab) {
    if (next === tab) return;
    haptics.selection();
    setTab(next);
  }

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
          <IconBtn
            icon={IconExport}
            label="Export"
            size="md"
            onPress={() => router.push('/export' as never)}
          />
        }
      />

      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <RecordsTabBar value={tab} onChange={selectTab} />
      </View>

      {tab === 'rope' ? (
        <RopeAccessTab
          tokens={tokens}
          query={query}
          setQuery={setQuery}
          filter={filter}
          setFilter={setFilter}
          counts={counts}
          entries={entries}
          filteredEntries={filteredEntries}
          monthGroups={monthGroups}
          sectionKickerStyle={sectionKickerStyle}
          onDeleteDraft={confirmDeleteDraft}
        />
      ) : (
        <NdtLedger
          onOpenRecord={(id) => router.push(`/ndt/${id}` as never)}
          onNewRecord={() => router.push('/ndt/new' as never)}
          // This host's TopBar action is Export, not +New — surface the in-card
          // create affordance so a non-empty NDT ledger here isn't a dead end.
          showHeaderCreate
        />
      )}
    </View>
  );
}

// Two prominent in-place tabs, generously sized (≥44pt, width split evenly).
// Active state leans on the Heliotype stamped identity: a filled oxblood block
// with a 1.5px hard ink border and accent-ink label — unmistakable in glare.
// Inactive is a bordered "paper" tile, so the pair reads as a hard-edged
// segmented control rather than the soft pill ChipSelect it replaces.
function RecordsTabBar({
  value,
  onChange,
}: {
  value: RecordsTab;
  onChange: (next: RecordsTab) => void;
}) {
  const { theme, tokens } = useTheme();
  const isHeliotype = isHeliotypeFamily(theme.key);
  const borderWidth = isHeliotype ? 1.5 : 1;

  const options: Array<{ value: RecordsTab; label: string }> = [
    { value: 'rope', label: 'Rope Access' },
    { value: 'ndt', label: 'NDT' },
  ];

  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: 'row', gap: 8 }}
    >
      {options.map((o) => {
        const active = o.value === value;
        const tabStyle: ViewStyle = {
          flex: 1,
          minHeight: 46,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 11,
          paddingHorizontal: 12,
          borderRadius: 14,
          borderWidth,
          borderColor: active ? tokens.line : tokens.lineSoft,
          backgroundColor: active ? tokens.accent : tokens.surface,
        };
        const labelStyle: TextStyle = {
          ...type.buttonLabel,
          color: active ? tokens.accentInk : tokens.text,
        };
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={({ pressed }) => [
              tabStyle,
              pressed ? { transform: [{ scale: 0.98 }] } : null,
            ]}
          >
            <Text selectable={false} style={labelStyle} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

interface RopeAccessTabProps {
  tokens: ReturnType<typeof useTheme>['tokens'];
  query: string;
  setQuery: (q: string) => void;
  filter: FilterKey;
  setFilter: (f: FilterKey) => void;
  counts: { drafts: number; pending: number; signed: number; amended: number; all: number };
  entries: ReturnType<typeof useEntries>;
  filteredEntries: LogbookEntry[];
  monthGroups: MonthGroup[];
  sectionKickerStyle: TextStyle;
  onDeleteDraft: (entry: LogbookEntry) => void;
}

// The rope-access logbook tab: search Field + filter ChipSelect (in a
// non-scrolling header View) over the virtualized SectionList. The search/filter
// chips live here so they ONLY render on the rope tab — the NDT ledger has its
// own summary header and must not show rope-access filters.
function RopeAccessTab({
  tokens,
  query,
  setQuery,
  filter,
  setFilter,
  counts,
  entries,
  filteredEntries,
  monthGroups,
  sectionKickerStyle,
  onDeleteDraft,
}: RopeAccessTabProps) {
  return (
    <>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 12 }}>
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

      {/*
        CRITICAL FIX: Removed ScrollView wrapper around the list.
        ScrollView disables virtualization for SectionList/FlatList children,
        which would crash the app with an OOM on large logbooks.
      */}
      {entries.isError ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 132 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ paddingTop: 16 }}>
            <EmptyState
              icon={IconSearch}
              title="Couldn’t load your records"
              sub="This is a read error, not an empty logbook. Try again."
              action={
                <Button variant="outline" onPress={() => void entries.refetch()}>
                  Try again
                </Button>
              }
            />
          </View>
        </ScrollView>
      ) : !entries.data ? null : filteredEntries.length === 0 ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 132 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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
        </ScrollView>
      ) : (
        <RecordsList
          groups={monthGroups}
          kickerStyle={sectionKickerStyle}
          onEntryPress={(id) => router.push(`/entry/${id}` as never)}
          onDeleteDraft={onDeleteDraft}
        />
      )}
    </>
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

  const sections = React.useMemo(() => {
    return groups.map((g) => ({ ...g, data: g.entries }));
  }, [groups]);

  // Decide the one hint target once per session, off the render path.
  const [hintEntryId, setHintEntryId] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (swipeHintConsumed) return;
    const firstDraft = sections.flatMap((s) => s.data).find((e) => e.status === 'draft');
    if (firstDraft) {
      swipeHintConsumed = true;
      setHintEntryId(firstDraft.id);
    }
  }, [sections]);

  return (
    <SectionList
      style={{ flex: 1, paddingHorizontal: 20 }}
      contentContainerStyle={{ paddingBottom: 132 }}
      sections={sections}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled={false}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      renderSectionHeader={({ section }) => (
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
          <Text style={kickerStyle}>{section.label}</Text>
          <Pill tone="chip" size="sm">{`${section.data.length}`}</Pill>
        </View>
      )}
      renderItem={({ item: entry, index }) => {
        const isDraft = entry.status === 'draft';
        const row = (
          <EntryRow
            status={rowStatus(entry)}
            date={entry.date_to}
            site={entry.site}
            task={entry.work_task}
            hours={entry.work_hours}
            onPress={() => onEntryPress(entry.id)}
            onLongPress={isDraft ? () => onDeleteDraft(entry) : undefined}
          />
        );
        const content = isDraft ? (
          <SwipeableRow
            onDelete={() => onDeleteDraft(entry)}
            hint={entry.id === hintEntryId}
          >
            {row}
          </SwipeableRow>
        ) : (
          row
        );
        // dedupeKey = entry id so the entrance plays once per row on first
        // appearance and never re-fires as the virtualized list recycles it.
        return (
          <Reveal index={index} dedupeKey={entry.id}>
            {content}
          </Reveal>
        );
      }}
    />
  );
}

