import React from 'react';
import { Alert, Pressable, ScrollView, Share, Text, View, type TextStyle } from 'react-native';
import { router } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { buildLogbookExportFileName, buildLogbookPdfHtml } from '@/src/domain/logbook/export';
import { haptics } from '@/src/ui/haptics';
import {
  useDeleteDraftEntry,
  useEntries,
  useExportLogbook,
  useExportLogbookCsv,
} from '@/src/domain/logbook/use-logbook';
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
import { IconExport, IconFilter, IconSearch } from '@/src/ui/icons';

type FilterKey = 'all' | 'drafts' | 'signed' | 'amended';

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
      return entry.status === 'draft';
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
  const exportLogbook = useExportLogbook();
  const exportLogbookCsv = useExportLogbookCsv();
  const deleteDraft = useDeleteDraftEntry();
  const { tokens } = useTheme();

  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState<FilterKey>('all');
  const [pdfPending, setPdfPending] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);

  const entriesData = entries.data ?? [];
  const counts = React.useMemo(() => {
    let drafts = 0;
    let signed = 0;
    let amended = 0;
    for (const e of entriesData) {
      if (e.status === 'draft') drafts += 1;
      else if (e.status === 'signed') signed += 1;
      else if (e.status === 'amended') amended += 1;
    }
    return { drafts, signed, amended, all: entriesData.length };
  }, [entriesData]);

  const filteredEntries = React.useMemo(() => {
    return entriesData.filter((e) => matchesFilter(e, filter) && matchesQuery(e, query));
  }, [entriesData, filter, query]);

  const monthGroups = React.useMemo(() => groupByMonth(filteredEntries), [filteredEntries]);

  async function shareJson() {
    const bundle = await exportLogbook.mutateAsync();
    await Share.share({ title: 'RALB logbook export', message: JSON.stringify(bundle, null, 2) });
  }

  async function shareCsv() {
    const csv = await exportLogbookCsv.mutateAsync();
    await Share.share({ title: 'RALB logbook CSV', message: csv });
  }

  async function sharePdf() {
    setPdfPending(true);
    try {
      const bundle = await exportLogbook.mutateAsync();
      const { uri } = await Print.printToFileAsync({ html: buildLogbookPdfHtml(bundle) });
      const fileName = buildLogbookExportFileName(bundle, 'pdf');
      const namedUri = FileSystem.cacheDirectory ? `${FileSystem.cacheDirectory}${fileName}` : uri;
      if (namedUri !== uri) {
        await FileSystem.deleteAsync(namedUri, { idempotent: true });
        await FileSystem.copyAsync({ from: uri, to: namedUri });
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(namedUri, {
          dialogTitle: 'Share RALB audit logbook PDF',
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
        });
      } else {
        await Share.share({ title: 'RALB audit logbook PDF', message: namedUri });
      }
    } catch {
      Alert.alert('Could not build PDF', 'The audit logbook PDF could not be generated.');
    } finally {
      setPdfPending(false);
    }
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
        subtitle={`${entriesData.length} ${entriesData.length === 1 ? 'entry' : 'entries'} · sealed in the chain`}
        large
        trailing={
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <IconBtn
              icon={IconExport}
              label="Export"
              size="sm"
              onPress={() => setExportOpen((v) => !v)}
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
          suffix={<IconSearch size={16} color={tokens.textDim} />}
        />
        <ChipSelect<FilterKey>
          value={filter}
          options={[
            { value: 'all', label: 'All', count: counts.all },
            { value: 'drafts', label: 'Drafts', count: counts.drafts },
            { value: 'signed', label: 'Signed', count: counts.signed },
            { value: 'amended', label: 'Amended', count: counts.amended },
          ]}
          onChange={setFilter}
        />
        {exportOpen ? (
          <View
            style={{
              flexDirection: 'row',
              gap: 8,
              padding: 12,
              borderRadius: 12,
              backgroundColor: tokens.surface,
              borderWidth: 1,
              borderColor: tokens.lineSoft,
            }}
          >
            <Button variant="primary" full onPress={sharePdf} disabled={pdfPending}>
              {pdfPending ? 'Building PDF…' : 'PDF'}
            </Button>
            <Button variant="secondary" full onPress={shareJson}>
              JSON
            </Button>
            <Button variant="secondary" full onPress={shareCsv}>
              CSV
            </Button>
          </View>
        ) : null}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 132 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {filteredEntries.length === 0 ? (
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
            onDraftLongPress={(entry) => {
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
            }}
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
  onDraftLongPress: (entry: LogbookEntry) => void;
}

function RecordsList({ groups, kickerStyle, onEntryPress, onDraftLongPress }: RecordsListProps) {
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
              {group.entries.map((entry) => (
                <Pressable
                  key={entry.id}
                  onLongPress={() => {
                    if (entry.status === 'draft') onDraftLongPress(entry);
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
                  />
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

