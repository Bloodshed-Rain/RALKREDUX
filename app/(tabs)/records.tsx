import React from 'react';
import { Alert, Pressable, RefreshControl, Share, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react-native';
import {
  useDeleteDraftEntry,
  useEntries,
  useExportLogbook,
  useExportLogbookCsv,
} from '@/src/domain/logbook/use-logbook';
import { useProfile } from '@/src/domain/profile/use-profile';
import {
  computeRangeKpis,
  filterEntriesInRange,
  getEntryListStatus,
  RANGE_OPTIONS,
  shortStatus,
  type EntryListStatus,
  type RangeKey,
} from '@/src/domain/logbook/records-derivations';
import { AnimatedCounter, DocBand, RowDoc, Screen, SwipeRow } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { PrefKeys, readPref, writePref } from '@/src/storage/local-prefs';

function formatRowDate(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [, month, day] = iso.split('-');
    return `${month}·${day}`;
  }
  return iso.slice(5, 10).replace('-', '·');
}

function statusTone(status: EntryListStatus, palette: { green: string; yellowDeep: string; ink2: string; ink3: string }): string {
  switch (status) {
    case 'SIGNED':
      return palette.green;
    case 'PENDING':
      return palette.yellowDeep;
    case 'AMENDED':
      return palette.ink2;
    case 'DRAFT':
      return palette.ink3;
  }
}

export default function RecordsScreen() {
  const queryClient = useQueryClient();
  const [range, setRange] = React.useState<RangeKey>('30D');
  const [refreshing, setRefreshing] = React.useState(false);
  const [openSwipeId, setOpenSwipeId] = React.useState<string | null>(null);

  // Last-used range persists across launches. A manual tap wins over a slow
  // load so the stored value can never clobber a fresh selection.
  const rangeTouched = React.useRef(false);
  React.useEffect(() => {
    readPref<RangeKey>(PrefKeys.recordsRange, '30D').then((stored) => {
      if (rangeTouched.current) return;
      if (RANGE_OPTIONS.some((o) => o.key === stored)) setRange(stored);
    });
  }, []);

  const selectRange = React.useCallback((key: RangeKey) => {
    rangeTouched.current = true;
    setRange(key);
    writePref(PrefKeys.recordsRange, key);
  }, []);
  const entries = useEntries();
  const profile = useProfile();
  const exportLogbook = useExportLogbook();
  const exportLogbookCsv = useExportLogbookCsv();
  const deleteDraft = useDeleteDraftEntry();
  const { tidewater, typography, spacing } = useTheme();

  function confirmDeleteDraft(id: string, label: string) {
    Alert.alert(
      'Delete draft?',
      `Permanently remove the draft for ${label}. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setOpenSwipeId(null) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setOpenSwipeId(null);
            deleteDraft.mutate(id, {
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

  const today = new Date();
  const entriesData = entries.data ?? [];
  const inRange = filterEntriesInRange(entriesData, today, range);
  const kpis = computeRangeKpis(inRange);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['entries'] });
    setRefreshing(false);
  }, [queryClient]);

  async function shareJson() {
    const bundle = await exportLogbook.mutateAsync();
    await Share.share({ title: 'RALB logbook export', message: JSON.stringify(bundle, null, 2) });
  }

  async function shareCsv() {
    const csv = await exportLogbookCsv.mutateAsync();
    await Share.share({ title: 'RALB logbook CSV', message: csv });
  }

  const operatorTag = profile.data?.full_name?.split(' ').filter(Boolean).slice(-1)[0]?.toUpperCase() ?? '';

  return (
    <Screen
      padded={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tidewater.ink} />}
    >
      <DocBand
        variant="top"
        formId="CH.2 · LOG"
        rev={`LOG-${today.getFullYear()}`}
        effective={`${entriesData.length} ON FILE`}
        rightLabel={operatorTag}
      />

      <View style={{ paddingHorizontal: spacing.base, gap: spacing.md }}>
        {/* Range chip group */}
        <View style={{ flexDirection: 'row', borderWidth: 1.5, borderColor: tidewater.hair }}>
          {RANGE_OPTIONS.map((opt, i) => {
            const selected = opt.key === range;
            return (
              <Pressable
                key={opt.key}
                onPress={() => selectRange(opt.key)}
                accessibilityRole="button"
                accessibilityState={selected ? { selected: true } : {}}
                style={{
                  flex: 1,
                  paddingVertical: 6,
                  backgroundColor: selected ? tidewater.ink : 'transparent',
                  borderRightWidth: i < RANGE_OPTIONS.length - 1 ? 1 : 0,
                  borderRightColor: tidewater.hairSoft,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    ...typography.displaySm,
                    color: selected ? tidewater.paper : tidewater.ink2,
                    letterSpacing: 1.5,
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* KPI row + ADD */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            borderBottomWidth: 1.5,
            borderBottomColor: tidewater.hair,
            paddingBottom: spacing.sm,
            gap: spacing.md,
          }}
        >
          <Kpi value={kpis.totalHours.toFixed(1)} unit="HR" label="SHOWN" />
          <Kpi value={String(kpis.daysOnRope).padStart(2, '0')} unit="DAYS" label="ON ROPE" />
          <Pressable
            onPress={() => router.push('/entry/new')}
            accessibilityRole="button"
            accessibilityLabel="Add new entry"
            style={{
              borderWidth: 1.5,
              borderColor: tidewater.ink,
              backgroundColor: tidewater.ink,
              paddingHorizontal: spacing.sm,
              paddingVertical: 6,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              alignSelf: 'flex-end',
            }}
          >
            <Plus color={tidewater.paper} size={14} strokeWidth={2.4} />
            <Text style={{ ...typography.displaySm, color: tidewater.paper, letterSpacing: 1.5 }}>
              ADD
            </Text>
          </Pressable>
        </View>

        {/* Table */}
        <View>
          <RowDoc
            head
            cols={[
              { value: 'DATE', width: 56, mono: true },
              { value: 'SITE · CLIENT', flex: 1 },
              { value: 'HR', width: 44, align: 'right', mono: true },
              { value: 'STS', width: 44, align: 'right', mono: true },
            ]}
          />
          {inRange.length === 0 ? (
            <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
              <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.5 }}>
                {entriesData.length === 0 ? 'NO ENTRIES ON FILE' : 'NO ENTRIES IN RANGE'}
              </Text>
            </View>
          ) : (
            inRange.map((entry) => {
              const status = getEntryListStatus(entry);
              const tone = statusTone(status, tidewater);
              const isDeletableDraft = status === 'DRAFT';
              const row = (
                <Pressable
                  onPress={() => router.push(`/entry/${entry.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open entry ${entry.site} on ${entry.date_to}`}
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, backgroundColor: tidewater.paper })}
                >
                  <RowDoc
                    cols={[
                      {
                        value: formatRowDate(entry.date_to),
                        width: 56,
                        mono: true,
                        size: 11,
                        tone: tidewater.ink3,
                      },
                      {
                        value: (
                          <View style={{ width: '100%' }}>
                            <Text
                              style={{
                                ...typography.body,
                                color: tidewater.ink,
                                fontWeight: '600',
                              }}
                              numberOfLines={1}
                            >
                              {entry.site}
                            </Text>
                            <Text
                              style={{
                                ...typography.monoSm,
                                color: tidewater.ink3,
                              }}
                              numberOfLines={1}
                            >
                              {entry.client.toUpperCase()}
                            </Text>
                          </View>
                        ),
                        flex: 1,
                      },
                      {
                        value: entry.work_hours.toFixed(1),
                        width: 44,
                        align: 'right',
                        mono: true,
                        bold: true,
                        size: 14,
                      },
                      {
                        value: (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text
                              style={{
                                ...typography.monoSm,
                                color: tone,
                                fontWeight: '600',
                                letterSpacing: 1.5,
                              }}
                            >
                              {shortStatus(status)}
                            </Text>
                            {isDeletableDraft ? (
                              <Text
                                style={{
                                  ...typography.monoSm,
                                  color: tidewater.ink3,
                                  letterSpacing: 1.5,
                                }}
                              >
                                ‹
                              </Text>
                            ) : null}
                          </View>
                        ),
                        width: 56,
                        align: 'right',
                      },
                    ]}
                  />
                </Pressable>
              );

              if (!isDeletableDraft) {
                return <View key={entry.id}>{row}</View>;
              }

              return (
                <SwipeRow
                  key={entry.id}
                  open={openSwipeId === entry.id}
                  onToggle={(open) => setOpenSwipeId(open ? entry.id : null)}
                  onDelete={() => confirmDeleteDraft(entry.id, entry.site || 'this draft')}
                >
                  {row}
                </SwipeRow>
              );
            })
          )}
        </View>

        {/* Export footer */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.sm,
            alignItems: 'center',
            marginTop: spacing.sm,
          }}
        >
          <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.5 }}>
            EXPORT:
          </Text>
          <Pressable onPress={shareJson} hitSlop={6}>
            <Text style={{ ...typography.displaySm, color: tidewater.accent, letterSpacing: 1.5 }}>
              JSON
            </Text>
          </Pressable>
          <Text style={{ ...typography.monoSm, color: tidewater.ink3 }}>·</Text>
          <Pressable onPress={shareCsv} hitSlop={6}>
            <Text style={{ ...typography.displaySm, color: tidewater.accent, letterSpacing: 1.5 }}>
              CSV
            </Text>
          </Pressable>
          <Text style={{ ...typography.monoSm, color: tidewater.ink3 }}>·</Text>
          <Text
            style={{
              ...typography.displaySm,
              color: tidewater.ink3,
              letterSpacing: 1.5,
              flexShrink: 1,
            }}
          >
            PDF (per entry, see detail)
          </Text>
        </View>
      </View>

      <View style={{ marginTop: spacing.lg }}>
        <DocBand
          variant="footer"
          text={`SHOWING ${kpis.entryCount} OF ${entriesData.length}`}
          page={`RANGE ${range}`}
        />
      </View>
    </Screen>
  );
}

function Kpi({ value, unit, label }: { value: string; unit: string; label: string }) {
  const { tidewater, typography } = useTheme();
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4 }}>
        <AnimatedCounter
          cacheKey={`records-kpi-${label}`}
          text={value}
          fontFamily="Archivo_900Black"
          fontSize={26}
          fontWeight="900"
          letterSpacing={-0.4}
          color={tidewater.ink}
          height={30}
          width={19}
        />
        <Text
          style={{
            ...typography.monoSm,
            color: tidewater.ink3,
            letterSpacing: 1.2,
            marginTop: 14,
          }}
        >
          {unit}
        </Text>
      </View>
      <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.5 }}>
        {label}
      </Text>
    </View>
  );
}
