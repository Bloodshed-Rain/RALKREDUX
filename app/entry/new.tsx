import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Copy, Minus, PenLine, Plus, Send } from 'lucide-react-native';
import { isValidIsoDateRange, todayLocalIsoDate } from '@/src/domain/date-utils';
import type { CertLevel } from '@/src/domain/profile/types';
import type {
  CreateEntryInput,
  EntryTemplate,
  HeightUnit,
  SupervisorContact,
  UpdateDraftEntryInput,
} from '@/src/domain/logbook/types';
import {
  useCreateEntry,
  useEntries,
  useEntryTemplates,
  useSupervisorContacts,
  useUpdateDraftEntry,
} from '@/src/domain/logbook/use-logbook';
import { useProfile } from '@/src/domain/profile/use-profile';
import { DateField } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

const WORK_TASK_PRESETS = ['Inspection', 'Maintenance', 'Rescue standby', 'Training'];
const ACCESS_METHOD_PRESETS = ['Two-rope access', 'Aid climb', 'Rescue cover', 'Fall restraint'];
const STEP_TITLES = ['JOB PARTICULARS', 'ACTIVITY', 'VERIFY & SUBMIT'];
const STEP_SUBTITLES = [
  'Date · site · client · task',
  'Hours · work · level',
  'Pick supervisor · choose path',
];
const TOTAL_STEPS = 3;

interface DraftState {
  entryId: string | null;
  dateFrom: string;
  dateTo: string;
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
  spratLevel: CertLevel | null;
  irataLevel: CertLevel | null;
  selectedSupervisorId: string | null;
}

function initialDraft(): DraftState {
  return {
    entryId: null,
    dateFrom: todayLocalIsoDate(),
    dateTo: todayLocalIsoDate(),
    employer: '',
    site: '',
    client: '',
    workTask: '',
    accessMethod: 'Two-rope access',
    structureType: '',
    maxHeight: '',
    heightUnit: 'ft',
    description: '',
    hours: '8',
    spratLevel: null,
    irataLevel: null,
    selectedSupervisorId: null,
  };
}

function hasAnyContent(draft: DraftState): boolean {
  return (
    draft.entryId !== null ||
    draft.employer.trim().length > 0 ||
    draft.site.trim().length > 0 ||
    draft.client.trim().length > 0 ||
    draft.workTask.trim().length > 0 ||
    draft.description.trim().length > 0 ||
    draft.structureType.trim().length > 0 ||
    draft.maxHeight.trim().length > 0
  );
}

function step1Ready(draft: DraftState): boolean {
  const validRange = isValidIsoDateRange(draft.dateFrom, draft.dateTo || draft.dateFrom);
  const hasAnchor = draft.employer.trim().length > 0 || draft.site.trim().length > 0;
  return validRange && hasAnchor;
}

function step2Ready(draft: DraftState): boolean {
  const hours = Number(draft.hours);
  return Number.isFinite(hours) && hours > 0;
}

function step3Missing(draft: DraftState): string[] {
  const missing: string[] = [];
  if (!isValidIsoDateRange(draft.dateFrom, draft.dateTo || draft.dateFrom)) missing.push('valid work dates');
  if (!draft.employer.trim()) missing.push('employer');
  if (!draft.site.trim()) missing.push('site or location');
  if (!draft.client.trim()) missing.push('client');
  if (!draft.workTask.trim()) missing.push('work task');
  if (!draft.accessMethod.trim()) missing.push('access method');
  if (!draft.structureType.trim()) missing.push('structure type');
  if (!draft.description.trim()) missing.push('work description');
  const hours = Number(draft.hours);
  if (!Number.isFinite(hours) || hours <= 0) missing.push('rope access hours');
  const height = Number(draft.maxHeight);
  if (!Number.isFinite(height) || height <= 0) missing.push('maximum height');
  return missing;
}

function buildCreateInput(draft: DraftState): CreateEntryInput {
  const hours = Number(draft.hours);
  const height = Number(draft.maxHeight);
  return {
    employer: draft.employer,
    site: draft.site,
    client: draft.client,
    description: draft.description,
    work_hours: Number.isFinite(hours) ? hours : 0,
    work_task: draft.workTask,
    access_method: draft.accessMethod,
    structure_type: draft.structureType,
    max_height: Number.isFinite(height) ? height : 0,
    height_unit: draft.heightUnit,
    date_from: draft.dateFrom,
    date_to: draft.dateTo || draft.dateFrom,
    sprat_level_snapshot: draft.spratLevel,
    irata_level_snapshot: draft.irataLevel,
  };
}

function buildUpdateInput(draft: DraftState, entryId: string): UpdateDraftEntryInput {
  return { ...buildCreateInput(draft), entry_id: entryId };
}

export default function NewEntryWizard() {
  const { tidewater, typography, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const profile = useProfile();
  const entries = useEntries();
  const templates = useEntryTemplates();
  const supervisors = useSupervisorContacts();
  const createEntry = useCreateEntry();
  const updateDraft = useUpdateDraftEntry();

  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [draft, setDraft] = React.useState<DraftState>(initialDraft);
  const [busy, setBusy] = React.useState<null | 'draft' | 'sign' | 'request'>(null);
  const prefilledCertLevels = React.useRef(false);

  const update = React.useCallback((patch: Partial<DraftState>) => {
    setDraft((s) => ({ ...s, ...patch }));
  }, []);

  React.useEffect(() => {
    if (prefilledCertLevels.current) return;
    if (!profile.data) return;
    prefilledCertLevels.current = true;
    update({
      spratLevel: profile.data.sprat_level,
      irataLevel: profile.data.irata_level,
    });
  }, [profile.data, update]);

  const missingForSign = React.useMemo(() => step3Missing(draft), [draft]);
  const signReady = missingForSign.length === 0;

  async function commitDraft(): Promise<string | null> {
    if (!draft.entryId) {
      const created = await createEntry.mutateAsync(buildCreateInput(draft));
      update({ entryId: created.id });
      return created.id;
    }
    await updateDraft.mutateAsync(buildUpdateInput(draft, draft.entryId));
    return draft.entryId;
  }

  async function handleContinue() {
    if (step === 1) {
      if (!step1Ready(draft)) return;
      try {
        await commitDraft();
        setStep(2);
      } catch (err) {
        Alert.alert('Could not save draft', err instanceof Error ? err.message : String(err));
      }
    } else if (step === 2) {
      if (!step2Ready(draft)) return;
      try {
        await commitDraft();
        setStep(3);
      } catch (err) {
        Alert.alert('Could not update draft', err instanceof Error ? err.message : String(err));
      }
    }
  }

  function handleBack() {
    if (step === 1) {
      handleClose();
    } else {
      setStep((step - 1) as 1 | 2);
    }
  }

  function handleClose() {
    if (hasAnyContent(draft) && !draft.entryId) {
      Alert.alert(
        'Discard new entry?',
        "You haven't saved anything yet. Discard or keep editing?",
        [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
        ],
      );
      return;
    }
    if (draft.entryId) {
      router.replace(`/entry/${draft.entryId}`);
    } else {
      router.back();
    }
  }

  async function handleSignNow() {
    setBusy('sign');
    try {
      const id = await commitDraft();
      if (id) router.replace(`/entry/${id}/sign`);
    } catch (err) {
      Alert.alert('Could not save before signing', err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleRequestRemote() {
    setBusy('request');
    try {
      const id = await commitDraft();
      if (id) router.replace(`/entry/${id}/request-signature`);
    } catch (err) {
      Alert.alert('Could not save before requesting', err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleSaveDraft() {
    setBusy('draft');
    try {
      const id = await commitDraft();
      if (id) router.replace(`/entry/${id}`);
      else router.back();
    } catch (err) {
      Alert.alert('Could not save draft', err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  function applyTemplate(template: EntryTemplate) {
    update({
      employer: template.employer || draft.employer,
      client: template.client || draft.client,
      workTask: template.work_task,
      accessMethod: template.access_method,
      structureType: template.structure_type,
      description: template.description,
      hours: String(template.work_hours),
      maxHeight: template.max_height === null ? '' : String(template.max_height),
      heightUnit: template.height_unit,
    });
  }

  function duplicateLast() {
    const latest = entries.data?.[0];
    if (!latest) return;
    update({
      employer: latest.employer,
      site: latest.site,
      client: latest.client,
      workTask: latest.work_task,
      accessMethod: latest.access_method,
      structureType: latest.structure_type,
      maxHeight: latest.max_height === null ? '' : String(latest.max_height),
      heightUnit: latest.height_unit,
      description: latest.description,
      hours: String(latest.work_hours),
      dateFrom: todayLocalIsoDate(),
      dateTo: todayLocalIsoDate(),
    });
  }

  const canContinue =
    step === 1 ? step1Ready(draft) : step === 2 ? step2Ready(draft) : false;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: tidewater.paper }}
      >
        <View style={{ paddingTop: insets.top, backgroundColor: tidewater.ink, position: 'relative' }}>
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              height: 4,
              width: 80,
              backgroundColor: tidewater.accent,
            }}
          />
          <View
            style={{
              paddingHorizontal: spacing.base,
              paddingTop: spacing.sm,
              paddingBottom: spacing.md,
              gap: 4,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Pressable onPress={handleBack} hitSlop={12} accessibilityRole="button">
                <Text style={{ ...typography.formNumber, color: tidewater.paper }}>
                  {step === 1 ? '✕ CANCEL' : '← BACK'}
                </Text>
              </Pressable>
              <Text style={{ ...typography.formNumber, color: 'rgba(230,236,232,0.6)' }}>
                STEP {String(step).padStart(2, '0')} / {String(TOTAL_STEPS).padStart(2, '0')}
              </Text>
            </View>
            <Text
              style={{
                fontFamily: 'Archivo_900Black',
                fontSize: 28,
                lineHeight: 32,
                color: tidewater.paper,
                fontWeight: '900',
                letterSpacing: -0.2,
                marginTop: 4,
              }}
            >
              {STEP_TITLES[step - 1]}
            </Text>
            <Text style={{ ...typography.monoSm, color: 'rgba(230,236,232,0.7)' }}>
              {STEP_SUBTITLES[step - 1]}
            </Text>
          </View>
        </View>

        <View style={{ height: 6, backgroundColor: tidewater.paper2, flexDirection: 'row' }}>
          <View
            style={{
              width: `${(step / TOTAL_STEPS) * 100}%`,
              backgroundColor: tidewater.accent,
            }}
          />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: spacing.base,
            gap: spacing.md,
            paddingBottom: spacing.xxl,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {step === 1 ? (
            <Step1
              draft={draft}
              update={update}
              templates={templates.data ?? []}
              hasLast={Boolean(entries.data?.length)}
              onApplyTemplate={applyTemplate}
              onDuplicateLast={duplicateLast}
            />
          ) : null}
          {step === 2 ? <Step2 draft={draft} update={update} /> : null}
          {step === 3 ? (
            <Step3
              draft={draft}
              update={update}
              supervisors={supervisors.data ?? []}
              missingFields={missingForSign}
              signReady={signReady}
              busy={busy}
              onSignNow={handleSignNow}
              onRequestRemote={handleRequestRemote}
              onSaveDraft={handleSaveDraft}
            />
          ) : null}
        </ScrollView>

        {step < 3 ? (
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              paddingHorizontal: spacing.base,
              paddingTop: spacing.sm,
              paddingBottom: spacing.base + insets.bottom,
              borderTopWidth: 1,
              borderTopColor: tidewater.hairFaint,
              backgroundColor: tidewater.paper,
            }}
          >
            <Pressable
              onPress={handleBack}
              style={({ pressed }) => ({
                flex: 1,
                height: 52,
                borderWidth: 1.5,
                borderColor: tidewater.ink,
                backgroundColor: tidewater.white,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  ...typography.displaySm,
                  color: tidewater.ink,
                  letterSpacing: 1.5,
                }}
              >
                {step === 1 ? 'CANCEL' : 'BACK'}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleContinue}
              disabled={!canContinue}
              style={({ pressed }) => ({
                flex: 1.6,
                height: 52,
                borderWidth: 1.5,
                borderColor: tidewater.ink,
                backgroundColor: canContinue ? tidewater.accent : tidewater.paper2,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed && canContinue ? 0.85 : 1,
              })}
            >
              <Text
                style={{
                  ...typography.displaySm,
                  color: canContinue ? tidewater.paper : tidewater.ink3,
                  letterSpacing: 1.5,
                }}
              >
                CONTINUE →
              </Text>
            </Pressable>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </>
  );
}

function Step1({
  draft,
  update,
  templates,
  hasLast,
  onApplyTemplate,
  onDuplicateLast,
}: {
  draft: DraftState;
  update: (patch: Partial<DraftState>) => void;
  templates: EntryTemplate[];
  hasLast: boolean;
  onApplyTemplate: (t: EntryTemplate) => void;
  onDuplicateLast: () => void;
}) {
  const { tidewater, typography, spacing } = useTheme();

  return (
    <View style={{ gap: spacing.md }}>
      {templates.length > 0 || hasLast ? (
        <View style={{ gap: spacing.xs }}>
          <SectionLabel n="01" label="QUICK START" />
          {templates.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.xs }}
            >
              {templates.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => onApplyTemplate(t)}
                  style={{
                    borderWidth: 1.5,
                    borderColor: tidewater.hair,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    style={{
                      ...typography.displaySm,
                      color: tidewater.ink,
                      letterSpacing: 1.5,
                    }}
                  >
                    {t.name.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          {hasLast ? (
            <Pressable
              onPress={onDuplicateLast}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
                borderWidth: 1.5,
                borderColor: tidewater.hair,
                paddingHorizontal: spacing.sm,
                paddingVertical: 8,
                alignSelf: 'flex-start',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Copy color={tidewater.ink} size={14} strokeWidth={2.2} />
              <Text
                style={{
                  ...typography.displaySm,
                  color: tidewater.ink,
                  letterSpacing: 1.5,
                }}
              >
                DUPLICATE LAST ENTRY
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={{ gap: spacing.xs }}>
        <SectionLabel n="02" label="WORK DATES" />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <DateField
              label="From"
              value={draft.dateFrom}
              onChange={(v) => update({ dateFrom: v })}
            />
          </View>
          <View style={{ flex: 1 }}>
            <DateField
              label="To"
              value={draft.dateTo}
              onChange={(v) => update({ dateTo: v })}
            />
          </View>
        </View>
      </View>

      <FormCellInput
        n="03"
        label="EMPLOYER"
        value={draft.employer}
        onChangeText={(v) => update({ employer: v })}
        placeholder="Company name"
      />

      <FormCellInput
        n="04"
        label="SITE / LOCATION"
        value={draft.site}
        onChangeText={(v) => update({ site: v })}
        placeholder="Tower · plant · bridge"
      />

      <FormCellInput
        n="05"
        label="CLIENT"
        value={draft.client}
        onChangeText={(v) => update({ client: v })}
        placeholder="Customer · contractor"
      />

      <View style={{ gap: spacing.xs }}>
        <SectionLabel n="06" label="WORK TASK" />
        <ChipRow
          value={draft.workTask}
          options={WORK_TASK_PRESETS}
          onSelect={(v) => update({ workTask: v })}
        />
        <PlainInput
          value={draft.workTask}
          onChangeText={(v) => update({ workTask: v })}
          placeholder="Custom task"
        />
      </View>

      <View style={{ gap: spacing.xs }}>
        <SectionLabel n="07" label="ACCESS METHOD" />
        <ChipRow
          value={draft.accessMethod}
          options={ACCESS_METHOD_PRESETS}
          onSelect={(v) => update({ accessMethod: v })}
        />
        <PlainInput
          value={draft.accessMethod}
          onChangeText={(v) => update({ accessMethod: v })}
          placeholder="Custom access method"
        />
      </View>

      <FormCellInput
        n="08"
        label="STRUCTURE TYPE"
        value={draft.structureType}
        onChangeText={(v) => update({ structureType: v })}
        placeholder="Tower · bridge · vessel"
      />

      <View style={{ gap: spacing.xs }}>
        <SectionLabel n="09" label="MAX HEIGHT" />
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
          <View style={{ flex: 2 }}>
            <PlainInput
              value={draft.maxHeight}
              onChangeText={(v) => update({ maxHeight: v.replace(/[^\d.]/g, '') })}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              borderWidth: 1.5,
              borderColor: tidewater.hair,
            }}
          >
            {(['ft', 'm'] as const).map((unit, i) => {
              const active = draft.heightUnit === unit;
              return (
                <Pressable
                  key={unit}
                  onPress={() => update({ heightUnit: unit })}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    backgroundColor: active ? tidewater.ink : 'transparent',
                    borderRightWidth: i === 0 ? 1 : 0,
                    borderRightColor: tidewater.hairSoft,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      ...typography.displaySm,
                      color: active ? tidewater.paper : tidewater.ink2,
                      letterSpacing: 1.5,
                    }}
                  >
                    {unit.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

function Step2({
  draft,
  update,
}: {
  draft: DraftState;
  update: (patch: Partial<DraftState>) => void;
}) {
  const { tidewater, typography, spacing } = useTheme();
  const hoursNum = Number(draft.hours);
  const hoursFloat = Number.isFinite(hoursNum) ? hoursNum : 0;
  const whole = Math.floor(hoursFloat);
  const dec = Math.round((hoursFloat - whole) * 10);

  function bumpHours(delta: number) {
    const next = Math.max(0, Math.round((hoursFloat + delta) * 10) / 10);
    update({ hours: String(next) });
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <View
        style={{
          borderWidth: 1.5,
          borderColor: tidewater.hair,
          backgroundColor: tidewater.white,
          padding: spacing.md,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.8 }}>
            § 10 · HOURS ON ROPE
          </Text>
          <Text style={{ ...typography.monoSm, color: tidewater.ink3 }}>HRS</Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: spacing.sm,
            gap: spacing.md,
          }}
        >
          <Pressable
            onPress={() => bumpHours(-0.5)}
            accessibilityRole="button"
            accessibilityLabel="Decrease hours"
            style={({ pressed }) => ({
              width: 56,
              height: 56,
              borderWidth: 1.5,
              borderColor: tidewater.ink,
              backgroundColor: tidewater.white,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Minus color={tidewater.ink} size={28} strokeWidth={2.4} />
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text
              style={{
                fontFamily: 'Archivo_900Black',
                fontSize: 56,
                lineHeight: 56,
                color: tidewater.ink,
                fontWeight: '900',
                letterSpacing: -1,
              }}
            >
              {String(whole).padStart(2, '0')}
            </Text>
            <Text
              style={{
                fontFamily: 'Archivo_900Black',
                fontSize: 36,
                lineHeight: 36,
                color: tidewater.accent,
                fontWeight: '900',
                marginLeft: 2,
                paddingBottom: 4,
              }}
            >
              .{dec}
            </Text>
          </View>
          <Pressable
            onPress={() => bumpHours(0.5)}
            accessibilityRole="button"
            accessibilityLabel="Increase hours"
            style={({ pressed }) => ({
              width: 56,
              height: 56,
              borderWidth: 1.5,
              borderColor: tidewater.ink,
              backgroundColor: tidewater.accent,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Plus color={tidewater.paper} size={28} strokeWidth={2.4} />
          </Pressable>
        </View>
        <Text
          style={{
            ...typography.monoSm,
            color: tidewater.ink3,
            marginTop: spacing.xs,
            textAlign: 'center',
          }}
        >
          TAP ± · 0.5 HR INCREMENT
        </Text>
      </View>

      <View style={{ gap: spacing.xs }}>
        <SectionLabel n="11" label="WORK PERFORMED" />
        <TextInput
          value={draft.description}
          onChangeText={(v) => update({ description: v })}
          multiline
          placeholder="What was done on rope?"
          placeholderTextColor={tidewater.ink3}
          style={{
            borderWidth: 1.5,
            borderColor: tidewater.hair,
            backgroundColor: tidewater.white,
            padding: spacing.sm,
            ...typography.body,
            color: tidewater.ink,
            minHeight: 120,
            textAlignVertical: 'top',
          }}
        />
      </View>

      <View style={{ gap: spacing.xs }}>
        <SectionLabel
          n="12"
          label="CERT LEVEL ON THIS JOB"
          right="pulled from profile"
        />
        <View style={{ gap: spacing.xs }}>
          <CertLevelRow
            scheme="SPRAT"
            value={draft.spratLevel}
            onChange={(v) => update({ spratLevel: v })}
          />
          <CertLevelRow
            scheme="IRATA"
            value={draft.irataLevel}
            onChange={(v) => update({ irataLevel: v })}
          />
        </View>
      </View>
    </View>
  );
}

function Step3({
  draft,
  update,
  supervisors,
  missingFields,
  signReady,
  busy,
  onSignNow,
  onRequestRemote,
  onSaveDraft,
}: {
  draft: DraftState;
  update: (patch: Partial<DraftState>) => void;
  supervisors: SupervisorContact[];
  missingFields: string[];
  signReady: boolean;
  busy: null | 'draft' | 'sign' | 'request';
  onSignNow: () => void;
  onRequestRemote: () => void;
  onSaveDraft: () => void;
}) {
  const { tidewater, typography, spacing } = useTheme();
  const summaryRows: { label: string; value: string }[] = [
    {
      label: 'DATE',
      value: draft.dateFrom === draft.dateTo ? draft.dateFrom : `${draft.dateFrom} → ${draft.dateTo}`,
    },
    { label: 'EMPLOYER', value: draft.employer || '—' },
    { label: 'SITE', value: draft.site || '—' },
    { label: 'CLIENT', value: draft.client || '—' },
    { label: 'TASK', value: draft.workTask || '—' },
    { label: 'ACCESS', value: draft.accessMethod || '—' },
    { label: 'STRUCTURE', value: draft.structureType || '—' },
    {
      label: 'HEIGHT',
      value: draft.maxHeight ? `${draft.maxHeight} ${draft.heightUnit}` : '—',
    },
    { label: 'HOURS', value: Number(draft.hours).toFixed(1) },
  ];

  return (
    <View style={{ gap: spacing.lg }}>
      <View
        style={{
          borderWidth: 1.5,
          borderColor: tidewater.hair,
          backgroundColor: tidewater.white,
        }}
      >
        <View
          style={{
            paddingHorizontal: spacing.sm,
            paddingVertical: 6,
            borderBottomWidth: 1.5,
            borderBottomColor: tidewater.hair,
          }}
        >
          <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.8 }}>
            § 13 · RECORD SUMMARY
          </Text>
        </View>
        {summaryRows.map((row, i) => (
          <View
            key={row.label}
            style={{
              flexDirection: 'row',
              paddingHorizontal: spacing.sm,
              paddingVertical: 6,
              borderBottomWidth: i < summaryRows.length - 1 ? 1 : 0,
              borderBottomColor: tidewater.hairFaint,
              gap: spacing.sm,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                ...typography.monoSm,
                color: tidewater.ink3,
                width: 84,
                letterSpacing: 1.2,
              }}
            >
              {row.label}
            </Text>
            <Text
              style={{ flex: 1, ...typography.monoMd, color: tidewater.ink }}
              numberOfLines={2}
            >
              {row.value}
            </Text>
          </View>
        ))}
        {draft.description ? (
          <View
            style={{
              padding: spacing.sm,
              borderTopWidth: 1,
              borderTopColor: tidewater.hairFaint,
            }}
          >
            <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.2 }}>
              NOTES
            </Text>
            <Text style={{ ...typography.body, color: tidewater.ink, marginTop: 4 }}>
              {draft.description}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ gap: spacing.xs }}>
        <SectionLabel
          n="14"
          label="SUPERVISOR"
          right="select if signing or requesting"
        />
        {supervisors.length === 0 ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: tidewater.hairSoft,
              padding: spacing.md,
            }}
          >
            <Text style={{ ...typography.body, color: tidewater.ink2 }}>
              No supervisors on file yet. The sign and request screens will let you enter one inline.
            </Text>
          </View>
        ) : (
          <View style={{ borderWidth: 1.5, borderColor: tidewater.hair }}>
            {supervisors.map((sup, i) => {
              const active = draft.selectedSupervisorId === sup.id;
              return (
                <Pressable
                  key={sup.id}
                  onPress={() =>
                    update({ selectedSupervisorId: active ? null : sup.id })
                  }
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 10,
                    borderBottomWidth: i < supervisors.length - 1 ? 1 : 0,
                    borderBottomColor: tidewater.hairFaint,
                    backgroundColor: active ? tidewater.accentSoft : 'transparent',
                    borderLeftWidth: active ? 4 : 0,
                    borderLeftColor: tidewater.accent,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typography.bodyBold, color: tidewater.ink }}>
                      {sup.name}
                    </Text>
                    <Text style={{ ...typography.monoSm, color: tidewater.ink3 }}>
                      {[sup.role, sup.cert_number].filter(Boolean).join(' · ') || '—'}
                    </Text>
                  </View>
                  {active ? (
                    <Text
                      style={{
                        ...typography.monoSm,
                        color: tidewater.accent,
                        fontWeight: '600',
                        letterSpacing: 1.5,
                      }}
                    >
                      SELECTED
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {!signReady ? (
        <View
          style={{
            borderWidth: 1.5,
            borderColor: tidewater.yellowDeep,
            backgroundColor: tidewater.yellowSoft,
            padding: spacing.md,
          }}
        >
          <Text style={{ ...typography.displaySm, color: tidewater.ink, letterSpacing: 1.2 }}>
            BEFORE SIGNING
          </Text>
          <Text style={{ ...typography.monoSm, color: tidewater.ink2, marginTop: 4 }}>
            Missing: {missingFields.join(', ')}
          </Text>
          <Text style={{ ...typography.monoSm, color: tidewater.ink3, marginTop: 4 }}>
            Save as draft is still available — finish the fields when you can.
          </Text>
        </View>
      ) : (
        <View
          style={{
            borderWidth: 1.5,
            borderColor: tidewater.accent,
            backgroundColor: tidewater.accentSoft,
            padding: spacing.md,
          }}
        >
          <Text style={{ ...typography.bodyMed, color: tidewater.ink, lineHeight: 22 }}>
            Submitting locks this record into your hash chain. Amendments require a counter-signed
            appendix per IRATA ICOP §G.4.
          </Text>
        </View>
      )}

      <View style={{ gap: spacing.sm }}>
        <Pressable
          onPress={onSignNow}
          disabled={!signReady || busy !== null}
          style={({ pressed }) => ({
            height: 56,
            borderWidth: 1.5,
            borderColor: tidewater.ink,
            backgroundColor: !signReady ? tidewater.paper2 : tidewater.accent,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
            opacity: pressed && signReady ? 0.85 : 1,
          })}
        >
          <PenLine
            color={!signReady ? tidewater.ink3 : tidewater.paper}
            size={20}
            strokeWidth={2.2}
          />
          <Text
            style={{
              ...typography.displaySm,
              color: !signReady ? tidewater.ink3 : tidewater.paper,
              letterSpacing: 1.5,
            }}
          >
            {busy === 'sign' ? 'OPENING SIGN…' : 'SIGN NOW'}
          </Text>
        </Pressable>

        <Pressable
          onPress={onRequestRemote}
          disabled={!signReady || busy !== null}
          style={({ pressed }) => ({
            height: 52,
            borderWidth: 1.5,
            borderColor: tidewater.ink,
            backgroundColor: tidewater.white,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
            opacity: pressed && signReady ? 0.85 : signReady ? 1 : 0.5,
          })}
        >
          <Send
            color={signReady ? tidewater.ink : tidewater.ink3}
            size={18}
            strokeWidth={2.2}
          />
          <Text
            style={{
              ...typography.displaySm,
              color: signReady ? tidewater.ink : tidewater.ink3,
              letterSpacing: 1.5,
            }}
          >
            {busy === 'request' ? 'OPENING REQUEST…' : 'REQUEST REMOTE SIGNATURE'}
          </Text>
        </Pressable>

        <Pressable
          onPress={onSaveDraft}
          disabled={busy !== null}
          style={({ pressed }) => ({
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <Text
            style={{
              ...typography.monoMd,
              color: tidewater.ink3,
              letterSpacing: 1.4,
            }}
          >
            {busy === 'draft' ? 'SAVING…' : 'SAVE AS DRAFT'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function SectionLabel({
  n,
  label,
  right,
}: {
  n: string;
  label: string;
  right?: string;
}) {
  const { tidewater, typography, spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
        <Text style={{ ...typography.monoSm, color: tidewater.ink3 }}>§ {n}</Text>
        <Text
          style={{
            ...typography.displaySm,
            color: tidewater.ink,
            letterSpacing: 1.2,
          }}
        >
          {label}
        </Text>
      </View>
      {right ? (
        <Text
          style={{
            ...typography.monoSm,
            color: tidewater.ink3,
            fontStyle: 'italic',
          }}
        >
          {right}
        </Text>
      ) : null}
    </View>
  );
}

function FormCellInput({
  n,
  label,
  value,
  onChangeText,
  placeholder,
}: {
  n: string;
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={{ gap: 4 }}>
      <SectionLabel n={n} label={label} />
      <PlainInput value={value} onChangeText={onChangeText} placeholder={placeholder} />
    </View>
  );
}

function PlainInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
}) {
  const { tidewater, typography, spacing } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={tidewater.ink3}
      keyboardType={keyboardType ?? 'default'}
      style={{
        borderWidth: 1.5,
        borderColor: tidewater.hair,
        backgroundColor: tidewater.white,
        paddingHorizontal: spacing.sm,
        paddingVertical: 10,
        ...typography.body,
        color: tidewater.ink,
        minHeight: 44,
      }}
    />
  );
}

function ChipRow({
  value,
  options,
  onSelect,
}: {
  value: string;
  options: string[];
  onSelect: (v: string) => void;
}) {
  const { tidewater, typography, spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => onSelect(opt)}
            style={{
              borderWidth: 1.5,
              borderColor: active ? tidewater.accent : tidewater.hair,
              backgroundColor: active ? tidewater.accentSoft : 'transparent',
              paddingHorizontal: spacing.sm,
              paddingVertical: 6,
            }}
          >
            <Text
              style={{
                ...typography.displaySm,
                color: tidewater.ink,
                letterSpacing: 1.5,
              }}
            >
              {opt.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function CertLevelRow({
  scheme,
  value,
  onChange,
}: {
  scheme: string;
  value: CertLevel | null;
  onChange: (v: CertLevel | null) => void;
}) {
  const { tidewater, typography, spacing } = useTheme();
  const levels: CertLevel[] = ['I', 'II', 'III'];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Text
        style={{
          ...typography.displaySm,
          color: tidewater.ink,
          letterSpacing: 1.5,
          width: 70,
        }}
      >
        {scheme}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          flex: 1,
          borderWidth: 1.5,
          borderColor: tidewater.hair,
        }}
      >
        <Pressable
          onPress={() => onChange(null)}
          style={{
            flex: 1,
            paddingVertical: 8,
            backgroundColor: value === null ? tidewater.ink : 'transparent',
            borderRightWidth: 1,
            borderRightColor: tidewater.hairSoft,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              ...typography.monoSm,
              color: value === null ? tidewater.paper : tidewater.ink3,
              letterSpacing: 1.5,
            }}
          >
            N/A
          </Text>
        </Pressable>
        {levels.map((lvl, i) => {
          const active = value === lvl;
          return (
            <Pressable
              key={lvl}
              onPress={() => onChange(lvl)}
              style={{
                flex: 1,
                paddingVertical: 8,
                backgroundColor: active ? tidewater.accent : 'transparent',
                borderRightWidth: i < levels.length - 1 ? 1 : 0,
                borderRightColor: tidewater.hairSoft,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  ...typography.monoSm,
                  color: active ? tidewater.paper : tidewater.ink2,
                  letterSpacing: 1.5,
                }}
              >
                {lvl}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
