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
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatIsoForDisplay, isValidIsoDateRange, todayLocalIsoDate } from '@/src/domain/date-utils';
import type {
  CreateNdtInspectionInput,
  NdtInspection,
  NdtLevel,
  NdtMethod,
  NdtScheme,
  NdtSupervision,
} from '@/src/domain/ndt/types';
import { getNdtInspectionReadiness } from '@/src/domain/ndt/ndt-readiness';
import { useCreateNdtInspection, useMarkNdtLogged } from '@/src/domain/ndt/use-ndt';
import { useEntries } from '@/src/domain/logbook/use-logbook';
import type { LogbookEntry } from '@/src/domain/logbook/types';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import { Button, Card, DateField, Field, Pill } from '@/src/ui/primitives/v2';
import { IconClose, IconDraft, IconSign, IconWarn, type IconProps } from '@/src/ui/icons';
import { haptics } from '@/src/ui/haptics';

// ─── Tile option sets (neutral labels only — see compliance note) ────────────

// The 11-method taxonomy. `value` is the stored NdtMethod; `label` is the short
// code (the tile's headline) and `sub` the long name beneath it.
interface MethodTile {
  value: NdtMethod;
  label: string;
  sub: string;
}
const METHOD_TILES: MethodTile[] = [
  { value: 'UT', label: 'UT', sub: 'Ultrasonic' },
  { value: 'MT', label: 'MT', sub: 'Magnetic Particle' },
  { value: 'PT', label: 'PT', sub: 'Penetrant' },
  { value: 'RT', label: 'RT', sub: 'Radiographic' },
  { value: 'ET', label: 'ET', sub: 'Eddy Current' },
  { value: 'VT', label: 'VT', sub: 'Visual' },
  { value: 'LT', label: 'LT', sub: 'Leak' },
  { value: 'AE', label: 'AE', sub: 'Acoustic Emission' },
  { value: 'IRT', label: 'IRT', sub: 'Infrared' },
  { value: 'NR', label: 'NR', sub: 'Neutron Radiography' },
  { value: 'GW', label: 'GW', sub: 'Guided Wave' },
];

interface TileOption<T extends string = string> {
  value: T;
  label: string;
}

const SUPERVISION_TILES: TileOption<NdtSupervision>[] = [
  { value: 'supervised', label: 'Supervised' },
  { value: 'independent', label: 'Independent' },
];

const LEVEL_TILES: TileOption<NdtLevel>[] = [
  { value: 'trainee', label: 'Trainee' },
  { value: 'I', label: 'Level I' },
  { value: 'II', label: 'Level II' },
  { value: 'III', label: 'Level III' },
];

// Stored values are the exact NdtScheme union members (note: 'NAS410' has no
// space); labels are neutral scheme names only — never a claim that a scheme's
// requirement is met.
const SCHEME_TILES: TileOption<NdtScheme>[] = [
  { value: 'ISO 9712', label: 'ISO 9712' },
  { value: 'SNT-TC-1A', label: 'SNT-TC-1A' },
  { value: 'EN 4179', label: 'EN 4179' },
  { value: 'PCN', label: 'PCN' },
  { value: 'NAS410', label: 'NAS 410' },
  { value: 'ACCP', label: 'ACCP' },
];

const TECHNIQUE_SUGGESTIONS = ['PAUT', 'TOFD', 'AUT', 'PEC', 'DR', 'CR'];

// ─── Wizard shape ────────────────────────────────────────────────────────────

// 6-page flow mirroring entry/new.tsx. The required spine is split across the
// first four pages — method (1) → dates/hours (2) → supervision/level (3) →
// site (4); procedure/scheme (5) and notes/link (6) never block Next. NDT has no
// gear/photo attachments, so unlike entry/new we hold everything in local state
// and create the row once, at the final save action.
type Step = 1 | 2 | 3 | 4 | 5 | 6;
const TOTAL_STEPS = 6;
const STEP_TITLES = ['Method', 'When & hours', 'Context', 'Where', 'Scope', 'Notes & save'];
const STEP_SUBS = [
  'What you inspected with',
  'Dates worked · hours accrued',
  'How you worked · level held',
  'Site · employer · client',
  'Procedure · component · scheme',
  'Description, link, then save',
];

interface DraftState {
  dateFrom: string;
  dateTo: string;
  method: NdtMethod | null;
  technique: string;
  ndtLevel: NdtLevel | null;
  supervised: NdtSupervision | null;
  hours: string;
  site: string;
  employer: string;
  client: string;
  procedureRef: string;
  component: string;
  scheme: NdtScheme | null;
  description: string;
  linkedEntryId: string | null;
}

function initialDraft(): DraftState {
  return {
    dateFrom: todayLocalIsoDate(),
    dateTo: todayLocalIsoDate(),
    method: null,
    technique: '',
    ndtLevel: null,
    supervised: null,
    hours: '',
    site: '',
    employer: '',
    client: '',
    procedureRef: '',
    component: '',
    scheme: null,
    description: '',
    linkedEntryId: null,
  };
}

function hasAnyContent(draft: DraftState): boolean {
  return (
    draft.method != null ||
    draft.ndtLevel != null ||
    draft.supervised != null ||
    draft.scheme != null ||
    draft.technique.trim().length > 0 ||
    Number(draft.hours) > 0 ||
    draft.site.trim().length > 0 ||
    draft.employer.trim().length > 0 ||
    draft.client.trim().length > 0 ||
    draft.procedureRef.trim().length > 0 ||
    draft.component.trim().length > 0 ||
    draft.description.trim().length > 0 ||
    draft.linkedEntryId != null
  );
}

// getNdtInspectionReadiness reads only method/hours/site/ndt_level_snapshot/
// date_from; the rest is nulled and cast so a single readiness call drives the
// review-page summary. Supervision and date-range validity aren't checked by it —
// we fold those in ourselves (see canSelfLog / missingSummary below).
function buildCandidateInspection(draft: DraftState): NdtInspection {
  return {
    id: '',
    date_from: draft.dateFrom,
    date_to: draft.dateTo || draft.dateFrom,
    method: (draft.method ?? '') as NdtMethod,
    technique: null,
    ndt_level_snapshot: draft.ndtLevel,
    supervised: draft.supervised ?? 'supervised',
    hours: Number(draft.hours),
    site: draft.site.trim(),
    client: null,
    employer: null,
    procedure_ref: null,
    component: null,
    ndt_scheme: null,
    description: null,
    linked_entry_id: null,
    status: 'draft',
    amends_inspection_id: null,
    pending_signature_id: null,
    timezone_offset: null,
    created_at: '',
    updated_at: '',
  };
}

function buildInput(draft: DraftState): CreateNdtInspectionInput | null {
  // method + supervised are the two non-nullable input fields; without them we
  // cannot construct a valid CreateNdtInspectionInput at all.
  if (!draft.method || !draft.supervised) return null;
  return {
    date_from: draft.dateFrom,
    date_to: draft.dateTo || draft.dateFrom,
    method: draft.method,
    technique: draft.technique.trim() || null,
    ndt_level_snapshot: draft.ndtLevel,
    supervised: draft.supervised,
    hours: Number(draft.hours) || 0,
    site: draft.site.trim(),
    client: draft.client.trim() || null,
    employer: draft.employer.trim() || null,
    procedure_ref: draft.procedureRef.trim() || null,
    component: draft.component.trim() || null,
    ndt_scheme: draft.scheme,
    description: draft.description.trim() || null,
    linked_entry_id: draft.linkedEntryId,
  };
}

function validRangeOf(draft: DraftState): boolean {
  return isValidIsoDateRange(draft.dateFrom, draft.dateTo || draft.dateFrom);
}

// Each page's gate. The required spine spreads across pages 1–4: method (1) →
// hours + valid range (2) → supervision + level (3) → site (4). Pages 5–6 never
// block. Same total requirement as the old single-screen gate, just re-split.
function stepReady(step: Step, draft: DraftState): boolean {
  if (step === 1) return draft.method != null;
  if (step === 2) return Number(draft.hours) > 0 && validRangeOf(draft);
  if (step === 3) return draft.supervised != null && draft.ndtLevel != null;
  if (step === 4) return draft.site.trim().length > 0;
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
    if (draft.method == null) need.push('an NDT method');
  } else if (step === 2) {
    if (!(Number(draft.hours) > 0)) need.push('hours');
    if (!validRangeOf(draft)) need.push('a valid date range');
  } else if (step === 3) {
    if (draft.supervised == null) need.push('supervised or independent');
    if (draft.ndtLevel == null) need.push('the NDT level held');
  } else if (step === 4) {
    if (!draft.site.trim()) need.push('a site / job reference');
  }
  return need.length ? `Add ${listToText(need)} to continue.` : null;
}

// readiness.missingFields omits supervision (the readiness fn doesn't check it)
// and date validity isn't a "missing field" — fold both in so the review summary
// matches what actually blocks self-logging.
function selfLogMissing(draft: DraftState): string[] {
  const readiness = getNdtInspectionReadiness(buildCandidateInspection(draft));
  const out = [...readiness.missingFields];
  if (draft.supervised == null) out.push('supervision');
  if (!validRangeOf(draft)) out.push('valid date range');
  return out;
}

function entryLabel(entry: LogbookEntry): string {
  const parts = [
    entry.site?.trim(),
    formatIsoForDisplay(entry.date_to) ?? entry.date_to?.trim(),
  ].filter((p): p is string => Boolean(p));
  return parts.length ? parts.join(' · ') : 'Untitled entry';
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function NewNdtRecordWizard() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const entries = useEntries();
  const createInspection = useCreateNdtInspection();
  const markLogged = useMarkNdtLogged();

  const [step, setStep] = React.useState<Step>(1);
  const [draft, setDraft] = React.useState<DraftState>(initialDraft);
  const [busy, setBusy] = React.useState<null | 'draft' | 'logged'>(null);
  // Flips the current page's empty required fields to a red outline once the tech
  // taps Next with the page incomplete. Reset on every page change so each page
  // only shows red after its own failed attempt.
  const [showErrors, setShowErrors] = React.useState(false);

  const update = React.useCallback((patch: Partial<DraftState>) => {
    setDraft((s) => ({ ...s, ...patch }));
  }, []);

  function handleContinue() {
    if (step >= TOTAL_STEPS) return;
    if (!stepReady(step, draft)) {
      // Reveal the red outlines on the empty required fields instead of silently
      // doing nothing, and block progress.
      setShowErrors(true);
      haptics.error();
      return;
    }
    // Clear synchronously with the advance so the next page never renders a frame
    // with the previous page's red still on.
    setShowErrors(false);
    setStep((step + 1) as Step);
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
    // Nothing typed → just leave. We never create a partial row on exit (the NDT
    // service throws ndt_site_required / ndt_date_range_invalid below the
    // minimum), so there's no mid-wizard draft to park — only a discard confirm.
    if (!hasAnyContent(draft)) {
      router.back();
      return;
    }
    haptics.warning();
    Alert.alert(
      'Discard this record?',
      "Nothing's been saved yet. Leaving now discards what you've entered.",
      [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ],
    );
  }

  async function handleSaveDraft() {
    // A plain draft still needs a site + valid date range — the service throws
    // ndt_site_required / ndt_date_range_invalid otherwise. Surface those gaps in
    // red rather than letting the insert throw.
    const input = buildInput(draft);
    if (!draft.site.trim() || !validRangeOf(draft) || !input) {
      setShowErrors(true);
      haptics.error();
      return;
    }
    setBusy('draft');
    try {
      const created = await createInspection.mutateAsync(input);
      router.replace(`/ndt/${created.id}` as never);
    } catch (err) {
      haptics.error();
      Alert.alert('Could not save draft', err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleSaveLogged() {
    const input = buildInput(draft);
    if (selfLogMissing(draft).length > 0 || !input) {
      setShowErrors(true);
      haptics.error();
      return;
    }
    setBusy('logged');
    let createdId: string | null = null;
    try {
      const created = await createInspection.mutateAsync(input);
      createdId = created.id;
      await markLogged.mutateAsync(created.id);
      router.replace(`/ndt/${created.id}` as never);
    } catch (err) {
      haptics.error();
      // If create succeeded but mark-logged failed, the draft still exists — send
      // the tech to it rather than orphaning the record silently.
      if (createdId) {
        const savedId = createdId;
        Alert.alert(
          'Saved as draft',
          'The record was saved but could not be marked self-logged:\n\n' +
            (err instanceof Error ? err.message : String(err)),
          [{ text: 'OK', onPress: () => router.replace(`/ndt/${savedId}` as never) }],
        );
      } else {
        Alert.alert('Could not save record', err instanceof Error ? err.message : String(err));
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: tokens.bg }}
    >
      {/* The NDT stack shows a native header by default — keep it hidden so it
          doesn't sit on top of the custom wizard header. */}
      <Stack.Screen options={{ headerShown: false }} />
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
        {step === 1 ? <StepMethod draft={draft} update={update} showErrors={showErrors} /> : null}
        {step === 2 ? <StepWhenHours draft={draft} update={update} showErrors={showErrors} /> : null}
        {step === 3 ? <StepContext draft={draft} update={update} showErrors={showErrors} /> : null}
        {step === 4 ? <StepWhere draft={draft} update={update} showErrors={showErrors} /> : null}
        {step === 5 ? <StepScope draft={draft} update={update} /> : null}
        {step === 6 ? (
          <StepReview
            draft={draft}
            update={update}
            entries={entries.data ?? []}
            busy={busy}
            onSaveLogged={handleSaveLogged}
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
          <Text style={{ ...type.cardSub, color: tokens.danger }}>{missingStepHint(step, draft)}</Text>
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
  showErrors?: boolean;
}

// Page 1 — the required spine begins: which method, plus an optional technique.
function StepMethod({ draft, update, showErrors }: StepProps) {
  const { tokens } = useTheme();
  return (
    <View style={{ gap: 20 }}>
      <View>
        <SectionKicker>NDT METHOD</SectionKicker>
        <MethodTileGrid
          value={draft.method}
          onChange={(method) => update({ method })}
          invalid={!!showErrors && draft.method == null}
        />
      </View>
      <View>
        <SectionKicker>TECHNIQUE (OPTIONAL)</SectionKicker>
        <Field
          value={draft.technique}
          onChangeText={(v) => update({ technique: v })}
          placeholder="e.g. PAUT, TOFD, AUT"
          autoCapitalize="characters"
          accessibilityLabel="Technique"
        />
        <TechniqueSuggestions
          current={draft.technique}
          suggestions={TECHNIQUE_SUGGESTIONS}
          onPick={(technique) => update({ technique })}
        />
        <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 8 }}>
          A specific technique within the method, if relevant.
        </Text>
      </View>
    </View>
  );
}

// Page 2 — when the work happened, and how many hours it accrued.
function StepWhenHours({ draft, update, showErrors }: StepProps) {
  const valid = validRangeOf(draft);
  return (
    <View style={{ gap: 20 }}>
      <View>
        <SectionKicker>DATES WORKED</SectionKicker>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <DateField
              label="From"
              value={draft.dateFrom || null}
              onChange={(iso) => update({ dateFrom: iso ?? '', dateTo: draft.dateTo || iso || '' })}
              maxDate={draft.dateTo || null}
              invalid={!!showErrors && !valid}
            />
          </View>
          <View style={{ flex: 1 }}>
            <DateField
              label="To"
              value={draft.dateTo || null}
              onChange={(iso) => update({ dateTo: iso ?? '' })}
              minDate={draft.dateFrom || null}
              error={valid ? undefined : 'Invalid range'}
            />
          </View>
        </View>
      </View>
      <View>
        <SectionKicker>HOURS ACCRUED</SectionKicker>
        <Field
          value={draft.hours}
          onChangeText={(v) => update({ hours: v.replace(/[^\d.]/g, '') })}
          keyboardType="decimal-pad"
          suffix="hrs"
          placeholder="0"
          accessibilityLabel="Hours accrued"
          invalid={!!showErrors && !(Number(draft.hours) > 0)}
        />
      </View>
    </View>
  );
}

// Page 3 — how you worked, and the level you held. Both single-select tiles.
function StepContext({ draft, update, showErrors }: StepProps) {
  const { tokens } = useTheme();
  return (
    <View style={{ gap: 20 }}>
      <View>
        <SectionKicker>SUPERVISED OR INDEPENDENT</SectionKicker>
        <TileGrid
          options={SUPERVISION_TILES}
          selectedValues={draft.supervised ? [draft.supervised] : []}
          onPress={(supervised) => update({ supervised })}
          invalid={!!showErrors && draft.supervised == null}
        />
      </View>
      <View>
        <SectionKicker>NDT LEVEL HELD</SectionKicker>
        <TileGrid
          options={LEVEL_TILES}
          selectedValues={draft.ndtLevel ? [draft.ndtLevel] : []}
          onPress={(ndtLevel) => update({ ndtLevel })}
          invalid={!!showErrors && draft.ndtLevel == null}
        />
        <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 8 }}>
          The level you held while accruing this experience — this does not assert competency.
        </Text>
      </View>
    </View>
  );
}

// Page 4 — site is required; employer and client are optional.
function StepWhere({ draft, update, showErrors }: StepProps) {
  return (
    <View style={{ gap: 14 }}>
      <Field
        label="Site / job reference"
        value={draft.site}
        onChangeText={(v) => update({ site: v })}
        placeholder="Plant, job number, work order"
        autoCapitalize="words"
        invalid={!!showErrors && !draft.site.trim()}
      />
      <Field
        label="Employer (optional)"
        value={draft.employer}
        onChangeText={(v) => update({ employer: v })}
        placeholder="Who you worked for"
        autoCapitalize="words"
      />
      <Field
        label="Client (optional)"
        value={draft.client}
        onChangeText={(v) => update({ client: v })}
        placeholder="End client / asset owner"
        autoCapitalize="words"
      />
    </View>
  );
}

// Page 5 — entirely optional scope detail. Nothing here blocks Next or save.
function StepScope({ draft, update }: StepProps) {
  const { tokens } = useTheme();
  return (
    <View style={{ gap: 18 }}>
      <Text style={{ ...type.cardSub, color: tokens.textDim }}>
        Procedure, component and scheme are optional — add what's relevant to this record.
      </Text>
      <View>
        <SectionKicker>PROCEDURE REFERENCE</SectionKicker>
        <Field
          value={draft.procedureRef}
          onChangeText={(v) => update({ procedureRef: v })}
          placeholder="e.g. WI-UT-014 rev. C"
          accessibilityLabel="Procedure reference"
        />
      </View>
      <View>
        <SectionKicker>COMPONENT / MATERIAL</SectionKicker>
        <Field
          value={draft.component}
          onChangeText={(v) => update({ component: v })}
          placeholder="e.g. CS pipe weld, 12 mm wall"
          accessibilityLabel="Component or material"
        />
      </View>
      <View>
        <SectionKicker>NDT SCHEME</SectionKicker>
        {/* Optional and clearable: tapping the active scheme toggles it back to
            null, since TileGrid's onPress only ever sets a value. */}
        <TileGrid
          options={SCHEME_TILES}
          selectedValues={draft.scheme ? [draft.scheme] : []}
          onPress={(next) => update({ scheme: draft.scheme === next ? null : next })}
        />
        <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 8 }}>
          The scheme this experience is recorded under. Verification rests with the NDT Level III.
        </Text>
      </View>
    </View>
  );
}

// Page 6 — recap, optional rope-access link, then the two save actions.
function StepReview({
  draft,
  update,
  entries,
  busy,
  onSaveLogged,
  onSaveDraft,
}: {
  draft: DraftState;
  update: (patch: Partial<DraftState>) => void;
  entries: LogbookEntry[];
  busy: null | 'draft' | 'logged';
  onSaveLogged: () => void;
  onSaveDraft: () => void;
}) {
  const { tokens } = useTheme();
  const methodLabel = METHOD_TILES.find((m) => m.value === draft.method);
  const missing = selfLogMissing(draft);
  const canSelfLog = missing.length === 0;

  const scopeBits: string[] = [];
  if (draft.technique.trim()) scopeBits.push(draft.technique.trim().toUpperCase());
  if (draft.procedureRef.trim()) scopeBits.push('procedure');
  if (draft.component.trim()) scopeBits.push('component');
  if (draft.scheme) scopeBits.push(draft.scheme);
  if (draft.description.trim()) scopeBits.push('notes');
  if (draft.linkedEntryId) scopeBits.push('linked entry');

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
          <Pill tone={canSelfLog ? 'ok' : 'warn'} size="sm">
            {canSelfLog ? 'Ready to self-log' : `${missing.length} to add`}
          </Pill>
        </View>
        <Text style={{ ...type.heroCardTitle, color: tokens.text, marginTop: 4 }} numberOfLines={2}>
          {draft.site.trim() || 'New inspection'}
        </Text>
        <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 2 }} numberOfLines={2}>
          {[methodLabel ? `${methodLabel.label} · ${methodLabel.sub}` : null, draft.client.trim()]
            .filter(Boolean)
            .join(' · ') || '—'}
        </Text>
        <View style={{ height: 1, backgroundColor: tokens.lineSoft, marginVertical: 14 }} />
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <Stat label="Hours" value={(Number(draft.hours) || 0).toFixed(1)} />
          <Stat
            label="Level"
            value={LEVEL_TILES.find((l) => l.value === draft.ndtLevel)?.label ?? '—'}
          />
          <Stat
            label="How"
            value={
              SUPERVISION_TILES.find((s) => s.value === draft.supervised)?.label ?? '—'
            }
          />
        </View>
        <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 12 }} numberOfLines={2}>
          {scopeBits.length > 0 ? `Scope · ${scopeBits.join(' · ')}` : 'No extra scope added'}
        </Text>
        {missing.length > 0 ? (
          <Text style={{ ...type.cardSub, color: tokens.danger, marginTop: 8 }}>
            {`Still needed to self-log: ${missing.join(', ')}.`}
          </Text>
        ) : null}
      </Card>

      <View>
        <SectionKicker>DESCRIPTION / NOTES (OPTIONAL)</SectionKicker>
        <Field
          value={draft.description}
          onChangeText={(v) => update({ description: v })}
          multiline
          placeholder="Scope, findings, indications, anything notable"
          accessibilityLabel="Description or notes"
        />
      </View>

      <View>
        <SectionKicker>LINKED ROPE-ACCESS ENTRY (OPTIONAL)</SectionKicker>
        <LinkedEntryPicker
          entries={entries}
          value={draft.linkedEntryId}
          onChange={(id) => update({ linkedEntryId: id })}
        />
      </View>

      <View style={{ gap: 8 }}>
        <ChoiceRow
          label="Save as self-logged"
          hint="Accrues experience now, pending an NDT Level III's verification."
          icon={IconSign}
          emphasis
          disabled={busy != null && busy !== 'logged'}
          loading={busy === 'logged'}
          onPress={onSaveLogged}
        />
        <ChoiceRow
          label="Save as draft"
          hint="Park the record. Mark it self-logged or send for verification later."
          icon={IconDraft}
          disabled={busy != null && busy !== 'draft'}
          loading={busy === 'draft'}
          onPress={onSaveDraft}
        />
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
          Self-logged hours accrue experience only. They become verified experience once an NDT Level
          III signs the record.
        </Text>
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────

// ── Tile selection ─────────────────────────────────────────────────────────

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
  // Flow through the type scale so tile labels (the wizard's primary tap surface)
  // track UI_SCALE like all other text.
  return {
    ...type.cardTitle,
    color: tokens.text,
    textAlign: 'center',
  };
}

// 2-column grid of big, calm, label-only tiles — the wizard's selection
// primitive in place of the old ChipSelect rows. Selection reads from the accent
// border + fill (no glyphs anywhere in the wizard, by design).
function TileGrid<T extends string = string>({
  options,
  selectedValues,
  onPress,
  invalid,
}: {
  options: TileOption<T>[];
  selectedValues: readonly string[];
  onPress: (value: T) => void;
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
    </View>
  );
  // Required-field highlight: wrap the whole group in a danger outline — the
  // tile-grid analogue of Field's border-only `invalid`.
  if (!invalid) return grid;
  return (
    <View style={{ borderWidth: 1.5, borderColor: tokens.danger, borderRadius: 16, padding: 8 }}>
      {grid}
    </View>
  );
}

// The 11-method grid: each tile carries the short code as its headline and the
// long name beneath, so the taxonomy reads at a glance without a glossary.
function MethodTileGrid({
  value,
  onChange,
  invalid,
}: {
  value: NdtMethod | null;
  onChange: (value: NdtMethod) => void;
  invalid?: boolean;
}) {
  const { tokens } = useTheme();
  const grid = (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 10,
      }}
    >
      {METHOD_TILES.map((m) => {
        const active = value === m.value;
        return (
          <Pressable
            key={m.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${m.label} ${m.sub}`}
            onPress={() => {
              haptics.selection();
              onChange(m.value);
            }}
            style={({ pressed }) => [
              tileStyle(tokens, active),
              pressed ? { transform: [{ scale: 0.98 }] } : null,
            ]}
          >
            <Text style={tileLabelStyle(tokens)} numberOfLines={1}>
              {m.label}
            </Text>
            <Text
              style={{ ...type.cardSub, color: tokens.textDim, textAlign: 'center' }}
              numberOfLines={2}
            >
              {m.sub}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
  if (!invalid) return grid;
  return (
    <View style={{ borderWidth: 1.5, borderColor: tokens.danger, borderRadius: 16, padding: 8 }}>
      {grid}
    </View>
  );
}

// Common-variant technique chips. Tapping toggles the free-text value so the
// field stays the source of truth (techniques are free text, not an enum).
function TechniqueSuggestions({
  current,
  suggestions,
  onPick,
}: {
  current: string;
  suggestions: string[];
  onPick: (value: string) => void;
}) {
  const { tokens } = useTheme();
  const active = current.trim().toUpperCase();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      {suggestions.map((s) => {
        const on = active === s.toUpperCase();
        return (
          <Pressable
            key={s}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => {
              haptics.selection();
              onPick(on ? '' : s);
            }}
            style={({ pressed }) => [
              {
                paddingVertical: 6,
                paddingHorizontal: 11,
                borderRadius: 999,
                backgroundColor: on ? tokens.accent : tokens.surface2,
                borderWidth: 1,
                borderColor: on ? tokens.accent : tokens.lineSoft,
              },
              pressed ? { transform: [{ scale: 0.97 }] } : null,
            ]}
          >
            <Text style={{ ...type.cardSub, color: on ? tokens.accentInk : tokens.text }}>{s}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Optional single-select link to a rope-access entry. Stores linked_entry_id; a
// "None" chip clears it. Caps the list so the picker stays calm.
function LinkedEntryPicker({
  entries,
  value,
  onChange,
}: {
  entries: LogbookEntry[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const { tokens } = useTheme();
  if (entries.length === 0) {
    return (
      <Text style={{ ...type.cardSub, color: tokens.textDim }}>
        No rope-access entries yet to link.
      </Text>
    );
  }
  const chip = (id: string | null, label: string) => {
    const on = value === id;
    return (
      <Pressable
        key={id ?? '__none__'}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        onPress={() => {
          haptics.selection();
          onChange(id);
        }}
        style={({ pressed }) => [
          {
            paddingVertical: 7,
            paddingHorizontal: 12,
            borderRadius: 999,
            backgroundColor: on ? tokens.accent : tokens.surface,
            borderWidth: 1,
            borderColor: on ? tokens.accent : tokens.lineSoft,
          },
          pressed ? { transform: [{ scale: 0.97 }] } : null,
        ]}
      >
        <Text
          style={{ ...type.cardSub, color: on ? tokens.accentInk : tokens.text }}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    );
  };
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {chip(null, 'None')}
      {entries.slice(0, 12).map((e) => chip(e.id, entryLabel(e)))}
    </View>
  );
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
          style={{ ...type.cardTitle, color: emphasis ? tokens.accentInk : tokens.text }}
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
