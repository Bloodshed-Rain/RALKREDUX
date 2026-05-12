import React from 'react';
import { ClipboardCheck, Plus, Save, XCircle } from 'lucide-react-native';
import { Pressable, Text, TextInput, View } from 'react-native';
import { formatDate } from '@/src/domain/date-format';
import { todayLocalIsoDate } from '@/src/domain/date-utils';
import type { GearCatalogEntry, GearCategory, GearInspectionResult, GearStatus } from '@/src/domain/gear/types';
import {
  useCreateGearItem,
  useGearCatalogSearch,
  useGearItems,
  useGearSummary,
  useRecordGearInspection,
} from '@/src/domain/gear/use-gear';
import {
  AnimatedCounter,
  AnimatedStamp,
  DateField,
  DocActionButton,
  DocBand,
  Field,
  Screen,
  SectionH,
} from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

type GearFilter = 'all' | GearStatus;

const CATEGORIES: Array<{ value: GearCategory; label: string }> = [
  { value: 'harness', label: 'Harness' },
  { value: 'helmet', label: 'Helmet' },
  { value: 'rope', label: 'Rope' },
  { value: 'lanyard', label: 'Lanyard' },
  { value: 'sling', label: 'Sling' },
  { value: 'descender', label: 'Descender' },
  { value: 'ascender', label: 'Ascender' },
  { value: 'carabiner', label: 'Carabiner' },
  { value: 'pulley', label: 'Pulley' },
  { value: 'other', label: 'Other' },
];

const STATUS_FILTERS: Array<{ value: GearFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'current', label: 'Current' },
  { value: 'due_soon', label: 'Due' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'unscheduled', label: 'No date' },
  { value: 'retired', label: 'Retired' },
];

function statusLabel(status: GearStatus): string {
  switch (status) {
    case 'due_soon':
      return 'DUE SOON';
    case 'overdue':
      return 'OVERDUE';
    case 'unscheduled':
      return 'NO DATE';
    case 'retired':
      return 'RETIRED';
    default:
      return 'CURRENT';
  }
}

function statusStampTone(status: GearStatus): 'green' | 'yellow' | 'red' | 'mute' {
  if (status === 'overdue') return 'red';
  if (status === 'retired') return 'mute';
  if (status === 'due_soon' || status === 'unscheduled') return 'yellow';
  return 'green';
}

function resultLabel(result: GearInspectionResult): string {
  switch (result) {
    case 'pass_with_concerns':
      return 'Concerns';
    case 'fail':
      return 'Fail';
    default:
      return 'Pass';
  }
}

function splitMakeModel(value: string): { manufacturer: string | null; model: string | null } {
  const trimmed = value.trim();
  if (!trimmed) return { manufacturer: null, model: null };
  const splitAt = trimmed.indexOf(' ');
  if (splitAt < 1) return { manufacturer: trimmed, model: null };
  return {
    manufacturer: trimmed.slice(0, splitAt),
    model: trimmed.slice(splitAt + 1),
  };
}

function categoryLabel(value: GearCategory): string {
  return CATEGORIES.find((item) => item.value === value)?.label ?? value;
}

export default function GearScreen() {
  const { spacing, typography, tidewater, hairlines } = useTheme();
  const gearItems = useGearItems();
  const summary = useGearSummary();
  const createGearItem = useCreateGearItem();
  const recordInspection = useRecordGearInspection();
  const [category, setCategory] = React.useState<GearCategory>('harness');
  const [makeModel, setMakeModel] = React.useState('');
  const [selectedCatalogEntry, setSelectedCatalogEntry] = React.useState<GearCatalogEntry | null>(null);
  const [customName, setCustomName] = React.useState('');
  const [serialNumber, setSerialNumber] = React.useState('');
  const [nextInspectionDue, setNextInspectionDue] = React.useState('');
  const [selectedGearId, setSelectedGearId] = React.useState<string | null>(null);
  const [inspectionResult, setInspectionResult] = React.useState<GearInspectionResult>('pass');
  const [inspectedOn, setInspectedOn] = React.useState(todayLocalIsoDate());
  const [inspectionNotes, setInspectionNotes] = React.useState('');
  const [inspectionNextDue, setInspectionNextDue] = React.useState('');
  const [showAddGear, setShowAddGear] = React.useState(false);
  const [showInspection, setShowInspection] = React.useState(false);
  const [filter, setFilter] = React.useState<GearFilter>('all');

  const allItems = gearItems.data ?? [];
  const activeItems = React.useMemo(
    () => allItems.filter(({ status }) => status !== 'retired'),
    [allItems],
  );
  const filteredItems = filter === 'all' ? allItems : allItems.filter(({ status }) => status === filter);
  const groupedItems = CATEGORIES
    .map((categoryItem) => ({
      category: categoryItem.value,
      label: categoryItem.label,
      items: filteredItems.filter(({ item }) => item.category === categoryItem.value),
    }))
    .filter((group) => group.items.length > 0);
  const catalogSearch = useGearCatalogSearch(makeModel, category);
  const showCatalogSuggestions = !selectedCatalogEntry && Boolean(catalogSearch.data?.length);
  const canCreate = makeModel.trim().length > 0;
  const canInspect = Boolean(selectedGearId) && inspectedOn.trim().length > 0;

  const activeCount = summary.data?.activeItems ?? 0;
  const overdueCount = summary.data?.overdueItems ?? 0;
  const dueSoonCount = summary.data?.dueSoonItems ?? 0;
  const retiredCount = summary.data?.retiredItems ?? 0;
  const dueCount = overdueCount + dueSoonCount;

  React.useEffect(() => {
    if (!selectedGearId && activeItems[0]) {
      setSelectedGearId(activeItems[0].item.id);
    }
  }, [activeItems, selectedGearId]);

  function addGearItem() {
    if (!canCreate) return;
    const freeformParts = splitMakeModel(makeModel);
    const manufacturer = selectedCatalogEntry?.manufacturer ?? freeformParts.manufacturer;
    const model = selectedCatalogEntry?.model ?? freeformParts.model;
    const resolvedName = customName.trim() || [manufacturer, model].filter(Boolean).join(' ') || makeModel.trim();

    createGearItem.mutate(
      {
        name: resolvedName,
        category,
        manufacturer,
        model,
        serial_number: serialNumber || null,
        next_inspection_due: nextInspectionDue || null,
      },
      {
        onSuccess: (item) => {
          setMakeModel('');
          setSelectedCatalogEntry(null);
          setCustomName('');
          setSerialNumber('');
          setNextInspectionDue('');
          setSelectedGearId(item.id);
          setShowAddGear(false);
          setShowInspection(true);
        },
      },
    );
  }

  function logInspection() {
    if (!canInspect || !selectedGearId) return;
    recordInspection.mutate(
      {
        gear_id: selectedGearId,
        result: inspectionResult,
        inspected_on: inspectedOn,
        notes: inspectionNotes || null,
        next_inspection_due: inspectionNextDue || null,
      },
      {
        onSuccess: () => {
          setInspectionResult('pass');
          setInspectionNotes('');
          setInspectionNextDue('');
          setInspectedOn(todayLocalIsoDate());
          setShowInspection(false);
        },
      },
    );
  }

  return (
    <Screen padded={false} safeTop>
      <DocBand
        variant="top"
        formId="CH.4 - GEAR INVENTORY"
        rev={`KIT ${String(activeCount).padStart(2, '0')}`}
        effective={`DUE ${String(dueCount).padStart(2, '0')}`}
        rightLabel={overdueCount > 0 ? 'OVERDUE' : dueSoonCount > 0 ? 'WATCH' : 'OK'}
      />

      <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.base, gap: spacing.lg }}>
        {/* Summary tiles */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <KpiTile
            label="ACTIVE"
            value={activeCount}
            tone="ink"
            selected={filter === 'all'}
            onPress={() => setFilter('all')}
          />
          <KpiTile
            label="DUE"
            value={dueCount}
            tone={overdueCount > 0 ? 'red' : dueSoonCount > 0 ? 'yellow' : 'ink'}
            selected={filter === 'overdue' || filter === 'due_soon'}
            onPress={() => setFilter(overdueCount > 0 ? 'overdue' : 'due_soon')}
          />
          <KpiTile
            label="RETIRED"
            value={retiredCount}
            tone="mute"
            selected={filter === 'retired'}
            onPress={() => setFilter('retired')}
          />
        </View>

        {/* Primary action row */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <DocActionButton
            title={showAddGear ? 'CLOSE' : 'ADD GEAR'}
            icon={showAddGear ? XCircle : Plus}
            variant={showAddGear ? 'secondary' : 'primary'}
            onPress={() => setShowAddGear((value) => !value)}
            style={{ flex: 1 }}
          />
          <DocActionButton
            title={showInspection ? 'CLOSE' : 'INSPECT'}
            icon={showInspection ? XCircle : ClipboardCheck}
            variant="secondary"
            onPress={() => setShowInspection((value) => !value)}
            disabled={!activeItems.length}
            style={{ flex: 1 }}
          />
        </View>

        {/* § 30 Add gear */}
        {showAddGear ? (
          <View>
            <SectionH n="30" right={selectedCatalogEntry ? 'CATALOG MATCH' : 'NEW ENTRY'}>
              Add gear
            </SectionH>
            <View
              style={{
                borderWidth: hairlines.standard.width,
                borderColor: hairlines.standard.color,
                backgroundColor: tidewater.white,
                padding: spacing.md,
                gap: spacing.md,
              }}
            >
              <View style={{ gap: spacing.xs }}>
                <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.5 }}>
                  CATEGORY
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                  {CATEGORIES.map((item) => {
                    const selected = item.value === category;
                    return (
                      <Pressable
                        key={item.value}
                        onPress={() => {
                          setCategory(item.value);
                          setSelectedCatalogEntry(null);
                        }}
                        style={({ pressed }) => ({
                          borderWidth: 1.5,
                          borderColor: selected ? tidewater.accent : tidewater.hair,
                          backgroundColor: selected ? tidewater.accentSoft : 'transparent',
                          paddingHorizontal: spacing.sm,
                          paddingVertical: 6,
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <Text style={{ ...typography.displaySm, color: tidewater.ink, letterSpacing: 1.2 }}>
                          {item.label.toUpperCase()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Field
                label="Make / model"
                value={makeModel}
                onChangeText={(value) => {
                  setMakeModel(value);
                  setSelectedCatalogEntry(null);
                }}
                placeholder="Petzl Avao"
                autoCapitalize="words"
                autoCorrect={false}
                style={{ borderRadius: 0, borderWidth: 1.5 }}
              />
              {showCatalogSuggestions ? (
                <View style={{ borderWidth: 1.5, borderColor: tidewater.hairSoft }}>
                  {catalogSearch.data?.map((entry, index, arr) => (
                    <Pressable
                      key={entry.id}
                      accessibilityRole="button"
                      onPress={() => {
                        setSelectedCatalogEntry(entry);
                        setCategory(entry.category);
                        setMakeModel(`${entry.manufacturer} ${entry.model}`);
                      }}
                      style={({ pressed }) => ({
                        paddingHorizontal: spacing.sm,
                        paddingVertical: spacing.xs + 2,
                        borderBottomWidth: index < arr.length - 1 ? 1 : 0,
                        borderBottomColor: tidewater.hairFaint,
                        backgroundColor: pressed ? tidewater.paper2 : tidewater.white,
                        gap: 2,
                      })}
                    >
                      <Text style={{ ...typography.bodyMed, color: tidewater.ink }}>
                        {entry.manufacturer} {entry.model}
                      </Text>
                      <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.2 }}>
                        {entry.category.toUpperCase()}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <Field
                label="Name"
                value={customName}
                onChangeText={setCustomName}
                placeholder="Optional display name"
                style={{ borderRadius: 0, borderWidth: 1.5 }}
              />
              <Field
                label="Serial"
                value={serialNumber}
                onChangeText={setSerialNumber}
                placeholder="Optional"
                style={{ borderRadius: 0, borderWidth: 1.5 }}
              />
              <DateField
                label="Next due"
                value={nextInspectionDue}
                onChange={setNextInspectionDue}
                placeholder="No date"
                optional
              />
              <DocActionButton
                title={createGearItem.isPending ? 'SAVING' : 'SAVE GEAR'}
                icon={Plus}
                onPress={addGearItem}
                disabled={!canCreate}
                loading={createGearItem.isPending}
              />
            </View>
          </View>
        ) : null}

        {/* § 31 Inspection */}
        {activeItems.length > 0 && showInspection ? (
          <View>
            <SectionH n="31" right={inspectionResult === 'fail' ? 'WILL RETIRE' : 'RECORD'}>
              Inspection
            </SectionH>
            <View
              style={{
                borderWidth: hairlines.standard.width,
                borderColor: hairlines.standard.color,
                backgroundColor: tidewater.white,
                padding: spacing.md,
                gap: spacing.md,
              }}
            >
              {inspectionResult === 'fail' ? (
                <View
                  style={{
                    borderWidth: 1.5,
                    borderColor: tidewater.red,
                    backgroundColor: tidewater.redSoft,
                    padding: spacing.sm,
                  }}
                >
                  <Text style={{ ...typography.monoSm, color: tidewater.red, letterSpacing: 1.2 }}>
                    SAVING A FAILED INSPECTION RETIRES THIS GEAR
                  </Text>
                </View>
              ) : null}
              <View style={{ gap: spacing.xs }}>
                <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.5 }}>
                  GEAR
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                  {activeItems.map(({ item }) => {
                    const selected = item.id === selectedGearId;
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => setSelectedGearId(item.id)}
                        style={({ pressed }) => ({
                          borderWidth: 1.5,
                          borderColor: selected ? tidewater.accent : tidewater.hair,
                          backgroundColor: selected ? tidewater.accentSoft : 'transparent',
                          paddingHorizontal: spacing.sm,
                          paddingVertical: 6,
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <Text style={{ ...typography.displaySm, color: tidewater.ink, letterSpacing: 1.2 }}>
                          {item.name.toUpperCase()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View style={{ gap: spacing.xs }}>
                <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.5 }}>
                  RESULT
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                  {(['pass', 'pass_with_concerns', 'fail'] as const).map((result) => {
                    const selected = result === inspectionResult;
                    const isFail = result === 'fail';
                    return (
                      <Pressable
                        key={result}
                        onPress={() => setInspectionResult(result)}
                        style={({ pressed }) => ({
                          borderWidth: 1.5,
                          borderColor: selected ? (isFail ? tidewater.red : tidewater.accent) : tidewater.hair,
                          backgroundColor: selected
                            ? isFail
                              ? tidewater.redSoft
                              : tidewater.accentSoft
                            : 'transparent',
                          paddingHorizontal: spacing.sm,
                          paddingVertical: 6,
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <Text
                          style={{
                            ...typography.displaySm,
                            color: selected && isFail ? tidewater.red : tidewater.ink,
                            letterSpacing: 1.2,
                          }}
                        >
                          {resultLabel(result).toUpperCase()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <DateField label="Inspected" value={inspectedOn} onChange={setInspectedOn} />
              <DateField
                label="Next due"
                value={inspectionNextDue}
                onChange={setInspectionNextDue}
                placeholder={inspectionResult === 'fail' ? 'Ignored for failed gear' : 'MM/DD/YYYY'}
                optional
              />
              <View style={{ gap: spacing.xs }}>
                <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.5 }}>
                  NOTES
                </Text>
                <TextInput
                  value={inspectionNotes}
                  onChangeText={setInspectionNotes}
                  multiline
                  placeholder="Condition, defects, follow-up"
                  placeholderTextColor={tidewater.ink3}
                  style={{
                    borderWidth: 1.5,
                    borderColor: tidewater.hair,
                    backgroundColor: tidewater.white,
                    padding: spacing.sm,
                    ...typography.body,
                    color: tidewater.ink,
                    minHeight: 92,
                    textAlignVertical: 'top',
                  }}
                />
              </View>
              <DocActionButton
                title={recordInspection.isPending ? 'SAVING' : 'SAVE INSPECTION'}
                icon={Save}
                onPress={logInspection}
                disabled={!canInspect}
                loading={recordInspection.isPending}
              />
            </View>
          </View>
        ) : null}

        {/* Status filter */}
        <View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm }}>
            {STATUS_FILTERS.map((item) => {
              const selected = item.value === filter;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => setFilter(item.value)}
                  style={({ pressed }) => ({
                    borderWidth: 1.5,
                    borderColor: selected ? tidewater.accent : tidewater.hair,
                    backgroundColor: selected ? tidewater.accentSoft : 'transparent',
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 6,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text style={{ ...typography.displaySm, color: tidewater.ink, letterSpacing: 1.2 }}>
                    {item.label.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* § 32 Inventory list */}
          <SectionH n="32" right={`${filteredItems.length} ITEM${filteredItems.length === 1 ? '' : 'S'}`}>
            Inventory
          </SectionH>
          {gearItems.isLoading ? (
            <EmptyLine>Loading gear…</EmptyLine>
          ) : gearItems.isError ? (
            <View
              style={{
                borderWidth: 1.5,
                borderColor: tidewater.red,
                backgroundColor: tidewater.redSoft,
                padding: spacing.md,
                gap: spacing.sm,
              }}
            >
              <Text style={{ ...typography.displaySm, color: tidewater.ink, letterSpacing: 1.2 }}>
                GEAR COULD NOT LOAD
              </Text>
              <DocActionButton
                title="TRY AGAIN"
                variant="secondary"
                onPress={() => gearItems.refetch()}
              />
            </View>
          ) : groupedItems.length ? (
            <View style={{ gap: spacing.md }}>
              {groupedItems.map((group) => (
                <View key={group.category}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      marginBottom: spacing.xs,
                    }}
                  >
                    <Text style={{ ...typography.displaySm, color: tidewater.ink, letterSpacing: 1.2 }}>
                      {group.label.toUpperCase()}
                    </Text>
                    <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.5 }}>
                      {group.items.length} {group.items.length === 1 ? 'ITEM' : 'ITEMS'}
                    </Text>
                  </View>
                  <View
                    style={{
                      borderWidth: 1.5,
                      borderColor: tidewater.hair,
                      backgroundColor: tidewater.white,
                    }}
                  >
                    {group.items.map(({ item, latest_inspection, status }, index, arr) => {
                      const meta = [
                        item.serial_number ? `SN ${item.serial_number}` : null,
                        item.next_inspection_due ? `DUE ${formatDate(item.next_inspection_due).toUpperCase()}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ');
                      return (
                        <View
                          key={item.id}
                          style={{
                            padding: spacing.sm,
                            borderBottomWidth: index < arr.length - 1 ? 1 : 0,
                            borderBottomColor: tidewater.hairFaint,
                            gap: spacing.xs,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'flex-start',
                              gap: spacing.sm,
                              justifyContent: 'space-between',
                            }}
                          >
                            <View style={{ flex: 1, gap: 2 }}>
                              <Text
                                selectable
                                style={{ ...typography.bodyMed, color: tidewater.ink }}
                                numberOfLines={2}
                              >
                                {item.name}
                              </Text>
                              {meta ? (
                                <Text style={{ ...typography.monoSm, color: tidewater.ink3 }} numberOfLines={2}>
                                  {meta}
                                </Text>
                              ) : null}
                              {latest_inspection ? (
                                <Text
                                  style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.2 }}
                                  numberOfLines={1}
                                >
                                  {resultLabel(latest_inspection.result).toUpperCase()} ·{' '}
                                  {formatDate(latest_inspection.inspected_on).toUpperCase()}
                                </Text>
                              ) : null}
                            </View>
                            <AnimatedStamp tone={statusStampTone(status)} rotation="light">
                              {statusLabel(status)}
                            </AnimatedStamp>
                          </View>
                          {latest_inspection?.notes ? (
                            <View
                              style={{
                                borderTopWidth: 1,
                                borderTopColor: tidewater.hairFaint,
                                paddingTop: spacing.xs,
                              }}
                            >
                              <Text style={{ ...typography.body, color: tidewater.ink }} numberOfLines={3}>
                                {latest_inspection.notes}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View
              style={{
                borderWidth: 1.5,
                borderColor: tidewater.hairSoft,
                borderStyle: 'dashed',
                padding: spacing.md,
                gap: spacing.sm,
              }}
            >
              <Text style={{ ...typography.displaySm, color: tidewater.ink, letterSpacing: 1.2 }}>
                {filter === 'all' ? 'NO GEAR LOGGED YET' : 'NO GEAR MATCHES FILTER'}
              </Text>
              <Text style={{ ...typography.monoSm, color: tidewater.ink3 }}>
                {filter === 'all'
                  ? 'Add your harness, ropes, helmet, and other kit before tracking inspections.'
                  : 'Try a different filter or show all.'}
              </Text>
              {filter !== 'all' ? (
                <DocActionButton title="SHOW ALL" variant="secondary" onPress={() => setFilter('all')} />
              ) : null}
            </View>
          )}
        </View>
      </View>

      <View style={{ marginTop: spacing.lg }}>
        <DocBand
          variant="footer"
          text={
            overdueCount > 0
              ? `${overdueCount} ITEM${overdueCount === 1 ? '' : 'S'} OVERDUE - INSPECT BEFORE USE`
              : dueSoonCount > 0
                ? `${dueSoonCount} ITEM${dueSoonCount === 1 ? '' : 'S'} DUE SOON`
                : 'KIT CURRENT - INSPECTION SCHEDULE ON TRACK'
          }
          page={`KIT ${String(activeCount + retiredCount).padStart(3, '0')}`}
        />
      </View>
    </Screen>
  );
}

function KpiTile({
  label,
  value,
  tone,
  selected,
  onPress,
}: {
  label: string;
  value: number;
  tone: 'ink' | 'yellow' | 'red' | 'mute';
  selected: boolean;
  onPress: () => void;
}) {
  const { spacing, typography, tidewater } = useTheme();
  const accent =
    tone === 'red'
      ? tidewater.red
      : tone === 'yellow'
        ? tidewater.yellowDeep
        : tone === 'mute'
          ? tidewater.ink3
          : tidewater.ink;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => ({
        flex: 1,
        borderWidth: 1.5,
        borderColor: selected ? tidewater.accent : tidewater.hair,
        backgroundColor: selected ? tidewater.accentSoft : tidewater.white,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        opacity: pressed ? 0.85 : 1,
        gap: 2,
      })}
    >
      <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.5 }}>{label}</Text>
      <AnimatedCounter
        text={String(value)}
        fontFamily="Archivo_900Black"
        fontSize={28}
        fontWeight="900"
        letterSpacing={-0.4}
        color={accent}
        height={30}
        width={21}
      />
    </Pressable>
  );
}

function EmptyLine({ children }: { children: string }) {
  const { spacing, typography, tidewater } = useTheme();
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: tidewater.hairSoft,
        borderStyle: 'dashed',
        padding: spacing.md,
      }}
    >
      <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.2 }}>
        {children.toUpperCase()}
      </Text>
    </View>
  );
}


