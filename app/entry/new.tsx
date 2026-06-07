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
import { persistAttachmentFile } from '@/src/ui/attachment-storage';
import { isValidIsoDateRange, todayLocalIsoDate } from '@/src/domain/date-utils';
import type {
  CreateEntryInput,
  EntryKind,
  HeightUnit,
  SupervisorContact,
  UpdateDraftEntryInput,
} from '@/src/domain/logbook/types';
import {
  WORK_TASK_PRESETS,
  ACCESS_METHOD_PRESETS,
  STRUCTURE_PRESETS,
  HAZARD_PRESETS,
} from '@/src/domain/logbook/classification';
import { parseHazards, parseStringList } from '@/src/domain/logbook/types';
import type { CertLevel } from '@/src/domain/profile/types';
import {
  useAddEntryAttachment,
  useAttachGearToEntry,
  useCreateEntry,
  useDeleteDraftEntry,
  useEntries,
  useEntryDetail,
  useRecentClassificationValues,
  useRecentHazardValues,
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
  ClassificationPickerSheet,
  DateField,
  Field,
  PhotoStrip,
  Pill,
  type PhotoStripItem,
} from '@/src/ui/primitives/v2';
import {
  GEAR_ICON,
  IconClose,
  IconDraft,
  IconExport,
  IconSign,
  IconWarn,
  type IconProps,
} from '@/src/ui/icons';
import {
  DEFAULT_TERMINAL_ACTION,
  PrefKeys,
  isTerminalActionPref,
  readPref,
  type TerminalActionPref,
} from '@/src/storage/local-prefs';
import { haptics } from '@/src/ui/haptics';
import type { GearCategory } from '@/src/domain/gear/types';

const ENTRY_KIND_OPTIONS: TileOption<EntryKind>[] = [
  { value: 'work', label: 'Work' },
  { value: 'training', label: 'Training' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'rescue_drill', label: 'Rescue drill' },
];
const HEIGHT_UNIT_OPTIONS = [
  { value: 'ft' as HeightUnit, label: 'ft' },
  { value: 'm' as HeightUnit, label: 'm' },
];

// The wizard is a 6-page flow, each page deliberately light. The required spine
// is split across the first three pages (where → hours → task); structure,
// height and the optional details never block Next.
type Step = 1 | 2 | 3 | 4 | 5 | 6;
const TOTAL_STEPS = 6;
const STEP_TITLES = ['Where', 'Kind & hours', 'Task & access', 'Structure & height', 'Details', 'Review'];
const STEP_SUBS = [
  'Site · client · employer · dates',
  'What kind of work · hours',
  'What you did · how you got there',
  'What you worked on · how high',
  'Work description, plus optional extras',
  'Choose what happens next',
];

interface DraftState {
  entryId: string | null;
  dateFrom: string;
  dateTo: string;
  employer: string;
  site: string;
  client: string;
  workTask: string[];
  accessMethod: string[];
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
    workTask: [],
    accessMethod: ['Two-rope access'],
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
    draft.workTask.length > 0 ||
    draft.description.trim().length > 0 ||
    draft.structureType.trim().length > 0 ||
    draft.maxHeight.trim().length > 0
  );
}

// Each page's gate. The required spine is spread across the first three pages:
// where (1) → hours (2) → work task (3); structure/height/details (4–6) never
// block. Same total requirement as the old step1/step2 gates, just re-split.
function stepReady(step: Step, draft: DraftState): boolean {
  if (step === 1) {
    const validRange = isValidIsoDateRange(draft.dateFrom, draft.dateTo || draft.dateFrom);
    return (
      validRange &&
      draft.site.trim().length > 0 &&
      draft.client.trim().length > 0 &&
      draft.employer.trim().length > 0
    );
  }
  if (step === 2) return Number(draft.hours) > 0;
  if (step === 3) return draft.workTask.length > 0 && draft.accessMethod.length > 0;
  if (step === 4) return draft.structureType.trim().length > 0 && Number(draft.maxHeight) > 0;
  if (step === 5) return draft.description.trim().length > 0;
  return true;
}

// "a, b and c" — grammatical join for the missing-field summary.
function listToText(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

// Names the field(s) still blocking Next so the tech isn't left hunting a
// red-outlined page with no explanation. Mirrors stepReady's required set.
function missingStepHint(step: Step, draft: DraftState): string | null {
  const need: string[] = [];
  if (step === 1) {
    if (!isValidIsoDateRange(draft.dateFrom, draft.dateTo || draft.dateFrom)) {
      need.push('a valid date range');
    }
    if (!draft.site.trim()) need.push('a site');
    if (!draft.client.trim()) need.push('a client');
    if (!draft.employer.trim()) need.push('an employer');
  } else if (step === 2) {
    if (!(Number(draft.hours) > 0)) need.push('hours worked');
  } else if (step === 3) {
    if (draft.workTask.length === 0) need.push('a work task');
    if (draft.accessMethod.length === 0) need.push('an access method');
  } else if (step === 4) {
    if (!draft.structureType.trim()) need.push('a structure');
    if (!(Number(draft.maxHeight) > 0)) need.push('a maximum height');
  } else if (step === 5) {
    if (!draft.description.trim()) need.push('a work description');
  }
  return need.length ? `Add ${listToText(need)} to continue.` : null;
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
    work_task: draft.workTask[0] ?? '',
    access_method: draft.accessMethod[0] ?? '',
    work_task_list: draft.workTask,
    access_method_list: draft.accessMethod,
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

  const [step, setStep] = React.useState<Step>(1);
  const [draft, setDraft] = React.useState<DraftState>(initialDraft);
  const [busy, setBusy] = React.useState<null | 'draft' | 'sign' | 'request'>(null);
  // Flips the current page's empty required fields to a red outline once the tech
  // taps Next with the page incomplete. Reset on every page change so each page
  // only shows red after its own failed attempt.
  const [showErrors, setShowErrors] = React.useState(false);
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
      workTask: parseStringList(last.work_task_list).length
        ? parseStringList(last.work_task_list)
        : last.work_task
          ? [last.work_task]
          : [],
      accessMethod: parseStringList(last.access_method_list).length
        ? parseStringList(last.access_method_list)
        : last.access_method
          ? [last.access_method]
          : ['Two-rope access'],
      structureType: last.structure_type,
      maxHeight: last.max_height == null ? '' : String(last.max_height),
      heightUnit: last.height_unit,
      entryKind: last.entry_kind,
      rescueCover: last.rescue_cover ?? '',
      hazards: parseHazards(last.hazards),
    });
  }, [seedKind, entries.data, update]);

  // Recent distinct values per party field (entries.data is newest-first) for
  // the one-tap "recent" chips on Step 1 — a returning tech rarely retypes a
  // site/client/employer they've logged before. Capped low (3 each) to keep
  // page 1 calm, since the redesign is deliberately moving away from pill density.
  const recents = React.useMemo(() => {
    const sites = new Set<string>();
    const clients = new Set<string>();
    const employers = new Set<string>();
    for (const e of entries.data ?? []) {
      if (e.site && sites.size < 3) sites.add(e.site);
      if (e.client && clients.size < 3) clients.add(e.client);
      if (e.employer && employers.size < 3) employers.add(e.employer);
    }
    return {
      sites: Array.from(sites),
      clients: Array.from(clients),
      employers: Array.from(employers),
    };
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
    if (step >= TOTAL_STEPS) return;
    if (!stepReady(step, draft)) {
      // Reveal the red outlines on the empty required fields instead of silently
      // doing nothing, and block progress.
      setShowErrors(true);
      haptics.error();
      return;
    }
    try {
      // Commit on every Next so the on-disk draft always matches the screen —
      // page 1 creates it (giving the Details page an entryId for gear/photos),
      // later pages update it.
      await commitDraft();
      // Clear synchronously with the advance so the next page never renders a
      // frame with the previous page's red still on.
      setShowErrors(false);
      setStep((step + 1) as Step);
    } catch (err) {
      Alert.alert('Could not save draft', err instanceof Error ? err.message : String(err));
    }
  }

  function handleBack() {
    if (step === 1) {
      handleClose();
    } else {
      setShowErrors(false);
      setStep((step - 1) as Step);
    }
  }

  function handleClose() {
    // Nothing typed and nothing committed → just leave.
    if (!draft.entryId && !hasAnyContent(draft)) {
      router.back();
      return;
    }
    // Otherwise ALWAYS offer to park the work as a draft — even mid-wizard with
    // required fields still empty. Forward progress toward signing is gated, but
    // exiting must never lose what's been entered.
    const committedId = draft.entryId;
    haptics.warning();
    Alert.alert(
      committedId ? 'Leave this entry?' : 'Save this entry as a draft?',
      "Save what you've entered as a draft to finish later, or discard it.",
      [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Save as draft',
          onPress: async () => {
            try {
              // Commit the CURRENT state (create or update) so this page's edits
              // aren't lost, then drop into the saved entry.
              const id = await commitDraft();
              if (id) router.replace(`/entry/${id}` as never);
              else router.back();
            } catch (err) {
              Alert.alert(
                'Could not save draft',
                err instanceof Error ? err.message : String(err),
              );
            }
          },
        },
        {
          text: committedId ? 'Delete draft' : 'Discard',
          style: 'destructive',
          onPress: () => {
            if (committedId) {
              deleteDraft.mutate(committedId, { onSettled: () => router.back() });
            } else {
              router.back();
            }
          },
        },
      ],
    );
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: tokens.bg }}
    >
      <SheetHeader
        step={step}
        title={STEP_TITLES[step - 1]}
        sub={STEP_SUBS[step - 1]}
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
          <StepWhere draft={draft} update={update} recents={recents} showErrors={showErrors} />
        ) : null}
        {step === 2 ? (
          <StepKindHours draft={draft} update={update} showErrors={showErrors} />
        ) : null}
        {step === 3 ? (
          <StepTaskAccess draft={draft} update={update} showErrors={showErrors} />
        ) : null}
        {step === 4 ? (
          <StepStructureHeight draft={draft} update={update} showErrors={showErrors} />
        ) : null}
        {step === 5 ? (
          <StepDetails draft={draft} update={update} showErrors={showErrors} />
        ) : null}
        {step === 6 ? (
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

      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 12 + insets.bottom,
          borderTopWidth: 1,
          borderTopColor: tokens.lineSoft,
          backgroundColor: tokens.bg,
          gap: 8,
        }}
      >
        {showErrors && missingStepHint(step, draft) ? (
          <Text style={{ ...type.cardSub, color: tokens.danger }}>
            {missingStepHint(step, draft)}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {step < TOTAL_STEPS ? (
            <>
              <Button variant="ghost" grow onPress={handleBack}>
                {step === 1 ? 'Cancel' : 'Back'}
              </Button>
              <Button variant="primary" grow onPress={handleContinue}>
                {step === TOTAL_STEPS - 1 ? 'Review' : 'Next'}
              </Button>
            </>
          ) : (
            <Button variant="ghost" full onPress={handleBack}>
              Back to edit
            </Button>
          )}
        </View>
      </View>
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
  step: Step;
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
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
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

// One-tap "recent values" chip row for a Step 1 party field. Renders nothing
// when there's no history, so a first-ever entry stays clean and the row only
// earns its space once the tech has logged before.
function RecentChips({
  label,
  values,
  onPick,
}: {
  label: string;
  values: string[];
  onPick: (value: string) => void;
}) {
  const { tokens } = useTheme();
  if (values.length === 0) return null;
  return (
    <View>
      <SectionKicker>{label}</SectionKicker>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {values.map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={`Use ${value}`}
            onPress={() => {
              haptics.selection();
              onPick(value);
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
              {value}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function StepWhere({
  draft,
  update,
  recents,
  showErrors,
}: StepProps & {
  recents: { sites: string[]; clients: string[]; employers: string[] };
  showErrors?: boolean;
}) {
  // Site, client and employer are each independently required for an audit-ready
  // entry, so each lights up red on its own when left empty.
  return (
    <View style={{ gap: 14 }}>
      {/* Each field is paired with its own recent-value chips (when any exist)
          so a returning tech taps instead of types. The chips hug the field
          below them; the whole group sits in the screen's 14px rhythm. */}
      <View style={{ gap: 6 }}>
        <RecentChips
          label="RECENT SITES"
          values={recents.sites}
          onPick={(site) => update({ site })}
        />
        <Field
          label="Site"
          value={draft.site}
          onChangeText={(v) => update({ site: v })}
          placeholder="Where the work happened"
          autoCapitalize="words"
          invalid={!!showErrors && !draft.site.trim()}
        />
      </View>

      <View style={{ gap: 6 }}>
        <RecentChips
          label="RECENT CLIENTS"
          values={recents.clients}
          onPick={(client) => update({ client })}
        />
        <Field
          label="Client"
          value={draft.client}
          onChangeText={(v) => update({ client: v })}
          placeholder="Who hired you"
          autoCapitalize="words"
          invalid={!!showErrors && !draft.client.trim()}
        />
      </View>

      <View style={{ gap: 6 }}>
        <RecentChips
          label="RECENT EMPLOYERS"
          values={recents.employers}
          onPick={(employer) => update({ employer })}
        />
        <Field
          label="Employer"
          value={draft.employer}
          onChangeText={(v) => update({ employer: v })}
          placeholder="Who paid you"
          autoCapitalize="words"
          invalid={!!showErrors && !draft.employer.trim()}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <DateField
            label="Date from"
            value={draft.dateFrom || null}
            onChange={(iso) => update({ dateFrom: iso ?? '', dateTo: draft.dateTo || iso || '' })}
            maxDate={draft.dateTo || null}
          />
        </View>
        <View style={{ flex: 1 }}>
          <DateField
            label="Date to"
            value={draft.dateTo || null}
            onChange={(iso) => update({ dateTo: iso ?? '' })}
            minDate={draft.dateFrom || null}
            error={isValidIsoDateRange(draft.dateFrom, draft.dateTo || draft.dateFrom) ? undefined : 'Invalid range'}
          />
        </View>
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────

// Page 2 — the required spine begins: what kind of work, and how many hours.
function StepKindHours({ draft, update, showErrors }: StepProps & { showErrors?: boolean }) {
  const { tokens } = useTheme();
  return (
    <View style={{ gap: 20 }}>
      <View>
        <SectionKicker>ENTRY KIND</SectionKicker>
        <TileGrid
          options={ENTRY_KIND_OPTIONS}
          selectedValues={[draft.entryKind]}
          onPress={(value) => update({ entryKind: value })}
        />
        <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 8 }}>
          Sets what the hours count toward — training and assessment stay separate
          from on-rope work.
        </Text>
      </View>

      <View>
        <SectionKicker>HOURS ON ROPE</SectionKicker>
        <Field
          value={draft.hours}
          onChangeText={(v) => update({ hours: v })}
          keyboardType="decimal-pad"
          suffix="hrs"
          accessibilityLabel="Hours on rope"
          invalid={!!showErrors && !(Number(draft.hours) > 0)}
        />
      </View>
    </View>
  );
}

// Page 3 — what you did and how you got there. Both multi-select tile grids.
function StepTaskAccess({ draft, update, showErrors }: StepProps & { showErrors?: boolean }) {
  const recentWorkTask = useRecentClassificationValues('work_task');
  const recentAccess = useRecentClassificationValues('access_method');
  return (
    <View style={{ gap: 20 }}>
      <View>
        <SectionKicker>WORK TASK</SectionKicker>
        <MultiClassificationTiles
          label="Work task"
          values={draft.workTask}
          onChange={(next) => update({ workTask: next })}
          presets={WORK_TASK_PRESETS}
          recents={recentWorkTask.data ?? []}
          invalid={!!showErrors && draft.workTask.length === 0}
        />
      </View>
      <View>
        <SectionKicker>ACCESS METHOD</SectionKicker>
        <MultiClassificationTiles
          label="Access method"
          values={draft.accessMethod}
          onChange={(next) => update({ accessMethod: next })}
          presets={ACCESS_METHOD_PRESETS}
          recents={recentAccess.data ?? []}
          invalid={!!showErrors && draft.accessMethod.length === 0}
        />
      </View>
    </View>
  );
}

// Page 4 — what you worked on, and how high. Structure tiles + a height field.
function StepStructureHeight({
  draft,
  update,
  showErrors,
}: StepProps & { showErrors?: boolean }) {
  const recentStructure = useRecentClassificationValues('structure_type');
  return (
    <View style={{ gap: 20 }}>
      <View>
        <SectionKicker>STRUCTURE</SectionKicker>
        <ClassificationTiles
          label="Structure"
          value={draft.structureType}
          onChange={(v) => update({ structureType: v })}
          presets={STRUCTURE_PRESETS}
          recents={recentStructure.data ?? []}
          invalid={!!showErrors && !draft.structureType.trim()}
        />
      </View>
      <View>
        <SectionKicker>MAXIMUM HEIGHT</SectionKicker>
        <Field
          value={draft.maxHeight}
          onChangeText={(v) => update({ maxHeight: v.replace(/[^\d.]/g, '') })}
          keyboardType="decimal-pad"
          placeholder="120"
          accessibilityLabel="Maximum height"
          invalid={!!showErrors && !(Number(draft.maxHeight) > 0)}
          suffix={
            <HeightUnitToggle value={draft.heightUnit} onChange={(u) => update({ heightUnit: u })} />
          }
        />
      </View>
    </View>
  );
}

// Page 5 — everything optional. A tech can finish and sign without any of it.
function StepDetails({ draft, update, showErrors }: StepProps & { showErrors?: boolean }) {
  const { tokens } = useTheme();
  const recentHazards = useRecentHazardValues();
  const gearItems = useGearItems();
  const detail = useEntryDetail(draft.entryId);
  const attachGear = useAttachGearToEntry();
  const removeGear = useRemoveGearFromEntry();
  const addAttachment = useAddEntryAttachment();

  const attachedGearIds = new Set((detail.data?.gear_usage ?? []).map(({ gear }) => gear.id));
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
    // Persist the picker's transient cache URI to durable storage before it's
    // recorded — a signed entry locks, so a dangling pointer can't be repaired.
    const uri = await persistAttachmentFile(photo.uri);
    addAttachment.mutate({
      entry_id: draft.entryId,
      label: photo.fileName || 'Evidence photo',
      uri,
      mime_type: photo.mimeType ?? 'image/jpeg',
    });
  }

  const photoItems: PhotoStripItem[] = attachments.map((a) => ({
    id: a.id,
    uri: a.uri,
    label: a.label,
  }));

  return (
    <View style={{ gap: 18 }}>
      <Text style={{ ...type.cardSub, color: tokens.textDim }}>
        A work description is required. Hazards, rescue cover, gear and photos are
        optional — add what's relevant.
      </Text>

      <View>
        <SectionKicker>WORK DESCRIPTION</SectionKicker>
        <Field
          value={draft.description}
          onChangeText={(v) => update({ description: v })}
          placeholder="What you did, conditions, anything notable"
          multiline
          accessibilityLabel="Work description"
          invalid={!!showErrors && !draft.description.trim()}
        />
      </View>

      <View>
        <SectionKicker>HAZARDS</SectionKicker>
        <MultiClassificationTiles
          label="Hazards"
          values={draft.hazards}
          onChange={(next) => update({ hazards: next })}
          presets={HAZARD_PRESETS}
          recents={recentHazards.data ?? []}
        />
      </View>

      <View>
        <SectionKicker>RESCUE COVER</SectionKicker>
        <Field
          value={draft.rescueCover}
          onChangeText={(v) => update({ rescueCover: v })}
          placeholder="e.g. Standing rescue — J. Lee, radio ch. 3"
          helper="Who's standing rescue, or the self-rescue plan."
          accessibilityLabel="Rescue cover"
        />
      </View>

      <View>
        <SectionKicker>GEAR USED</SectionKicker>
        {selectableGear.length === 0 ? (
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
                  <Icon size={26} color={tokens.text} fill={tokens.accent} />
                  <Text
                    style={{
                      ...type.cardSub,
                      color: active ? tokens.text : tokens.textDim,
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
      </View>
    </View>
  );
}

// The ft/m switch that rides in the height Field's suffix slot.
function HeightUnitToggle({
  value,
  onChange,
}: {
  value: HeightUnit;
  onChange: (unit: HeightUnit) => void;
}) {
  const { tokens } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {HEIGHT_UNIT_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.value)}
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
  );
}

// ──────────────────────────────────────────────────────────────────────────

// ── Tile selection ─────────────────────────────────────────────────────────

interface TileOption<T extends string = string> {
  value: T;
  label: string;
}

function tileStyle(tokens: ReturnType<typeof useTheme>['tokens'], active: boolean): ViewStyle {
  return {
    width: '48%',
    minHeight: 78,
    borderRadius: 14,
    borderWidth: active ? 2 : 1,
    borderColor: active ? tokens.accent : tokens.lineSoft,
    backgroundColor: active ? tokens.accentSoft : tokens.surface,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  };
}

function tileLabelStyle(tokens: ReturnType<typeof useTheme>['tokens']): TextStyle {
  // Flow through the type scale so tile labels (the wizard's primary tap
  // surface) track UI_SCALE like all other text.
  return {
    ...type.cardTitle,
    color: tokens.text,
    textAlign: 'center',
  };
}

// 2-column grid of big, calm, label-only tiles — the wizard's selection
// primitive in place of the old chip rows. Selection reads from the accent
// border + fill (no glyphs anywhere in the wizard, by design). An optional
// "More / custom" tile (onMore) opens the full searchable picker for the long
// tail + custom entry.
function TileGrid<T extends string = string>({
  options,
  selectedValues,
  onPress,
  onMore,
  invalid,
}: {
  options: TileOption<T>[];
  selectedValues: readonly string[];
  onPress: (value: T) => void;
  onMore?: () => void;
  invalid?: boolean;
}) {
  const { tokens } = useTheme();
  const selected = new Set(selectedValues.map((s) => s.trim().toLowerCase()));
  const grid = (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 10,
      }}
    >
      {options.map((o) => {
        const active = selected.has(o.value.trim().toLowerCase());
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.label}
            onPress={() => {
              haptics.selection();
              onPress(o.value);
            }}
            style={({ pressed }) => [
              tileStyle(tokens, active),
              pressed ? { transform: [{ scale: 0.98 }] } : null,
            ]}
          >
            <Text style={tileLabelStyle(tokens)} numberOfLines={2}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
      {onMore ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="More options or add a custom value"
          onPress={() => {
            haptics.selection();
            onMore();
          }}
          style={({ pressed }) => [
            tileStyle(tokens, false),
            { borderStyle: 'dashed' },
            pressed ? { transform: [{ scale: 0.98 }] } : null,
          ]}
        >
          <Text style={tileLabelStyle(tokens)} numberOfLines={1}>
            ＋ More / custom
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
  // Required-field highlight: wrap the whole group in a danger outline — the
  // tile-grid analogue of Field's border-only `invalid`.
  if (!invalid) return grid;
  return (
    <View
      style={{ borderWidth: 1.5, borderColor: tokens.danger, borderRadius: 16, padding: 8 }}
    >
      {grid}
    </View>
  );
}

// Short preset lists show in full as tiles (access = 7, hazards = 10); long
// ones (work task = 18, structure = 14) show the top 6 and keep the rest in the
// "More" sheet. Hazards are kept whole on purpose — burying a hazard one tap
// deeper is the wrong direction on a safety field.
function inlinePresets(presets: readonly string[]): string[] {
  return presets.length <= 10 ? [...presets] : presets.slice(0, 6);
}

function toTileOptions(values: readonly string[]): TileOption[] {
  return values.map((v) => ({ value: v, label: v }));
}

// Single-select classification field as tiles (e.g. structure). A selected value
// not in the inline set is injected as a leading tile so it stays visible.
function ClassificationTiles({
  value,
  onChange,
  presets,
  recents = [],
  label,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  presets: readonly string[];
  recents?: readonly string[];
  label: string;
  invalid?: boolean;
}) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const trimmed = value.trim();
  const inline = inlinePresets(presets);
  const inInline =
    trimmed.length > 0 && inline.some((p) => p.toLowerCase() === trimmed.toLowerCase());
  const options = toTileOptions([...(trimmed && !inInline ? [trimmed] : []), ...inline]);
  return (
    <>
      <TileGrid
        options={options}
        selectedValues={trimmed ? [trimmed] : []}
        onPress={(v) => onChange(v)}
        onMore={() => setSheetOpen(true)}
        invalid={invalid}
      />
      <ClassificationPickerSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={label}
        presets={presets}
        recents={recents}
        selected={trimmed ? [trimmed] : []}
        onPick={(v) => onChange(v)}
      />
    </>
  );
}

// Multi-select classification field as tiles (work task, access, hazards).
function MultiClassificationTiles({
  values,
  onChange,
  presets,
  recents = [],
  label,
  invalid,
}: {
  values: readonly string[];
  onChange: (values: string[]) => void;
  presets: readonly string[];
  recents?: readonly string[];
  label: string;
  invalid?: boolean;
}) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const inline = inlinePresets(presets);
  const injected = values
    .map((v) => v.trim())
    .filter((v) => v.length > 0 && !inline.some((p) => p.toLowerCase() === v.toLowerCase()));
  const options = toTileOptions([...injected, ...inline]);

  function toggle(value: string) {
    const v = value.trim();
    if (v.length === 0) return;
    const key = v.toLowerCase();
    const next = values.filter((x) => x.trim().toLowerCase() !== key);
    if (next.length === values.length) next.push(v); // wasn't present → add
    onChange(next);
  }

  return (
    <>
      <TileGrid
        options={options}
        selectedValues={values}
        onPress={(v) => toggle(v)}
        onMore={() => setSheetOpen(true)}
        invalid={invalid}
      />
      <ClassificationPickerSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={label}
        presets={presets}
        recents={recents}
        selected={values}
        multi
        onPick={(v) => toggle(v)}
      />
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────

interface ChoiceConfig {
  key: 'sign' | 'request' | 'draft';
  label: string;
  hint: string;
  icon: React.ComponentType<IconProps>;
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
  const kindLabel =
    ENTRY_KIND_OPTIONS.find((o) => o.value === draft.entryKind)?.label ?? 'Work';

  // Recap of the optional "details" page (Step 5), which a fast logger may skip
  // entirely. Echoing it here gives the tech a last-glance "did I leave
  // hazards/rescue empty?" check before the signature is sealed — informational,
  // not a gate. Gear/photos live in the DB (entryId), the rest in the draft.
  const detail = useEntryDetail(draft.entryId);
  const gearCount = detail.data?.gear_usage?.length ?? 0;
  const photoCount = detail.data?.attachments?.length ?? 0;
  const detailBits: string[] = [];
  if (draft.description.trim()) detailBits.push('notes');
  if (draft.hazards.length > 0) {
    detailBits.push(`${draft.hazards.length} hazard${draft.hazards.length > 1 ? 's' : ''}`);
  }
  if (draft.rescueCover.trim()) detailBits.push('rescue cover');
  if (gearCount > 0) detailBits.push(`${gearCount} gear`);
  if (photoCount > 0) detailBits.push(`${photoCount} photo${photoCount > 1 ? 's' : ''}`);

  const choices: Record<TerminalActionPref, ChoiceConfig> = {
    sign: {
      key: 'sign',
      label: 'Sign in person',
      hint: 'Hand the phone to a supervisor now to seal the entry.',
      icon: IconSign,
    },
    request: {
      key: 'request',
      label: 'Request remote signature',
      hint: 'Send a verifier link to a supervisor off-site.',
      icon: IconExport,
    },
    draft: {
      key: 'draft',
      label: 'Save as draft',
      hint: 'Park the entry. Sign or send for signature later.',
      icon: IconDraft,
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
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>REVIEW</Text>
          <Pill tone={draft.entryKind === 'work' ? 'chip' : 'accent'} size="sm">
            {kindLabel}
          </Pill>
        </View>
        <Text style={{ ...type.heroCardTitle, color: tokens.text, marginTop: 4 }} numberOfLines={2}>
          {draft.site || 'Untitled site'}
        </Text>
        <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 2 }} numberOfLines={2}>
          {[draft.client, draft.workTask.join(', '), draft.structureType].filter(Boolean).join(' · ') ||
            '—'}
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
          <Stat label="Access" value={draft.accessMethod.join(', ') || '—'} />
        </View>
        <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 12 }} numberOfLines={2}>
          {detailBits.length > 0 ? `Details · ${detailBits.join(' · ')}` : 'No extra details added'}
        </Text>
      </Card>

      {supervisors.length > 0 ? (
        <View>
          <SectionKicker>SUPERVISOR (OPTIONAL)</SectionKicker>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: draft.selectedSupervisorId == null }}
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
                  accessibilityState={{ selected: active }}
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
            icon={choice.icon}
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
        <Text style={{ ...type.cardSub, color: tokens.text, flex: 1 }}>
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
  icon: Icon,
  emphasis,
  disabled,
  loading,
  onPress,
}: {
  label: string;
  hint: string;
  icon: React.ComponentType<IconProps>;
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
        <Icon
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
