import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SectionList,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { GearCategory, GearItemDetail } from '@/src/domain/gear/types';
import { useCreateGearItem, useGearItems, useGearSummary } from '@/src/domain/gear/use-gear';
import { DUE_SOON_DAYS } from '@/src/domain/gear/gear-service';
import { groupGearByStatus } from '@/src/domain/gear/gear-derivations';
import { consumeGearCatalogPick } from '@/src/storage/gear-catalog-pick';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import {
  Button,
  Card,
  ChipSelect,
  DateField,
  Field,
  GearRow,
  IconBtn,
  SectionH,
  TopBar,
} from '@/src/ui/primitives/v2';
import { IconPlus } from '@/src/ui/icons';
import { haptics } from '@/src/ui/haptics';
import { Reveal } from '@/src/ui/animation/reveal';

type CategoryFilter = 'all' | GearCategory;

const CATEGORY_FILTERS: Array<{ value: CategoryFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'harness', label: 'Harness' },
  { value: 'helmet', label: 'Helmet' },
  { value: 'rope', label: 'Rope' },
  { value: 'descender', label: 'Descender' },
  { value: 'ascender', label: 'Ascender' },
  { value: 'carabiner', label: 'Carabiner' },
  { value: 'lanyard', label: 'Lanyard' },
  { value: 'sling', label: 'Sling' },
  { value: 'pulley', label: 'Pulley' },
  { value: 'other', label: 'Other' },
];

const CREATE_CATEGORIES: Array<{ value: GearCategory; label: string }> = CATEGORY_FILTERS.slice(1)
  .filter((c) => c.value !== 'all')
  .map((c) => ({ value: c.value as GearCategory, label: c.label }));

const MS_PER_DAY = 86_400_000;

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function parseLocalDate(iso: string | null | undefined): number | null {
  if (!iso) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(iso)) {
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).getTime();
  }
  const ts = Date.parse(iso);
  return Number.isFinite(ts) ? ts : null;
}

interface CycleInfo {
  days: number | null;
  progress: number;
}

function computeCycle(detail: GearItemDetail, today: Date): CycleInfo {
  const nextDue = parseLocalDate(detail.item.next_inspection_due);
  if (nextDue == null) return { days: null, progress: 0 };
  const lastInspection =
    parseLocalDate(detail.latest_inspection?.inspected_on) ?? parseLocalDate(detail.item.created_at);
  const todayStart = startOfLocalDay(today);
  const dueDays = Math.round((nextDue - todayStart) / MS_PER_DAY);
  if (lastInspection == null) {
    // No anchor — show 0 progress until first inspection lands.
    return { days: dueDays, progress: dueDays < 0 ? 1 : 0 };
  }
  if (nextDue <= lastInspection) {
    return { days: dueDays, progress: 1 };
  }
  if (dueDays < 0) return { days: dueDays, progress: 1 };
  const cycle = nextDue - lastInspection;
  const elapsed = todayStart - lastInspection;
  return { days: dueDays, progress: Math.max(0, Math.min(1, elapsed / cycle)) };
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function shortDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return `${MONTH_ABBR[Number(m[2]) - 1]} ${Number(m[3])}`;
}

function lastResultLabel(insp: GearItemDetail['latest_inspection']): string | null {
  if (!insp) return null;
  const word = insp.result === 'pass' ? 'Passed' : insp.result === 'fail' ? 'Failed' : 'Concerns';
  const when = shortDate(insp.inspected_on);
  return when ? `${word} ${when}` : word;
}

// Identity + last-result line for a gear row, e.g. "Petzl · A12 · Passed Apr 3".
function gearRowSub(detail: GearItemDetail): string {
  const parts = [
    detail.item.manufacturer,
    detail.item.serial_number,
    lastResultLabel(detail.latest_inspection),
  ].filter((p): p is string => !!p && p.length > 0);
  return parts.length > 0 ? parts.join(' · ') : detail.item.category;
}

export default function GearScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const gearItems = useGearItems();
  const summary = useGearSummary();
  const createGearItem = useCreateGearItem();

  const [filter, setFilter] = React.useState<CategoryFilter>('all');
  const [showAdd, setShowAdd] = React.useState(false);
  const [newCategory, setNewCategory] = React.useState<GearCategory>('harness');
  const [newName, setNewName] = React.useState('');
  const [newSerial, setNewSerial] = React.useState('');
  const [newNextDue, setNewNextDue] = React.useState('');
  // When the catalog screen sends back a pick, we hold onto the structured
  // manufacturer/model alongside the combined `newName` so the resulting
  // gear row gets all three fields populated (not just a concatenated
  // display string).
  const [pickedManufacturer, setPickedManufacturer] = React.useState<string | null>(null);
  const [pickedModel, setPickedModel] = React.useState<string | null>(null);

  // Consume a catalog pick on focus — `useFocusEffect` fires whenever
  // navigation lands on this tab, including after `router.back()` from
  // `/gear/catalog`. The handoff helper deletes the slot as it reads so
  // a re-focus without a fresh pick is a no-op.
  useFocusEffect(
    React.useCallback(() => {
      void (async () => {
        const pick = await consumeGearCatalogPick();
        if (!pick) return;
        setNewName(`${pick.manufacturer} ${pick.model}`);
        setNewCategory(pick.category);
        setPickedManufacturer(pick.manufacturer);
        setPickedModel(pick.model);
        setShowAdd(true);
        haptics.selection();
      })();
    }, []),
  );

  const today = React.useMemo(() => new Date(), []);
  const allItems = gearItems.data ?? [];
  const filteredItems =
    filter === 'all' ? allItems : allItems.filter(({ item }) => item.category === filter);
  const sections = groupGearByStatus(filteredItems);

  const overdueItems = allItems.filter(({ status }) => status === 'overdue');
  const dueSoonItems = allItems.filter(({ status }) => status === 'due_soon');
  const totalActive = summary.data?.activeItems ?? 0;

  async function addGearItem() {
    if (newName.trim().length === 0) return;
    createGearItem.mutate(
      {
        name: newName.trim(),
        category: newCategory,
        manufacturer: pickedManufacturer,
        model: pickedModel,
        serial_number: newSerial.trim() || null,
        next_inspection_due: newNextDue.trim() || null,
      },
      {
        onSuccess: () => {
          haptics.success();
          setNewName('');
          setNewSerial('');
          setNewNextDue('');
          setPickedManufacturer(null);
          setPickedModel(null);
          setShowAdd(false);
        },
        onError: (err) => {
          haptics.error();
          Alert.alert('Could not add gear', err instanceof Error ? err.message : String(err));
        },
      },
    );
  }

  const subLine = `${totalActive} active · ${overdueItems.length} overdue · ${dueSoonItems.length} due ≤${DUE_SOON_DAYS}d`;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: tokens.bg }}
    >
      <TopBar
        title="Gear"
        subtitle={subLine}
        large
        trailing={
          <IconBtn
            icon={IconPlus}
            label={showAdd ? 'Close add gear' : 'Add gear'}
            size="md"
            onPress={() => setShowAdd((v) => !v)}
          />
        }
      />

      <SectionList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 132 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        sections={sections}
        keyExtractor={(detail) => detail.item.id}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderSectionHeader={({ section }) => (
          <SectionH
            kicker={section.label}
            title={`${section.data.length} ${section.data.length === 1 ? 'item' : 'items'}`}
          />
        )}
        renderSectionFooter={() => <View style={{ height: 16 }} />}
        ListHeaderComponent={
          <>
            {showAdd ? (
              <View style={{ paddingHorizontal: 20, paddingTop: 4, gap: 10, paddingBottom: 14 }}>
                <Card padding={14}>
                  <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 10 }}>
                    ADD GEAR
                  </Text>
                  <View style={{ gap: 10 }}>
                    <Button
                      variant="outline"
                      full
                      onPress={() => router.push('/gear/catalog' as never)}
                    >
                      {pickedManufacturer
                        ? `From catalog · ${pickedManufacturer}`
                        : 'Browse catalog'}
                    </Button>
                    <Field
                      label="Name"
                      value={newName}
                      onChangeText={(v) => {
                        setNewName(v);
                        if (pickedManufacturer || pickedModel) {
                          setPickedManufacturer(null);
                          setPickedModel(null);
                        }
                      }}
                      placeholder="Petzl Avao Bod"
                      autoCapitalize="words"
                    />
                    <View>
                      <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 6 }}>
                        CATEGORY
                      </Text>
                      <ChipSelect<GearCategory>
                        value={newCategory}
                        options={CREATE_CATEGORIES}
                        onChange={setNewCategory}
                      />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Field
                          label="Serial #"
                          value={newSerial}
                          onChangeText={setNewSerial}
                          placeholder="Optional"
                          autoCapitalize="characters"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <DateField
                          label="Next inspection"
                          value={newNextDue || null}
                          onChange={(iso) => setNewNextDue(iso ?? '')}
                          clearable
                        />
                      </View>
                    </View>
                    <Button
                      variant="primary"
                      full
                      onPress={addGearItem}
                      disabled={newName.trim().length === 0 || createGearItem.isPending}
                    >
                      {createGearItem.isPending ? 'Adding…' : 'Add gear'}
                    </Button>
                  </View>
                </Card>
              </View>
            ) : null}

            <View style={{ paddingHorizontal: 20, paddingTop: showAdd ? 0 : 14 }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6 }}
              >
                <ChipSelect<CategoryFilter>
                  value={filter}
                  options={CATEGORY_FILTERS}
                  onChange={setFilter}
                />
              </ScrollView>
            </View>

            <View style={{ height: 4 }} />
          </>
        }
        ListEmptyComponent={
          <View style={{ paddingHorizontal: 20 }}>
            <Card padding={20}>
              {gearItems.isLoading ? (
                <Text style={{ ...type.cardTitle, color: tokens.textDim, textAlign: 'center' }}>
                  Loading gear…
                </Text>
              ) : gearItems.isError ? (
                <>
                  <Text style={{ ...type.cardTitle, color: tokens.text, textAlign: 'center' }}>
                    Couldn&apos;t load gear
                  </Text>
                  <Text
                    style={{ ...type.cardSub, color: tokens.textDim, textAlign: 'center', marginTop: 4 }}
                  >
                    Check your connection and try again.
                  </Text>
                  <View style={{ height: 12 }} />
                  <Button variant="primary" full onPress={() => gearItems.refetch()}>
                    Retry
                  </Button>
                </>
              ) : (
                <>
                  <Text style={{ ...type.cardTitle, color: tokens.text, textAlign: 'center' }}>
                    No gear in this category
                  </Text>
                  <Text
                    style={{ ...type.cardSub, color: tokens.textDim, textAlign: 'center', marginTop: 4 }}
                  >
                    Tap the + in the top bar to add an item.
                  </Text>
                </>
              )}
            </Card>
          </View>
        }
        renderItem={({ item: detail, index }) => {
          const cycle = computeCycle(detail, today);
          // dedupeKey = item id so recycling the virtualized row never replays
          // its entrance. The row's horizontal padding rides on the Reveal.
          return (
            <Reveal index={index} dedupeKey={detail.item.id} style={{ paddingHorizontal: 20 }}>
              <GearRow
                name={detail.item.name}
                sub={gearRowSub(detail)}
                days={cycle.days}
                status={detail.status}
                onPress={() => router.push(`/gear/${detail.item.id}` as never)}
              />
            </Reveal>
          );
        }}
      />
    </KeyboardAvoidingView>
  );
}

