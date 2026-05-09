import React from 'react';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ClipboardCheck,
  HardHat,
  Plus,
  Save,
  XCircle,
} from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
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
import { ActionTile, Button, Card, DateField, Field, Screen } from '@/src/ui/primitives';
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
      return 'Due soon';
    case 'overdue':
      return 'Overdue';
    case 'unscheduled':
      return 'No date';
    case 'retired':
      return 'Retired';
    default:
      return 'Current';
  }
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

function statusIcon(status: GearStatus): LucideIcon {
  if (status === 'overdue') return AlertTriangle;
  if (status === 'retired') return Archive;
  if (status === 'due_soon' || status === 'unscheduled') return AlertTriangle;
  return CheckCircle2;
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

function StatusPill({ status }: { status: GearStatus }) {
  const { colors, radii, spacing, typography } = useTheme();
  const Icon = statusIcon(status);
  const isBad = status === 'overdue' || status === 'retired';
  const isWarn = status === 'due_soon' || status === 'unscheduled';
  const color = isBad ? colors.statusErr : isWarn ? colors.statusWarn : colors.statusOk;
  const backgroundColor = isBad ? colors.statusErrTint : isWarn ? colors.statusWarnTint : colors.statusOkTint;

  return (
    <View
      style={{
        minHeight: 32,
        borderRadius: radii.pill,
        backgroundColor,
        paddingHorizontal: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: spacing.xs,
      }}
    >
      <Icon size={14} color={color} strokeWidth={2.2} />
      <Text selectable={false} style={{ ...typography.caption, color }}>
        {statusLabel(status)}
      </Text>
    </View>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors, radii, spacing, typography, touchTarget } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        minHeight: touchTarget.min,
        borderRadius: radii.pill,
        borderWidth: 1,
        borderColor: selected ? colors.accentPrimary : colors.border,
        backgroundColor: selected ? colors.accentTint : colors.bgSurface,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
      }}
    >
      <Text selectable={false} style={{ ...typography.label, color: selected ? colors.accentPrimary : colors.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  );
}

function SegmentedChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors, radii, spacing, typography, touchTarget } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        minHeight: touchTarget.min,
        borderRadius: radii.sm,
        borderWidth: 1,
        borderColor: selected ? colors.accentPrimary : colors.border,
        backgroundColor: selected ? colors.accentTint : colors.bgSurface,
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
      }}
    >
      <Text selectable={false} style={{ ...typography.label, color: selected ? colors.accentPrimary : colors.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function GearScreen() {
  const { colors, spacing, typography } = useTheme();
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
  const filteredItems = filter === 'all'
    ? allItems
    : allItems.filter(({ status }) => status === filter);
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
    <Screen safeTop>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <ActionTile
          title="Active"
          value={String(summary.data?.activeItems ?? 0)}
          icon={HardHat}
          onPress={() => setFilter('all')}
          tone={filter === 'all' ? 'accent' : 'default'}
          style={{ flexBasis: 0, minHeight: 112, minWidth: 0 }}
        />
        <ActionTile
          title="Due"
          value={String((summary.data?.dueSoonItems ?? 0) + (summary.data?.overdueItems ?? 0))}
          icon={AlertTriangle}
          onPress={() => setFilter((summary.data?.overdueItems ?? 0) > 0 ? 'overdue' : 'due_soon')}
          tone={(summary.data?.overdueItems ?? 0) > 0 || (summary.data?.dueSoonItems ?? 0) > 0 ? 'warn' : 'default'}
          style={{ flexBasis: 0, minHeight: 112, minWidth: 0 }}
        />
        <ActionTile
          title="Retired"
          value={String(summary.data?.retiredItems ?? 0)}
          icon={Archive}
          onPress={() => setFilter('retired')}
          tone={filter === 'retired' ? 'accent' : 'default'}
          style={{ flexBasis: 0, minHeight: 112, minWidth: 0 }}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          title={showAddGear ? 'Close' : 'Add gear'}
          icon={showAddGear ? XCircle : Plus}
          variant={showAddGear ? 'secondary' : 'primary'}
          onPress={() => setShowAddGear((value) => !value)}
          style={{ flex: 1 }}
        />
        <Button
          title={showInspection ? 'Close' : 'Inspect'}
          icon={showInspection ? XCircle : ClipboardCheck}
          variant="secondary"
          onPress={() => setShowInspection((value) => !value)}
          disabled={!activeItems.length}
          style={{ flex: 1 }}
        />
      </View>

      {showAddGear ? (
        <Card>
          <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
            Add gear
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {CATEGORIES.map((item) => (
              <SegmentedChip
                key={item.value}
                label={item.label}
                selected={item.value === category}
                onPress={() => {
                  setCategory(item.value);
                  setSelectedCatalogEntry(null);
                }}
              />
            ))}
          </View>
          <View style={{ gap: spacing.xs }}>
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
            />
            {showCatalogSuggestions ? (
              <View style={{ borderRadius: 8, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                {catalogSearch.data?.map((entry) => (
                  <Pressable
                    key={entry.id}
                    accessibilityRole="button"
                    onPress={() => {
                      setSelectedCatalogEntry(entry);
                      setCategory(entry.category);
                      setMakeModel(`${entry.manufacturer} ${entry.model}`);
                    }}
                    style={({ pressed }) => ({
                      gap: spacing.xs,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      backgroundColor: pressed ? colors.bgMuted : colors.bgSurface,
                    })}
                  >
                    <Text selectable={false} style={{ ...typography.bodyMed, color: colors.textPrimary }}>
                      {entry.manufacturer} {entry.model}
                    </Text>
                    <Text selectable={false} style={{ ...typography.caption, color: colors.textSecondary }}>
                      {entry.category}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
          <Field label="Name" value={customName} onChangeText={setCustomName} placeholder="Optional display name" />
          <Field label="Serial" value={serialNumber} onChangeText={setSerialNumber} placeholder="Optional" />
          <DateField
            label="Next due"
            value={nextInspectionDue}
            onChange={setNextInspectionDue}
            placeholder="No date"
            optional
          />
          <Button
            title="Add gear"
            icon={Plus}
            onPress={addGearItem}
            disabled={!canCreate}
            loading={createGearItem.isPending}
          />
        </Card>
      ) : null}

      {activeItems.length > 0 && showInspection ? (
        <Card>
          <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
            Inspection
          </Text>
          {inspectionResult === 'fail' ? (
            <Text selectable style={{ ...typography.body, color: colors.statusErr }}>
              Saving a failed inspection retires this gear from active use.
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {activeItems.map(({ item }) => (
              <SegmentedChip
                key={item.id}
                label={item.name}
                selected={item.id === selectedGearId}
                onPress={() => setSelectedGearId(item.id)}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {(['pass', 'pass_with_concerns', 'fail'] as const).map((result) => (
              <SegmentedChip
                key={result}
                label={resultLabel(result)}
                selected={result === inspectionResult}
                onPress={() => setInspectionResult(result)}
              />
            ))}
          </View>
          <DateField label="Inspected" value={inspectedOn} onChange={setInspectedOn} />
          <DateField
            label="Next due"
            value={inspectionNextDue}
            onChange={setInspectionNextDue}
            placeholder={inspectionResult === 'fail' ? 'Ignored for failed gear' : 'MM/DD/YYYY'}
            optional
          />
          <Field
            label="Notes"
            value={inspectionNotes}
            onChangeText={setInspectionNotes}
            multiline
            textAlignVertical="top"
            style={{ minHeight: 92 }}
            placeholder="Condition, defects, follow-up"
          />
          <Button
            title="Save inspection"
            icon={Save}
            onPress={logInspection}
            disabled={!canInspect}
            loading={recordInspection.isPending}
          />
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {STATUS_FILTERS.map((item) => (
          <FilterChip
            key={item.value}
            label={item.label}
            selected={filter === item.value}
            onPress={() => setFilter(item.value)}
          />
        ))}
      </View>

      {gearItems.isLoading ? (
        <Card>
          <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
            Loading gear
          </Text>
          <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
            Your equipment list is opening.
          </Text>
        </Card>
      ) : gearItems.isError ? (
        <Card>
          <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
            Gear could not load
          </Text>
          <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
            Nothing was changed. Try loading the gear list again.
          </Text>
          <Button title="Try again" variant="secondary" onPress={() => gearItems.refetch()} />
        </Card>
      ) : groupedItems.length ? (
        groupedItems.map((group) => (
          <View key={group.category} style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
              <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
                {group.label}
              </Text>
              <Text selectable={false} style={{ ...typography.caption, color: colors.textSecondary }}>
                {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
              </Text>
            </View>
            {group.items.map(({ item, latest_inspection, status }) => {
              const meta = [
                categoryLabel(item.category),
                item.serial_number ? `SN ${item.serial_number}` : null,
                item.next_inspection_due ? `Due ${formatDate(item.next_inspection_due)}` : null,
              ].filter(Boolean).join(' - ');
              return (
                <Card key={item.id}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
                    <View style={{ flex: 1, gap: spacing.xs }}>
                      <Text selectable style={{ ...typography.title3, color: colors.textPrimary }} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text selectable style={{ ...typography.caption, color: colors.textSecondary }} numberOfLines={2}>
                        {meta || categoryLabel(item.category)}
                      </Text>
                      {latest_inspection ? (
                        <Text selectable style={{ ...typography.body, color: colors.textSecondary }} numberOfLines={1}>
                          {resultLabel(latest_inspection.result)} on {formatDate(latest_inspection.inspected_on)}
                        </Text>
                      ) : null}
                    </View>
                    <StatusPill status={status} />
                  </View>
                  {latest_inspection?.notes ? (
                    <Text selectable style={{ ...typography.body, color: colors.textPrimary }} numberOfLines={2}>
                      {latest_inspection.notes}
                    </Text>
                  ) : null}
                </Card>
              );
            })}
          </View>
        ))
      ) : (
        <Card>
          <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
            No gear logged yet
          </Text>
          <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
            Add your harness, ropes, helmet, and other kit before tracking inspections.
          </Text>
          {filter !== 'all' ? (
            <Button title="Show all" variant="secondary" onPress={() => setFilter('all')} />
          ) : null}
        </Card>
      )}
    </Screen>
  );
}
