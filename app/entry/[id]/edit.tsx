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
import { useEntryDetail, useUpdateDraftEntry } from '@/src/domain/logbook/use-logbook';
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
import { DateField } from '@/src/ui/primitives/v2/date-field';
import { IconArrowLeft, IconWarn } from '@/src/ui/icons';

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

function missingFields(input: {
  dateFrom: string;
  dateTo: string;
  employer: string;
  site: string;
  client: string;
  workTask: string;
  accessMethod: string;
  structureType: string;
  description: string;
  parsedHours: number;
  parsedHeight: number;
}): string[] {
  const missing: string[] = [];
  if (!input.dateFrom.trim() || !input.dateTo.trim()) missing.push('dates');
  if (!input.employer.trim()) missing.push('employer');
  if (!input.site.trim()) missing.push('site');
  if (!input.client.trim()) missing.push('client');
  if (!input.workTask.trim()) missing.push('task');
  if (!input.accessMethod.trim()) missing.push('access');
  if (!input.structureType.trim()) missing.push('structure');
  if (!input.description.trim()) missing.push('notes');
  if (!Number.isFinite(input.parsedHours) || input.parsedHours <= 0) missing.push('hours');
  if (!Number.isFinite(input.parsedHeight) || input.parsedHeight <= 0) missing.push('height');
  return missing;
}

export default function EditDraftScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const entryId = firstParam(id);
  const detail = useEntryDetail(entryId);
  const updateDraft = useUpdateDraftEntry();

  const [loadedId, setLoadedId] = React.useState<string | null>(null);
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
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
  // v3 fields.
  const [entryKind, setEntryKind] = React.useState<EntryKind>('work');
  const [rescueCover, setRescueCover] = React.useState('');
  const [hazards, setHazards] = React.useState<string[]>([]);

  const entry = detail.data?.entry;
  const hasPendingRequest = Boolean(detail.data?.remote_request || entry?.pending_signature_id);

  React.useEffect(() => {
    if (!entry || loadedId === entry.id) return;
    setLoadedId(entry.id);
    setDateFrom(entry.date_from);
    setDateTo(entry.date_to);
    setEmployer(entry.employer);
    setSite(entry.site);
    setClient(entry.client);
    setWorkTask(entry.work_task);
    setAccessMethod(entry.access_method || 'Two-rope access');
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
  const missing = missingFields({
    dateFrom,
    dateTo,
    employer,
    site,
    client,
    workTask,
    accessMethod,
    structureType,
    description,
    parsedHours,
    parsedHeight,
  });
  const isAuditReady = missing.length === 0;
  const canSave =
    Boolean(entryId) &&
    entry?.status === 'draft' &&
    !hasPendingRequest &&
    site.trim().length > 0 &&
    workTask.trim().length > 0 &&
    Number.isFinite(parsedHours) &&
    parsedHours > 0;

  function save() {
    if (!canSave || !entryId || !entry) return;
    updateDraft.mutate(
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
        date_from: dateFrom,
        date_to: dateTo || dateFrom,
        sprat_level_snapshot: entry.sprat_level_snapshot,
        irata_level_snapshot: entry.irata_level_snapshot,
        entry_kind: entryKind,
        rescue_cover: rescueCover,
        hazards,
      },
      { onSuccess: (updated) => router.replace(`/entry/${updated.entry.id}`) },
    );
  }

  if (detail.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg, padding: 20 }}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ ...type.body, color: tokens.textDim }}>Loading draft…</Text>
      </View>
    );
  }

  const lockedNotice =
    entry?.status && entry.status !== 'draft'
      ? { title: 'Entry is locked', body: 'Signed records use amendments instead of direct edits.' }
      : hasPendingRequest
        ? {
            title: 'Remote request pending',
            body: 'Complete or cancel the pending verifier request before editing.',
          }
        : null;

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
  const heroSubStyle: TextStyle = { ...type.cardSub, color: tokens.textDim, marginTop: 4 };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: tokens.bg }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <TopBar
        title="Edit draft"
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
            <Text style={heroKickerStyle}>DRAFT · ENTRY-HASH V2</Text>
            <Text style={heroTitleStyle} numberOfLines={2}>
              {site || entry?.site || 'Untitled draft'}
            </Text>
            <Text style={heroSubStyle}>
              Edit the record before sealing it in the chain.
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
              <Pill tone={isAuditReady ? 'ok' : 'warn'}>
                {isAuditReady ? 'Audit-ready' : `${missing.length} missing`}
              </Pill>
              {Number.isFinite(parsedHours) && parsedHours > 0 ? (
                <Pill tone="chip">{`${parsedHours.toFixed(1)} hr`}</Pill>
              ) : null}
              {Number.isFinite(parsedHeight) && parsedHeight > 0 ? (
                <Pill tone="chip">{`${parsedHeight.toFixed(0)} ${heightUnit}`}</Pill>
              ) : null}
            </View>
            {lockedNotice ? (
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
                  <Text style={{ ...type.cardTitle, color: tokens.text }}>{lockedNotice.title}</Text>
                  <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 2 }}>
                    {lockedNotice.body}
                  </Text>
                </View>
              </View>
            ) : null}
          </Card>
        </View>

        <SectionH kicker="01 SITE & TASK" title="What and where" />
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <Field label="Site" value={site} onChangeText={setSite} placeholder="Tower / plant / bridge" />
          <View>
            <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 6 }}>TASK</Text>
            <ChipSelect value={workTask} options={TASK_OPTIONS} onChange={setWorkTask} />
            <View style={{ marginTop: 8 }}>
              <Field
                label="Or write your own"
                value={workTask}
                onChangeText={setWorkTask}
                placeholder="Inspection / maintenance / rescue cover"
              />
            </View>
          </View>
          <View>
            <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 6 }}>ACCESS</Text>
            <ChipSelect value={accessMethod} options={ACCESS_OPTIONS} onChange={setAccessMethod} />
          </View>
          <Field
            label="Rope access hours"
            value={hours}
            onChangeText={setHours}
            keyboardType="decimal-pad"
            placeholder="8"
          />
        </View>

        <SectionH kicker="02 DATES & PARTIES" title="When and who" />
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <DateField
                label="From"
                value={dateFrom || null}
                onChange={(iso) => setDateFrom(iso ?? '')}
                maxDate={dateTo || null}
              />
            </View>
            <View style={{ flex: 1 }}>
              <DateField
                label="To"
                value={dateTo || null}
                onChange={(iso) => setDateTo(iso ?? '')}
                minDate={dateFrom || null}
              />
            </View>
          </View>
          <Field
            label="Employer"
            value={employer}
            onChangeText={setEmployer}
            placeholder="Company"
            autoCapitalize="words"
          />
          <Field
            label="Client"
            value={client}
            onChangeText={setClient}
            placeholder="Customer / contractor"
            autoCapitalize="words"
          />
        </View>

        <SectionH kicker="03 STRUCTURE & HEIGHT" title="On the rope" />
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
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

        <SectionH kicker="04 NOTES" title="Work performed" />
        <View style={{ paddingHorizontal: 20 }}>
          <Field
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="What work was performed on rope?"
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
            <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 6 }}>
              Auditors separate training and assessment hours from on-rope work.
            </Text>
          </View>
          <Field
            label="Rescue cover"
            value={rescueCover}
            onChangeText={setRescueCover}
            placeholder="e.g. Standing rescue — J. Lee, radio ch. 3"
            helper="Who's standing rescue, or the self-rescue plan."
          />
          <View>
            <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 6 }}>HAZARDS</Text>
            <MultiChipSelect
              values={hazards}
              options={[...HAZARD_PRESETS]}
              onChange={setHazards}
            />
            <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 6 }}>
              Tap each hazard present on the job. Extra context goes in Notes above.
            </Text>
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
          disabled={!canSave || updateDraft.isPending}
        >
          {updateDraft.isPending
            ? 'Saving…'
            : canSave && isAuditReady
              ? 'Save audit-ready draft'
              : 'Save draft'}
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
