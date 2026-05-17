import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { GearCategory, GearItemDetail, GearStatus } from '@/src/domain/gear/types';
import { useCreateGearItem, useGearItems, useGearSummary } from '@/src/domain/gear/use-gear';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import {
  Button,
  Card,
  ChipSelect,
  Field,
  GearCard,
  IconBtn,
  SectionH,
  TopBar,
} from '@/src/ui/primitives/v2';
import { GEAR_ICON, IconChevron, IconPlus, IconWarn } from '@/src/ui/icons';
import { haptics } from '@/src/ui/haptics';

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

function statusToCardStatus(status: GearStatus): 'ok' | 'due_soon' | 'overdue' | 'unscheduled' | 'retired' {
  if (status === 'current') return 'ok';
  return status;
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

  const today = React.useMemo(() => new Date(), []);
  const allItems = gearItems.data ?? [];
  const filteredItems =
    filter === 'all' ? allItems : allItems.filter(({ item }) => item.category === filter);

  const overdueItems = allItems.filter(({ status }) => status === 'overdue');
  const dueSoonItems = allItems.filter(({ status }) => status === 'due_soon');
  const totalActive = summary.data?.activeItems ?? 0;
  const deadlinesItems = [...overdueItems, ...dueSoonItems].slice(0, 3);

  async function addGearItem() {
    if (newName.trim().length === 0) return;
    createGearItem.mutate(
      {
        name: newName.trim(),
        category: newCategory,
        serial_number: newSerial.trim() || null,
        next_inspection_due: newNextDue.trim() || null,
      },
      {
        onSuccess: () => {
          haptics.success();
          setNewName('');
          setNewSerial('');
          setNewNextDue('');
          setShowAdd(false);
        },
        onError: (err) => {
          haptics.error();
          Alert.alert('Could not add gear', err instanceof Error ? err.message : String(err));
        },
      },
    );
  }

  const subLine = `${totalActive} active · ${overdueItems.length} overdue · ${dueSoonItems.length} due ≤14d`;

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
            size="sm"
            onPress={() => setShowAdd((v) => !v)}
          />
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 132 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {showAdd ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 4, gap: 10 }}>
            <Card padding={14}>
              <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 10 }}>
                ADD GEAR
              </Text>
              <View style={{ gap: 10 }}>
                <Field
                  label="Name"
                  value={newName}
                  onChangeText={setNewName}
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
                    <Field
                      label="Next inspection"
                      value={newNextDue}
                      onChangeText={setNewNextDue}
                      placeholder="YYYY-MM-DD"
                      autoCapitalize="none"
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

        {deadlinesItems.length > 0 ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
            <Card padding={14}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: overdueItems.length > 0 ? tokens.dangerSoft : tokens.warnSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconWarn
                    size={18}
                    color={overdueItems.length > 0 ? tokens.danger : tokens.warn}
                    fill={overdueItems.length > 0 ? tokens.danger : tokens.warn}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>
                    INSPECTION DEADLINES
                  </Text>
                  <Text style={{ ...type.cardTitle, color: tokens.text, marginTop: 2 }}>
                    {`${overdueItems.length} overdue · ${dueSoonItems.length} due ≤14d`}
                  </Text>
                </View>
              </View>
              <View style={{ gap: 6 }}>
                {deadlinesItems.map((detail) => (
                  <DeadlineRow key={detail.item.id} detail={detail} today={today} />
                ))}
              </View>
            </Card>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
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

        <SectionH
          kicker="ALL GEAR"
          title={filter === 'all' ? `${allItems.length} items` : `${filteredItems.length} ${CATEGORY_FILTERS.find((c) => c.value === filter)?.label.toLowerCase() ?? ''}`}
        />

        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          {filteredItems.length === 0 ? (
            <Card padding={20}>
              <Text style={{ ...type.cardTitle, color: tokens.text, textAlign: 'center' }}>
                No gear in this category
              </Text>
              <Text
                style={{
                  ...type.cardSub,
                  color: tokens.textDim,
                  textAlign: 'center',
                  marginTop: 4,
                }}
              >
                Tap the + in the top bar to add an item.
              </Text>
            </Card>
          ) : (
            filteredItems.map((detail) => {
              const cycle = computeCycle(detail, today);
              return (
                <GearCard
                  key={detail.item.id}
                  category={detail.item.category}
                  name={detail.item.name}
                  manufacturer={detail.item.manufacturer}
                  serialNumber={detail.item.serial_number}
                  days={cycle.days}
                  progress={cycle.progress}
                  status={statusToCardStatus(detail.status)}
                  onPress={() => router.push(`/gear/${detail.item.id}` as never)}
                />
              );
            })
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function DeadlineRow({ detail, today }: { detail: GearItemDetail; today: Date }) {
  const { tokens } = useTheme();
  const cycle = computeCycle(detail, today);
  const Icon = GEAR_ICON[detail.item.category];
  const overdue = detail.status === 'overdue';
  const bg = overdue ? tokens.dangerSoft : tokens.warnSoft;
  const fg = overdue ? tokens.danger : tokens.warn;
  const days = cycle.days;

  const captionText =
    days == null
      ? 'No date'
      : days < 0
        ? `${Math.abs(days)}d overdue`
        : days === 0
          ? 'Due today'
          : `${days}d to go`;

  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: bg,
  };

  const titleStyle: TextStyle = {
    ...type.cardTitle,
    color: tokens.text,
  };

  const captionStyle: TextStyle = {
    ...type.monoSm,
    color: fg,
    letterSpacing: 0.5,
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/gear/${detail.item.id}` as never)}
      style={({ pressed }) => [rowStyle, pressed ? { transform: [{ scale: 0.99 }] } : null]}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          backgroundColor: 'rgba(0,0,0,0.05)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={18} color={fg} fill={fg} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={titleStyle} numberOfLines={1}>
          {detail.item.name}
        </Text>
        <Text style={captionStyle} numberOfLines={1}>
          {captionText}
        </Text>
      </View>
      <IconChevron size={14} color={fg} />
    </Pressable>
  );
}
