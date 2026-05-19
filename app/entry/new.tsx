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
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureOrPickPhoto } from '@/src/ui/photo-picker';
import { isValidIsoDateRange, todayLocalIsoDate } from '@/src/domain/date-utils';
import type {
  CreateEntryInput,
  EntryKind,
  HeightUnit,
  SupervisorContact,
  UpdateDraftEntryInput,
} from '@/src/domain/logbook/types';
import { HAZARD_PRESETS } from '@/src/domain/logbook/hazards';
import { parseHazards } from '@/src/domain/logbook/types';
import type { CertLevel } from '@/src/domain/profile/types';
import {
  useAddEntryAttachment,
  useAttachGearToEntry,
  useCreateEntry,
  useDeleteDraftEntry,
  useEntries,
  useEntryDetail,
  useRemoveGearFromEntry,
  useSupervisorContacts,
  useUpdateDraftEntry,
} from '@/src/domain/logbook/use-logbook';
import { useGearItems } from '@/src/domain/gear/use-gear';
import { useProfile } from '@/src/domain/profile/use-profile';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import {
  Button,
  Card,
  ChipSelect,
  Field,
  MultiChipSelect,
  Pill,
  PhotoStrip,
  type PhotoStripItem,
} from '@/src/ui/primitives/v2';
import { GEAR_ICON, IconClose, IconSign, IconWarn } from '@/src/ui/icons';
import {
  DEFAULT_TERMINAL_ACTION,
  PrefKeys,
  isTerminalActionPref,
  readPref,
  type TerminalActionPref,
} from '@/src/storage/local-prefs';
import { haptics } from '@/src/ui/haptics';
import type { GearCategory } from '@/src/domain/gear/types';

const WORK_TASK_PRESETS = ['Inspection', 'Maintenance', 'Rescue standby', 'Training'];
const ACCESS_METHOD_PRESETS = ['Two-rope access', 'Aid climb', 'Rescue cover', 'Fall restraint'];
const STRUCTURE_PRESETS = ['Tower', 'Tank', 'Bridge', 'Wind turbine', 'Building'];
const ENTRY_KIND_OPTIONS: Array<{ value: EntryKind; label: string }> = [
  { value: 'work', label: 'Work' },
  { value: 'training', label: 'Training' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'rescue_drill', label: 'Rescue drill' },
];
const HEIGHT_UNIT_OPTIONS = [
  { value: 'ft' as HeightUnit, label: 'ft' },
  { value: 'm' as HeightUnit, label: 'm' },
];

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
  // v3 fields.
  entryKind: EntryKind;
  rescueCover: string;
  hazards: string[];
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
    entryKind: 'work',
    rescueCover: '',
    hazards: [],
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
  return draft.workTask.trim().length > 0 && Number(draft.hours) > 0;
}

function buildCreateInput(draft: DraftState): CreateEntryInput {
  const maxHeightTrimmed = draft.maxHeight.trim();
  const maxHeight = maxHeightTrimmed === '' ? 0 : Number(maxHeightTrimmed);
  return {
    date_from: draft.dateFrom,
    date_to: draft.dateTo || draft.dateFrom,
    employer: draft.employer.trim(),
    site: draft.site.trim(),
    client: draft.client.trim(),
    description: draft.description.trim(),
    work_hours: Number(draft.hours) || 0,
    work_task: draft.workTask.trim(),
    access_method: draft.accessMethod.trim(),
    structure_type: draft.structureType.trim(),
    max_height: Number.isFinite(maxHeight) ? maxHeight : 0,
    height_unit: draft.heightUnit,
    sprat_level_snapshot: draft.spratLevel,
    irata_level_snapshot: draft.irataLevel,
    entry_kind: draft.entryKind,
    rescue_cover: draft.rescueCover,
    hazards: draft.hazards,
  };
}

function buildUpdateInput(draft: DraftState, entryId: string): UpdateDraftEntryInput {
  return { entry_id: entryId, ...buildCreateInput(draft) };
}

function withSupervisor(path: string, supervisorId: string | null): string {
  return supervisorId ? `${path}?supervisor=${encodeURIComponent(supervisorId)}` : path;
}

export default function NewEntryWizard() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const profile = useProfile();
  const entries = useEntries();
  const supervisors = useSupervisorContacts();
  const createEntry = useCreateEntry();
  const updateDraft = useUpdateDraftEntry();
  const deleteDraft = useDeleteDraftEntry();

  // QuickLogCard's "Same as last" chip routes here with ?seed=last so the
  // wizard pre-fills site/client/employer/work context from the most recent
  // entry. We intentionally don't seed dates, hours, or description — those
  // are the "what happened today" fields the tech still needs to enter.
  const { seed } = useLocalSearchParams<{ seed?: string | string[] }>();
  const seedKind = Array.isArray(seed) ? seed[0] : seed;

  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [draft, setDraft] = React.useState<DraftState>(initialDraft);
  const [busy, setBusy] = React.useState<null | 'draft' | 'sign' | 'request'>(null);
  const [defaultTerminalAction, setDefaultTerminalAction] =
    React.useState<TerminalActionPref>(DEFAULT_TERMINAL_ACTION);
  const prefilledCertLevels = React.useRef(false);
  const seededFromLast = React.useRef(false);

  React.useEffect(() => {
    readPref<TerminalActionPref>(PrefKeys.defaultTerminalAction, DEFAULT_TERMINAL_ACTION).then(
      (stored) => {
        if (isTerminalActionPref(stored)) setDefaultTerminalAction(stored);
      },
    );
  }, []);

  const update = React.useCallback((patch: Partial<DraftState>) => {
    setDraft((s) => ({ ...s, ...patch }));
  }, []);

  React.useEffect(() => {
    if (prefilledCertLevels.current || !profile.data) return;
    prefilledCertLevels.current = true;
    update({
      spratLevel: profile.data.sprat_level,
      irataLevel: profile.data.irata_level,
    });
  }, [profile.data, update]);

  // Seed the wizard from the latest entry when arrived via `?seed=last`.
  // Fires once entries finish loading, never on subsequent renders so
  // the user's edits aren't clobbered.
  React.useEffect(() => {
    if (seededFromLast.current) return;
    if (seedKind !== 'last') return;
    const list = entries.data;
    if (!list || list.length === 0) return;
    seededFromLast.current = true;
    const last = list[0];
    update({
      employer: last.employer,
      site: last.site,
      client: last.client,
      workTask: last.work_task,
      accessMethod: last.access_method || 'Two-rope access',
      structureType: last.structure_type,
      maxHeight: last.max_height == null ? '' : String(last.max_height),
      heightUnit: last.height_unit,
      entryKind: last.entry_kind,
      rescueCover: last.rescue_cover ?? '',
      hazards: parseHazards(last.hazards),
    });
  }, [seedKind, entries.data, update]);

  const recentSites = React.useMemo(() => {
    const out = new Set<string>();
    for (const e of entries.data ?? []) {
      if (e.site && out.size < 6) out.add(e.site);
    }
    return Array.from(out);
  }, [entries.data]);

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
    if (draft.entryId) {
      const committedId = draft.entryId;
      haptics.warning();
      Alert.alert(
        'Cancel new entry?',
        'Step 1 already saved a draft on this device. Keep it for later or delete it now?',
        [
          { text: 'Keep editing', style: 'cancel' },
          {
            text: 'Keep draft',
            onPress: () => router.replace(`/entry/${committedId}`),
          },
          {
            text: 'Delete draft',
            style: 'destructive',
            onPress: () => {
              deleteDraft.mutate(committedId, { onSettled: () => router.back() });
            },
          },
        ],
      );
      return;
    }
    if (hasAnyContent(draft)) {
      haptics.warning();
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
    router.back();
  }

  async function handleSignNow() {
    setBusy('sign');
    try {
      const id = await commitDraft();
      if (id) router.replace(withSupervisor(`/entry/${id}/sign`, draft.selectedSupervisorId) as never);
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
      if (id) {
        router.replace(
          withSupervisor(`/entry/${id}/request-signature`, draft.selectedSupervisorId) as never,
        );
      }
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
      if (id) router.replace(`/entry/${id}` as never);
      else router.back();
    } catch (err) {
      Alert.alert('Could not save draft', err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  const canContinue =
    step === 1 ? step1Ready(draft) : step === 2 ? step2Ready(draft) : false;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: tokens.bg }}
    >
      <SheetHeader
        step={step}
        title={['Where', 'What', 'Review'][step - 1]}
        sub={['Date · site · client · task', 'Hours · work · gear · photos', 'Choose what happens next'][step - 1]}
        onClose={handleClose}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 6,
          paddingBottom: 24,
          gap: 14,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {step === 1 ? (
          <StepWhere draft={draft} update={update} recentSites={recentSites} />
        ) : null}
        {step === 2 ? <StepWhat draft={draft} update={update} /> : null}
        {step === 3 ? (
          <StepReview
            draft={draft}
            update={update}
            supervisors={supervisors.data ?? []}
            defaultTerminalAction={defaultTerminalAction}
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
            gap: 10,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 12 + insets.bottom,
            borderTopWidth: 1,
            borderTopColor: tokens.lineSoft,
            backgroundColor: tokens.bg,
          }}
        >
          <Button variant="ghost" full onPress={handleBack}>
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          <Button variant="primary" full onPress={handleContinue} disabled={!canContinue}>
            Continue
          </Button>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

// ──────────────────────────────────────────────────────────────────────────

function SheetHeader({
  step,
  title,
  sub,
  onClose,
}: {
  step: 1 | 2 | 3;
  title: string;
  sub: string;
  onClose: () => void;
}) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: Math.max(insets.top, 12),
        paddingHorizontal: 20,
        paddingBottom: 14,
        backgroundColor: tokens.bg,
        gap: 8,
      }}
    >
      <View
        style={{
          alignSelf: 'center',
          width: 36,
          height: 4,
          borderRadius: 999,
          backgroundColor: tokens.line,
          marginBottom: 6,
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', gap: 4, flex: 1 }}>
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 999,
                backgroundColor: s <= step ? tokens.accent : tokens.lineSoft,
              }}
            />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          hitSlop={10}
          style={{ marginLeft: 12 }}
        >
          <IconClose size={24} color={tokens.textDim} />
        </Pressable>
      </View>
      <View style={{ marginTop: 8 }}>
        <Text
          style={{
            fontFamily: 'Manrope_800ExtraBold',
            fontWeight: '800',
            fontSize: 28,
            lineHeight: 32,
            letterSpacing: -0.84,
            color: tokens.text,
          }}
        >
          {title}
        </Text>
        <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 2 }}>{sub}</Text>
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────

interface StepProps {
  draft: DraftState;
  update: (patch: Partial<DraftState>) => void;
}

function StepWhere({
  draft,
  update,
  recentSites,
}: StepProps & { recentSites: string[] }) {
  const { tokens } = useTheme();
  return (
    <View style={{ gap: 14 }}>
      {recentSites.length > 0 ? (
        <View>
          <SectionKicker>RECENT SITES</SectionKicker>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {recentSites.map((site) => (
              <Pressable
                key={site}
                accessibilityRole="button"
                onPress={() => {
                  haptics.selection();
                  update({ site });
                }}
                style={({ pressed }) => [
                  {
                    paddingVertical: 6,
                    paddingHorizontal: 11,
                    borderRadius: 999,
                    backgroundColor: tokens.surface2,
                    borderWidth: 1,
                    borderColor: tokens.lineSoft,
                  },
                  pressed ? { transform: [{ scale: 0.97 }] } : null,
                ]}
              >
                <Text style={{ ...type.cardSub, color: tokens.text }} numberOfLines={1}>
                  {site}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <Field
        label="Site"
        value={draft.site}
        onChangeText={(v) => update({ site: v })}
        placeholder="Where the work happened"
        autoCapitalize="words"
      />
      <Field
        label="Client"
        value={draft.client}
        onChangeText={(v) => update({ client: v })}
        placeholder="Who hired you"
        autoCapitalize="words"
      />
      <Field
        label="Employer"
        value={draft.employer}
        onChangeText={(v) => update({ employer: v })}
        placeholder="Who paid you"
        autoCapitalize="words"
      />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Date from"
            value={draft.dateFrom}
            onChangeText={(v) => update({ dateFrom: v, dateTo: draft.dateTo || v })}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="Date to"
            value={draft.dateTo}
            onChangeText={(v) => update({ dateTo: v })}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
            helper={isValidIsoDateRange(draft.dateFrom, draft.dateTo || draft.dateFrom) ? undefined : 'Invalid range'}
          />
        </View>
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────

function StepWhat({ draft, update }: StepProps) {
  const { tokens } = useTheme();
  const gearItems = useGearItems();
  const detail = useEntryDetail(draft.entryId);
  const attachGear = useAttachGearToEntry();
  const removeGear = useRemoveGearFromEntry();
  const addAttachment = useAddEntryAttachment();

  const attachedGearIds = new Set(
    (detail.data?.gear_usage ?? []).map(({ gear }) => gear.id),
  );
  const selectableGear = (gearItems.data ?? []).filter(({ status }) => status !== 'retired');
  const attachments = detail.data?.attachments ?? [];
  const gearBusy = attachGear.isPending || removeGear.isPending;

  function toggleGear(gearId: string, category: string) {
    if (!draft.entryId || gearBusy) return;
    haptics.selection();
    if (attachedGearIds.has(gearId)) {
      removeGear.mutate({ entry_id: draft.entryId, gear_id: gearId });
    } else {
      attachGear.mutate({ entry_id: draft.entryId, gear_id: gearId, role: category });
    }
  }

  async function addPhoto() {
    if (!draft.entryId || addAttachment.isPending) return;
    const photo = await captureOrPickPhoto();
    if (!photo) return;
    addAttachment.mutate({
      entry_id: draft.entryId,
      label: photo.fileName || 'Evidence photo',
      uri: photo.uri,
      mime_type: photo.mimeType ?? 'image/jpeg',
    });
  }

  const photoItems: PhotoStripItem[] = attachments.map((a) => ({
    id: a.id,
    uri: a.uri,
    label: a.label,
  }));

  return (
    <View style={{ gap: 14 }}>
      <View>
        <SectionKicker>WORK TASK</SectionKicker>
        <ChipSelect
          value={draft.workTask}
          options={WORK_TASK_PRESETS.map((t) => ({ value: t, label: t }))}
          onChange={(v) => update({ workTask: v })}
        />
      </View>

      <View>
        <SectionKicker>STRUCTURE</SectionKicker>
        <ChipSelect
          value={draft.structureType}
          options={STRUCTURE_PRESETS.map((t) => ({ value: t, label: t }))}
          onChange={(v) => update({ structureType: v })}
        />
      </View>

      <View>
        <SectionKicker>ACCESS METHOD</SectionKicker>
        <ChipSelect
          value={draft.accessMethod}
          options={ACCESS_METHOD_PRESETS.map((t) => ({ value: t, label: t }))}
          onChange={(v) => update({ accessMethod: v })}
        />
      </View>

      <View>
        <SectionKicker>ENTRY KIND</SectionKicker>
        <ChipSelect<EntryKind>
          value={draft.entryKind}
          options={ENTRY_KIND_OPTIONS}
          onChange={(v) => update({ entryKind: v })}
        />
        <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 6 }}>
          Auditors split training and assessment hours from on-rope work.
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Hours"
            value={draft.hours}
            onChangeText={(v) => update({ hours: v })}
            keyboardType="decimal-pad"
            suffix="hrs"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="Max height"
            value={draft.maxHeight}
            onChangeText={(v) => update({ maxHeight: v })}
            keyboardType="decimal-pad"
            suffix={
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {HEIGHT_UNIT_OPTIONS.map((opt) => {
                  const active = draft.heightUnit === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      accessibilityRole="button"
                      onPress={() => update({ heightUnit: opt.value })}
                      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                      style={{
                        paddingVertical: 2,
                        paddingHorizontal: 6,
                        borderRadius: 4,
                        backgroundColor: active ? tokens.accent : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'JetBrainsMono_600SemiBold',
                          fontSize: 11,
                          color: active ? tokens.accentInk : tokens.textDim,
                        }}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            }
          />
        </View>
      </View>

      <Field
        label="Description"
        value={draft.description}
        onChangeText={(v) => update({ description: v })}
        placeholder="What you did, conditions, anything notable"
        multiline
      />

      <Field
        label="Rescue cover"
        value={draft.rescueCover}
        onChangeText={(v) => update({ rescueCover: v })}
        placeholder="e.g. Standing rescue — J. Lee, radio ch. 3"
        helper="Who's standing rescue, or the self-rescue plan."
      />

      <View>
        <SectionKicker>HAZARDS</SectionKicker>
        <MultiChipSelect
          values={draft.hazards}
          options={[...HAZARD_PRESETS]}
          onChange={(next) => update({ hazards: next })}
        />
        <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 6 }}>
          Tap each hazard present on the job. Extra context goes in Description.
        </Text>
      </View>

      <View>
        <SectionKicker>GEAR USED</SectionKicker>
        {!draft.entryId ? (
          <Text style={{ ...type.cardSub, color: tokens.textDim }}>
            Saved on continue — gear and photos attach after.
          </Text>
        ) : selectableGear.length === 0 ? (
          <Text style={{ ...type.cardSub, color: tokens.textDim }}>
            No active gear yet. Add gear from the Gear tab.
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {selectableGear.slice(0, 8).map(({ item }) => {
              const active = attachedGearIds.has(item.id);
              const Icon = GEAR_ICON[item.category as GearCategory];
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => toggleGear(item.id, item.category)}
                  disabled={gearBusy}
                  style={({ pressed }) => [
                    {
                      width: '22%',
                      minWidth: 70,
                      aspectRatio: 1,
                      borderRadius: 14,
                      borderWidth: active ? 2 : 1,
                      borderColor: active ? tokens.accent : tokens.lineSoft,
                      backgroundColor: active ? tokens.accentSoft : tokens.surface,
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 6,
                      gap: 4,
                    },
                    pressed ? { transform: [{ scale: 0.97 }] } : null,
                  ]}
                >
                  <Icon
                    size={26}
                    color={active ? tokens.accent : tokens.text}
                    fill={tokens.accent}
                  />
                  <Text
                    style={{
                      ...type.cardSub,
                      color: active ? tokens.accent : tokens.textDim,
                      textAlign: 'center',
                    }}
                    numberOfLines={1}
                  >
                    {item.category}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View>
        <SectionKicker>PHOTO EVIDENCE</SectionKicker>
        <PhotoStrip
          photos={photoItems}
          onCapture={addPhoto}
          capturePending={addAttachment.isPending}
          disabled={!draft.entryId}
        />
        {!draft.entryId ? (
          <Text style={{ ...type.cardSub, color: tokens.textFaint, marginTop: 6 }}>
            Photos attach after Step 1 saves the draft.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────

interface ChoiceConfig {
  key: 'sign' | 'request' | 'draft';
  label: string;
  hint: string;
  primary?: boolean;
}

const TERMINAL_ACTION_SEQUENCE: TerminalActionPref[] = ['sign', 'request', 'draft'];

function orderActions(pref: TerminalActionPref): TerminalActionPref[] {
  return [pref, ...TERMINAL_ACTION_SEQUENCE.filter((k) => k !== pref)];
}

function StepReview({
  draft,
  update,
  supervisors,
  defaultTerminalAction,
  busy,
  onSignNow,
  onRequestRemote,
  onSaveDraft,
}: StepProps & {
  supervisors: SupervisorContact[];
  defaultTerminalAction: TerminalActionPref;
  busy: null | 'draft' | 'sign' | 'request';
  onSignNow: () => void;
  onRequestRemote: () => void;
  onSaveDraft: () => void;
}) {
  const { tokens } = useTheme();

  const choices: Record<TerminalActionPref, ChoiceConfig> = {
    sign: {
      key: 'sign',
      label: 'Sign in person',
      hint: 'Hand the phone to a supervisor now to seal the entry.',
    },
    request: {
      key: 'request',
      label: 'Request remote signature',
      hint: 'Send a verifier link to a supervisor off-site.',
    },
    draft: {
      key: 'draft',
      label: 'Save as draft',
      hint: 'Park the entry. Sign or send for signature later.',
    },
  };
  const ordered = orderActions(defaultTerminalAction).map((k) => ({
    ...choices[k],
    primary: k === defaultTerminalAction,
  }));

  function handlePress(action: TerminalActionPref) {
    if (action === 'sign') onSignNow();
    else if (action === 'request') onRequestRemote();
    else onSaveDraft();
  }

  return (
    <View style={{ gap: 14 }}>
      <Card padding={16}>
        <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>REVIEW</Text>
        <Text style={{ ...type.heroCardTitle, color: tokens.text, marginTop: 4 }} numberOfLines={2}>
          {draft.site || 'Untitled site'}
        </Text>
        <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 2 }} numberOfLines={1}>
          {[draft.client, draft.workTask].filter(Boolean).join(' · ') || '—'}
        </Text>
        <View style={{ height: 1, backgroundColor: tokens.lineSoft, marginVertical: 14 }} />
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <Stat label="Hours" value={(Number(draft.hours) || 0).toFixed(1)} />
          <Stat
            label="Height"
            value={
              draft.maxHeight.trim() === ''
                ? '—'
                : `${draft.maxHeight} ${draft.heightUnit}`
            }
          />
          <Stat label="Access" value={draft.accessMethod || '—'} />
        </View>
      </Card>

      {supervisors.length > 0 ? (
        <View>
          <SectionKicker>SUPERVISOR (OPTIONAL)</SectionKicker>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => update({ selectedSupervisorId: null })}
              style={({ pressed }) => [
                supervisorChipStyle(tokens, draft.selectedSupervisorId == null),
                pressed ? { transform: [{ scale: 0.97 }] } : null,
              ]}
            >
              <Text
                style={{
                  ...type.cardSub,
                  color: draft.selectedSupervisorId == null ? tokens.accentInk : tokens.text,
                }}
              >
                None
              </Text>
            </Pressable>
            {supervisors.slice(0, 6).map((s) => {
              const active = draft.selectedSupervisorId === s.id;
              return (
                <Pressable
                  key={s.id}
                  accessibilityRole="button"
                  onPress={() => update({ selectedSupervisorId: s.id })}
                  style={({ pressed }) => [
                    supervisorChipStyle(tokens, active),
                    pressed ? { transform: [{ scale: 0.97 }] } : null,
                  ]}
                >
                  <Text style={{ ...type.cardSub, color: active ? tokens.accentInk : tokens.text }}>
                    {s.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        {ordered.map((choice) => (
          <ChoiceRow
            key={choice.key}
            label={choice.label}
            hint={choice.hint}
            emphasis={choice.primary}
            disabled={busy != null && busy !== choice.key}
            loading={busy === choice.key}
            onPress={() => handlePress(choice.key)}
          />
        ))}
      </View>

      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          padding: 12,
          borderRadius: 12,
          backgroundColor: tokens.warnSoft,
        }}
      >
        <IconWarn size={21} color={tokens.warn} fill={tokens.warn} />
        <Text style={{ ...type.cardSub, color: tokens.warn, flex: 1 }}>
          Once an entry is signed, it can't be edited. Amendments are new entries that point back
          to the original. Pick "Save as draft" if you're not sure yet.
        </Text>
      </View>
    </View>
  );
}

function supervisorChipStyle(tokens: ReturnType<typeof useTheme>['tokens'], active: boolean): ViewStyle {
  return {
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: active ? tokens.accent : tokens.surface2,
    borderWidth: 1,
    borderColor: active ? tokens.accent : tokens.lineSoft,
  };
}

// ──────────────────────────────────────────────────────────────────────────

function ChoiceRow({
  label,
  hint,
  emphasis,
  disabled,
  loading,
  onPress,
}: {
  label: string;
  hint: string;
  emphasis?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 14,
          borderRadius: 14,
          backgroundColor: emphasis ? tokens.accent : tokens.surface,
          borderWidth: 1,
          borderColor: emphasis ? tokens.accent : tokens.lineSoft,
          opacity: disabled ? 0.5 : 1,
        },
        pressed && !disabled ? { transform: [{ scale: 0.99 }] } : null,
      ]}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          backgroundColor: emphasis ? 'rgba(0,0,0,0.12)' : tokens.surface2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <IconSign
          size={24}
          color={emphasis ? tokens.accentInk : tokens.text}
          fill={emphasis ? tokens.accentInk : tokens.accent}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            ...type.cardTitle,
            color: emphasis ? tokens.accentInk : tokens.text,
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text
          style={{
            ...type.cardSub,
            color: emphasis ? tokens.accentInk : tokens.textDim,
            opacity: emphasis ? 0.85 : 1,
            marginTop: 2,
          }}
          numberOfLines={2}
        >
          {loading ? 'Saving…' : hint}
        </Text>
      </View>
      {emphasis ? <Pill tone="chip" size="sm">Default</Pill> : null}
    </Pressable>
  );
}

// ──────────────────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  const { tokens } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ ...type.detailStat, color: tokens.text }} numberOfLines={1}>
        {value}
      </Text>
      <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 2 }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function SectionKicker({ children }: { children: string }) {
  const { tokens } = useTheme();
  const kickerStyle: TextStyle = {
    ...type.monoKicker,
    color: tokens.textFaint,
    marginBottom: 8,
  };
  return <Text style={kickerStyle}>{children}</Text>;
}
