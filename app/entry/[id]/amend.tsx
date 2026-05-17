import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { EntryKind, HeightUnit } from '@/src/domain/logbook/types';
import { parseHazards } from '@/src/domain/logbook/types';
import { HAZARD_PRESETS } from '@/src/domain/logbook/hazards';
import { useCreateAmendment, useEntryDetail } from '@/src/domain/logbook/use-logbook';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import {
  Button,
  Card,
  ChipSelect,
  Field,
  IconBtn,
  MultiChipSelect,
  Pill,
  SectionH,
  TopBar,
} from '@/src/ui/primitives/v2';
import { IconArrowLeft, IconWarn } from '@/src/ui/icons';
import { haptics } from '@/src/ui/haptics';

const ENTRY_KIND_OPTIONS: Array<{ value: EntryKind; label: string }> = [
  { value: 'work', label: 'Work' },
  { value: 'training', label: 'Training' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'rescue_drill', label: 'Rescue drill' },
];

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

const TASK_OPTIONS = [
  { value: 'Inspection', label: 'Inspection' },
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'Rescue standby', label: 'Rescue' },
  { value: 'Training', label: 'Training' },
];

const ACCESS_OPTIONS = [
  { value: 'Two-rope access', label: 'Two-rope' },
  { value: 'Aid climb', label: 'Aid climb' },
  { value: 'Rescue cover', label: 'Rescue cover' },
  { value: 'Fall restraint', label: 'Restraint' },
];

const STRUCTURE_OPTIONS = [
  { value: 'Bridge', label: 'Bridge' },
  { value: 'Tower', label: 'Tower' },
  { value: 'Wind turbine', label: 'Turbine' },
  { value: 'Facade', label: 'Facade' },
];

export default function AmendEntryScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const entryId = firstParam(id);
  const detail = useEntryDetail(entryId);
  const createAmendment = useCreateAmendment();

  const [loadedId, setLoadedId] = React.useState<string | null>(null);
  const [employer, setEmployer] = React.useState('');
  const [site, setSite] = React.useState('');
  const [client, setClient] = React.useState('');
  const [workTask, setWorkTask] = React.useState('');
  const [accessMethod, setAccessMethod] = React.useState('');
  const [structureType, setStructureType] = React.useState('');
  const [maxHeight, setMaxHeight] = React.useState('');
  const [heightUnit, setHeightUnit] = React.useState<HeightUnit>('ft');
  const [description, setDescription] = React.useState('');
  const [hours, setHours] = React.useState('');
  // v3 fields — pre-filled from the signed source so the amendment starts
  // with the same hours-bucket / rescue / hazards context unless the tech
  // explicitly changes it.
  const [entryKind, setEntryKind] = React.useState<EntryKind>('work');
  const [rescueCover, setRescueCover] = React.useState('');
  const [hazards, setHazards] = React.useState<string[]>([]);
  const entry = detail.data?.entry;

  React.useEffect(() => {
    if (!entry || loadedId === entry.id) return;
    setLoadedId(entry.id);
    setEmployer(entry.employer);
    setSite(entry.site);
    setClient(entry.client);
    setWorkTask(entry.work_task);
    setAccessMethod(entry.access_method);
    setStructureType(entry.structure_type);
    setMaxHeight(entry.max_height === null ? '' : String(entry.max_height));
    setHeightUnit(entry.height_unit);
    setDescription(entry.description);
    setHours(String(entry.work_hours));
    setEntryKind(entry.entry_kind);
    setRescueCover(entry.rescue_cover ?? '');
    setHazards(parseHazards(entry.hazards));
  }, [entry, loadedId]);

  const parsedHours = Number(hours);
  const parsedHeight = Number(maxHeight);
  const isMissing = {
    employer: employer.trim().length === 0,
    site: site.trim().length === 0,
    client: client.trim().length === 0,
    task: workTask.trim().length === 0,
    access: accessMethod.trim().length === 0,
    structure: structureType.trim().length === 0,
    notes: description.trim().length === 0,
    hours: !Number.isFinite(parsedHours) || parsedHours <= 0,
    height: !Number.isFinite(parsedHeight) || parsedHeight <= 0,
  };
  const missingCount = Object.values(isMissing).filter(Boolean).length;
  const canSave = Boolean(entryId) && entry?.status === 'signed' && missingCount === 0;
  const sourceLocked = entry?.status && entry.status !== 'signed';

  function save() {
    if (!canSave || !entryId || !entry) return;
    createAmendment.mutate(
      {
        entry_id: entryId,
        employer,
        site,
        client,
        description,
        work_hours: parsedHours,
        work_task: workTask,
        access_method: accessMethod,
        structure_type: structureType,
        max_height: parsedHeight,
        height_unit: heightUnit,
        date_from: entry.date_from,
        date_to: entry.date_to,
        sprat_level_snapshot: entry.sprat_level_snapshot,
        irata_level_snapshot: entry.irata_level_snapshot,
        entry_kind: entryKind,
        rescue_cover: rescueCover,
        hazards,
      },
      {
        onSuccess: (draft) => {
          haptics.success();
          router.replace(`/entry/${draft.id}`);
        },
        onError: () => haptics.error(),
      },
    );
  }

  const heroKickerStyle: TextStyle = { ...type.monoKicker, color: tokens.textFaint };
  const heroTitleStyle: TextStyle = {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 26,
    letterSpacing: -0.7,
    lineHeight: 30,
    color: tokens.text,
    marginTop: 4,
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: tokens.bg }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <TopBar
        title="Amend entry"
        leading={
          <IconBtn icon={IconArrowLeft} label="Back" size="sm" onPress={() => router.back()} />
        }
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
          <Card padding={18}>
            <Text style={heroKickerStyle}>
              {entry
                ? `AMENDS ${entry.date_to.slice(0, 10)} · ${shortEntryRef(entry.id)}`
                : 'AMENDS ──────'}
            </Text>
            <Text style={heroTitleStyle} numberOfLines={2}>
              {entry?.site || 'Loading entry'}
            </Text>
            <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 4 }}>
              Creates a new draft pointing back to the signed source.
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
              <Pill tone="chip">{entry ? `${entry.work_hours.toFixed(1)} hr on file` : '—'}</Pill>
              <Pill tone={missingCount === 0 ? 'ok' : 'warn'}>
                {missingCount === 0 ? 'Complete' : `${missingCount} missing`}
              </Pill>
            </View>
            {sourceLocked ? (
              <View
                style={{
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: tokens.warnSoft,
                  flexDirection: 'row',
                  gap: 10,
                  alignItems: 'flex-start',
                }}
              >
                <IconWarn size={18} color={tokens.warn} fill={tokens.warn} />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...type.cardTitle, color: tokens.text }}>
                    Amendments need a signed source
                  </Text>
                  <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 2 }}>
                    Drafts should be edited directly instead.
                  </Text>
                </View>
              </View>
            ) : null}
          </Card>
        </View>

        <SectionH kicker="01 SITE & PARTIES" title="Site and parties" />
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <Field label="Site" value={site} onChangeText={setSite} placeholder="Tower / plant / bridge" />
          <Field label="Employer" value={employer} onChangeText={setEmployer} placeholder="Company" autoCapitalize="words" />
          <Field label="Client" value={client} onChangeText={setClient} placeholder="Customer / contractor" autoCapitalize="words" />
        </View>

        <SectionH kicker="02 TASK & METHOD" title="Task and method" />
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <View>
            <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 6 }}>TASK</Text>
            <ChipSelect value={workTask} options={TASK_OPTIONS} onChange={setWorkTask} />
            <View style={{ marginTop: 8 }}>
              <Field label="Or write your own" value={workTask} onChangeText={setWorkTask} placeholder="Custom task" />
            </View>
          </View>
          <View>
            <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 6 }}>ACCESS</Text>
            <ChipSelect value={accessMethod} options={ACCESS_OPTIONS} onChange={setAccessMethod} />
          </View>
          <View>
            <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 6 }}>STRUCTURE</Text>
            <ChipSelect value={structureType} options={STRUCTURE_OPTIONS} onChange={setStructureType} />
            <View style={{ marginTop: 8 }}>
              <Field
                label="Or write your own"
                value={structureType}
                onChangeText={setStructureType}
                placeholder="Bridge / tower / wind turbine"
              />
            </View>
          </View>
        </View>

        <SectionH kicker="03 HOURS & HEIGHT" title="Time and height" />
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <Field
            label="Rope access hours"
            value={hours}
            onChangeText={setHours}
            keyboardType="decimal-pad"
            placeholder="8"
          />
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
            <View style={{ flex: 2 }}>
              <Field
                label="Maximum height"
                value={maxHeight}
                onChangeText={(v) => setMaxHeight(v.replace(/[^\d.]/g, ''))}
                keyboardType="decimal-pad"
                placeholder="120"
              />
            </View>
            <UnitToggle value={heightUnit} onChange={setHeightUnit} />
          </View>
        </View>

        <SectionH kicker="04 NOTES" title="What changed" />
        <View style={{ paddingHorizontal: 20 }}>
          <Field
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Describe the correction or addition."
          />
        </View>

        <SectionH kicker="05 KIND & RESCUE" title="Hours bucket + safety context" />
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <View>
            <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 6 }}>ENTRY KIND</Text>
            <ChipSelect<EntryKind>
              value={entryKind}
              options={ENTRY_KIND_OPTIONS}
              onChange={setEntryKind}
            />
          </View>
          <Field
            label="Rescue cover"
            value={rescueCover}
            onChangeText={setRescueCover}
            placeholder="e.g. Standing rescue — J. Lee, radio ch. 3"
          />
          <View>
            <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 6 }}>HAZARDS</Text>
            <MultiChipSelect
              values={hazards}
              options={[...HAZARD_PRESETS]}
              onChange={setHazards}
            />
          </View>
        </View>
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          backgroundColor: tokens.bg,
          borderTopWidth: 1,
          borderTopColor: tokens.lineSoft,
        }}
      >
        <Button
          variant="primary"
          size="lg"
          full
          onPress={save}
          disabled={!canSave || createAmendment.isPending}
        >
          {createAmendment.isPending
            ? 'Creating amendment…'
            : canSave
              ? 'Create amendment draft'
              : 'Finish amendment'}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

function UnitToggle({ value, onChange }: { value: HeightUnit; onChange: (next: HeightUnit) => void }) {
  const { tokens } = useTheme();
  const trackStyle: ViewStyle = {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: tokens.lineSoft,
    height: 44,
  };
  return (
    <View style={trackStyle}>
      {(['ft', 'm'] as const).map((unit) => {
        const active = unit === value;
        return (
          <Pressable
            key={unit}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(unit)}
            style={{
              width: 44,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? tokens.accent : tokens.surface,
            }}
          >
            <Text
              style={{
                fontFamily: 'Manrope_600SemiBold',
                fontWeight: '600',
                fontSize: 13,
                color: active ? tokens.accentInk : tokens.text,
              }}
            >
              {unit}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Audit-friendly short reference for an entry: strip the createId prefix
// and surface the first 8 chars of the UUID. Pairs with the entry date in
// audit-context labels (e.g. "AMENDS 2026-05-10 · A1B2C3D4").
function shortEntryRef(id: string): string {
  const parts = id.split('_');
  const uuid = parts.length > 1 ? parts.slice(1).join('_') : id;
  return uuid.slice(0, 8).toUpperCase();
}
