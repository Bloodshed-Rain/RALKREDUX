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
import type { EntryKind, HeightUnit, LogbookEntry } from '@/src/domain/logbook/types';
import { parseHazards } from '@/src/domain/logbook/types';
import {
  WORK_TASK_PRESETS,
  ACCESS_METHOD_PRESETS,
  STRUCTURE_PRESETS,
  HAZARD_PRESETS,
} from '@/src/domain/logbook/classification';
import { useCreateAmendment, useEntryDetail, useRecentClassificationValues, useRecentHazardValues } from '@/src/domain/logbook/use-logbook';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import {
  Button,
  Card,
  ChipSelect,
  ClassificationChips,
  Field,
  IconBtn,
  MultiClassificationChips,
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


export default function AmendEntryScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const entryId = firstParam(id);
  const detail = useEntryDetail(entryId);
  const recentWorkTask = useRecentClassificationValues('work_task');
  const recentStructure = useRecentClassificationValues('structure_type');
  const recentAccess = useRecentClassificationValues('access_method');
  const recentHazards = useRecentHazardValues();
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
          <IconBtn icon={IconArrowLeft} label="Back" size="md" onPress={() => router.back()} />
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
            {entry && !sourceLocked
              ? (() => {
                  const changes = computeAmendmentChanges(entry, {
                    employer,
                    site,
                    client,
                    workTask,
                    accessMethod,
                    structureType,
                    maxHeight,
                    heightUnit,
                    description,
                    hours,
                    entryKind,
                    rescueCover,
                    hazards,
                  });
                  if (changes.length === 0) return null;
                  return (
                    <View
                      style={{
                        marginTop: 14,
                        padding: 12,
                        borderRadius: 10,
                        backgroundColor: tokens.accentSoft,
                        gap: 6,
                      }}
                    >
                      <Text style={{ ...type.monoKicker, color: tokens.accent }}>
                        {`WHAT CHANGED · ${changes.length}`}
                      </Text>
                      {changes.map((c) => (
                        <View
                          key={c.field}
                          style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}
                        >
                          <Text
                            style={{
                              ...type.monoKicker,
                              color: tokens.textFaint,
                              width: 88,
                            }}
                          >
                            {c.label.toUpperCase()}
                          </Text>
                          <Text
                            style={{
                              ...type.body,
                              color: tokens.text,
                              flex: 1,
                            }}
                            selectable
                          >
                            <Text style={{ color: tokens.textDim }}>{c.was || '—'}</Text>
                            <Text style={{ color: tokens.textDim }}>{' → '}</Text>
                            <Text style={{ color: tokens.text, fontWeight: '600' }}>
                              {c.is || '—'}
                            </Text>
                          </Text>
                        </View>
                      ))}
                    </View>
                  );
                })()
              : null}
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
                <IconWarn size={21} color={tokens.warn} fill={tokens.warn} />
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
            <ClassificationChips
              label="Work task"
              value={workTask}
              onChange={setWorkTask}
              presets={WORK_TASK_PRESETS}
              recents={recentWorkTask.data ?? []}
            />
          </View>
          <View>
            <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 6 }}>ACCESS</Text>
            <ClassificationChips
              label="Access method"
              value={accessMethod}
              onChange={setAccessMethod}
              presets={ACCESS_METHOD_PRESETS}
              recents={recentAccess.data ?? []}
            />
          </View>
          <View>
            <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 6 }}>STRUCTURE</Text>
            <ClassificationChips
              label="Structure"
              value={structureType}
              onChange={setStructureType}
              presets={STRUCTURE_PRESETS}
              recents={recentStructure.data ?? []}
            />
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
            <MultiClassificationChips
              label="Hazards"
              values={hazards}
              onChange={setHazards}
              presets={HAZARD_PRESETS}
              recents={recentHazards.data ?? []}
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

// Compares a signed source entry to the current amendment form state and
// returns one entry per field that actually differs. Drives the "WHAT
// CHANGED" callout on the hero card so the technician and (later) the
// signer of the amendment see at a glance which fields the correction
// touched — auditors expect amendments to surface the delta, not just the
// new state.
function computeAmendmentChanges(
  source: LogbookEntry,
  current: {
    employer: string;
    site: string;
    client: string;
    workTask: string;
    accessMethod: string;
    structureType: string;
    maxHeight: string;
    heightUnit: HeightUnit;
    description: string;
    hours: string;
    entryKind: EntryKind;
    rescueCover: string;
    hazards: string[];
  },
): Array<{ field: string; label: string; was: string; is: string }> {
  const out: Array<{ field: string; label: string; was: string; is: string }> = [];

  const stringPairs: Array<[string, string, string, string]> = [
    ['employer', 'Employer', source.employer, current.employer],
    ['site', 'Site', source.site, current.site],
    ['client', 'Client', source.client, current.client],
    ['workTask', 'Task', source.work_task, current.workTask],
    ['accessMethod', 'Access', source.access_method, current.accessMethod],
    ['structureType', 'Structure', source.structure_type, current.structureType],
    ['description', 'Notes', source.description, current.description],
    ['rescueCover', 'Rescue', source.rescue_cover ?? '', current.rescueCover],
  ];
  for (const [field, label, was, is] of stringPairs) {
    if ((was ?? '').trim() !== (is ?? '').trim()) {
      out.push({ field, label, was: (was ?? '').trim(), is: (is ?? '').trim() });
    }
  }

  const sourceHours = source.work_hours;
  const currentHours = Number(current.hours);
  if (Number.isFinite(currentHours) && Math.abs(sourceHours - currentHours) > 0.0001) {
    out.push({
      field: 'hours',
      label: 'Hours',
      was: sourceHours.toFixed(1),
      is: currentHours.toFixed(1),
    });
  }

  const sourceHeight = source.max_height;
  const currentHeight = Number(current.maxHeight);
  const heightWas = sourceHeight == null
    ? '—'
    : `${sourceHeight.toFixed(0)} ${source.height_unit}`;
  const heightIs = !Number.isFinite(currentHeight)
    ? '—'
    : `${currentHeight.toFixed(0)} ${current.heightUnit}`;
  if (heightWas !== heightIs) {
    out.push({ field: 'height', label: 'Height', was: heightWas, is: heightIs });
  }

  if (source.entry_kind !== current.entryKind) {
    out.push({
      field: 'entryKind',
      label: 'Kind',
      was: source.entry_kind,
      is: current.entryKind,
    });
  }

  // Hazards: order-independent compare. parseHazards already normalises.
  const sourceHazards = parseHazards(source.hazards);
  const currentHazards = [...current.hazards].sort();
  const sourceSorted = [...sourceHazards].sort();
  const hazardsEqual =
    sourceSorted.length === currentHazards.length
    && sourceSorted.every((h, i) => h === currentHazards[i]);
  if (!hazardsEqual) {
    out.push({
      field: 'hazards',
      label: 'Hazards',
      was: sourceSorted.join(' · ') || '—',
      is: currentHazards.join(' · ') || '—',
    });
  }

  return out;
}
