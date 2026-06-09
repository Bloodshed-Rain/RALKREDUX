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
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatIsoForDisplay, isValidIsoDateRange } from '@/src/domain/date-utils';
import type {
  NdtInspection,
  NdtLevel,
  NdtMethod,
  NdtScheme,
  NdtSupervision,
  UpdateNdtInspectionInput,
} from '@/src/domain/ndt/types';
import { getNdtInspectionReadiness } from '@/src/domain/ndt/ndt-readiness';
import { useNdtInspectionDetail, useUpdateNdtInspection } from '@/src/domain/ndt/use-ndt';
import { useEntries } from '@/src/domain/logbook/use-logbook';
import type { LogbookEntry } from '@/src/domain/logbook/types';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import {
  Button,
  Card,
  ChipSelect,
  type ChipOption,
  DateField,
  Field,
  IconBtn,
  Pill,
  SectionH,
  TopBar,
} from '@/src/ui/primitives/v2';
import { IconArrowLeft, IconWarn } from '@/src/ui/icons';
import { haptics } from '@/src/ui/haptics';

// ─── Picker option sets (neutral labels only — see compliance note) ──────────

const METHOD_OPTIONS: Array<ChipOption<NdtMethod>> = [
  { value: 'UT', label: 'UT · Ultrasonic' },
  { value: 'MT', label: 'MT · Magnetic Particle' },
  { value: 'PT', label: 'PT · Penetrant' },
  { value: 'RT', label: 'RT · Radiographic' },
  { value: 'ET', label: 'ET · Eddy Current' },
  { value: 'VT', label: 'VT · Visual' },
  { value: 'LT', label: 'LT · Leak' },
  { value: 'AE', label: 'AE · Acoustic Emission' },
  { value: 'IRT', label: 'IRT · Infrared' },
  { value: 'NR', label: 'NR · Neutron Radiography' },
  { value: 'GW', label: 'GW · Guided Wave' },
];

const LEVEL_OPTIONS: Array<ChipOption<NdtLevel>> = [
  { value: 'trainee', label: 'Trainee' },
  { value: 'I', label: 'Level I' },
  { value: 'II', label: 'Level II' },
  { value: 'III', label: 'Level III' },
];

const SUPERVISION_OPTIONS: Array<ChipOption<NdtSupervision>> = [
  { value: 'supervised', label: 'Supervised' },
  { value: 'independent', label: 'Independent' },
];

// Stored values are the exact NdtScheme union members (note: 'NAS410' has no
// space); labels are neutral scheme names only.
const SCHEME_OPTIONS: Array<ChipOption<NdtScheme>> = [
  { value: 'ISO 9712', label: 'ISO 9712' },
  { value: 'SNT-TC-1A', label: 'SNT-TC-1A' },
  { value: 'EN 4179', label: 'EN 4179' },
  { value: 'PCN', label: 'PCN' },
  { value: 'NAS410', label: 'NAS 410' },
  { value: 'ACCP', label: 'ACCP' },
];

const TECHNIQUE_SUGGESTIONS = ['PAUT', 'TOFD', 'AUT', 'PEC', 'DR', 'CR'];

// ─── Shared form helpers ─────────────────────────────────────────────────────

function buildCandidateInspection(args: {
  dateFrom: string;
  method: NdtMethod | null;
  ndtLevel: NdtLevel | null;
  hours: string;
  site: string;
}): NdtInspection {
  return {
    id: '',
    date_from: args.dateFrom,
    date_to: args.dateFrom,
    method: (args.method ?? '') as NdtMethod,
    technique: null,
    ndt_level_snapshot: args.ndtLevel,
    supervised: 'supervised',
    hours: Number(args.hours),
    site: args.site.trim(),
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

interface NdtGaps {
  method: boolean;
  supervised: boolean;
  ndtLevel: boolean;
  hours: boolean;
  site: boolean;
}

function ndtRequiredGaps(args: {
  method: NdtMethod | null;
  supervised: NdtSupervision | null;
  ndtLevel: NdtLevel | null;
  hours: string;
  site: string;
}): NdtGaps {
  return {
    method: args.method == null,
    supervised: args.supervised == null,
    ndtLevel: args.ndtLevel == null,
    hours: !(Number(args.hours) > 0),
    site: !args.site.trim(),
  };
}

function ndtMissingSummary(
  readiness: { missingFields: string[] },
  supervised: NdtSupervision | null,
  validRange: boolean,
): string[] {
  const out = [...readiness.missingFields];
  if (supervised == null) out.push('supervision');
  if (!validRange) out.push('valid date range');
  return out;
}

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

// ─── Inline primitives ───────────────────────────────────────────────────────

// ChipSelect has no `invalid` prop, so required-empty RED is a danger-bordered
// wrapper — the picker-group analogue of Field's border-only `invalid`.
function NdtPickerGroup({
  label,
  helper,
  invalid,
  children,
}: {
  label: string;
  helper?: string;
  invalid?: boolean;
  children: React.ReactNode;
}) {
  const { tokens } = useTheme();
  return (
    <View>
      <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 6 }}>{label}</Text>
      {invalid ? (
        <View
          style={{
            borderWidth: 1.5,
            borderColor: tokens.danger,
            borderRadius: 14,
            padding: 8,
          }}
        >
          {children}
        </View>
      ) : (
        children
      )}
      {helper ? (
        <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 6 }}>{helper}</Text>
      ) : null}
    </View>
  );
}

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

function entryLabel(entry: LogbookEntry): string {
  const parts = [entry.site?.trim(), formatIsoForDisplay(entry.date_to) ?? entry.date_to?.trim()].filter(
    (p): p is string => Boolean(p),
  );
  return parts.length ? parts.join(' · ') : 'Untitled entry';
}

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
        <Text style={{ ...type.cardSub, color: on ? tokens.accentInk : tokens.text }} numberOfLines={1}>
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

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function EditNdtRecordScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const inspectionId = firstParam(id);
  const detail = useNdtInspectionDetail(inspectionId);
  const entries = useEntries();
  const updateInspection = useUpdateNdtInspection();

  const [loadedId, setLoadedId] = React.useState<string | null>(null);
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [method, setMethod] = React.useState<NdtMethod | null>(null);
  const [technique, setTechnique] = React.useState('');
  const [ndtLevel, setNdtLevel] = React.useState<NdtLevel | null>(null);
  const [supervised, setSupervised] = React.useState<NdtSupervision | null>(null);
  const [hours, setHours] = React.useState('');
  const [site, setSite] = React.useState('');
  const [employer, setEmployer] = React.useState('');
  const [client, setClient] = React.useState('');
  const [procedureRef, setProcedureRef] = React.useState('');
  const [component, setComponent] = React.useState('');
  const [scheme, setScheme] = React.useState<NdtScheme | null>(null);
  const [description, setDescription] = React.useState('');
  const [linkedEntryId, setLinkedEntryId] = React.useState<string | null>(null);
  const [showErrors, setShowErrors] = React.useState(false);

  const inspection = detail.data?.inspection;
  // Only draft/logged are editable; the service enforces this (ndt_locked) but we
  // surface it up front and disable Save so the tech isn't sent into a throw.
  const isEditable = inspection?.status === 'draft' || inspection?.status === 'logged';
  const hasPending = Boolean(inspection?.pending_signature_id || detail.data?.remote_request);

  React.useEffect(() => {
    if (!inspection || loadedId === inspection.id) return;
    setLoadedId(inspection.id);
    setDateFrom(inspection.date_from);
    setDateTo(inspection.date_to);
    setMethod(inspection.method);
    setTechnique(inspection.technique ?? '');
    setNdtLevel(inspection.ndt_level_snapshot);
    setSupervised(inspection.supervised);
    setHours(String(inspection.hours));
    setSite(inspection.site);
    setEmployer(inspection.employer ?? '');
    setClient(inspection.client ?? '');
    setProcedureRef(inspection.procedure_ref ?? '');
    setComponent(inspection.component ?? '');
    setScheme(inspection.ndt_scheme);
    setDescription(inspection.description ?? '');
    setLinkedEntryId(inspection.linked_entry_id);
  }, [inspection, loadedId]);

  const candidate = buildCandidateInspection({ dateFrom, method, ndtLevel, hours, site });
  const readiness = getNdtInspectionReadiness(candidate);
  const validRange = isValidIsoDateRange(dateFrom, dateTo || dateFrom);
  const isAuditReady = readiness.ready && supervised != null && validRange;
  const gaps = ndtRequiredGaps({ method, ndtLevel, supervised, hours, site });
  const missingSummary = ndtMissingSummary(readiness, supervised, validRange);

  // Save requires an editable record + a valid date range + a non-empty site
  // (the service throws on those two). Other required gaps don't block a draft
  // save but keep the record short of self-loggable.
  const canSave =
    Boolean(inspectionId) && isEditable && !hasPending && site.trim().length > 0 && validRange;

  function save() {
    if (!canSave || !inspectionId || !method || !supervised) {
      setShowErrors(true);
      haptics.error();
      return;
    }
    const input: UpdateNdtInspectionInput = {
      id: inspectionId,
      date_from: dateFrom,
      date_to: dateTo || dateFrom,
      method,
      technique: technique.trim() || null,
      ndt_level_snapshot: ndtLevel,
      supervised,
      hours: Number(hours) || 0,
      site: site.trim(),
      client: client.trim() || null,
      employer: employer.trim() || null,
      procedure_ref: procedureRef.trim() || null,
      component: component.trim() || null,
      ndt_scheme: scheme,
      description: description.trim() || null,
      linked_entry_id: linkedEntryId,
    };
    updateInspection.mutate(input, {
      onSuccess: (updated) => router.replace(`/ndt/${updated.id}` as never),
      onError: (err) => {
        haptics.error();
        Alert.alert(
          'Could not save record',
          (err instanceof Error ? err.message : 'The record was not saved.') +
            '\n\nYour edits are still on this screen — please try again.',
        );
      },
    });
  }

  if (detail.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg, padding: 20 }}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ ...type.body, color: tokens.textDim }}>Loading record…</Text>
      </View>
    );
  }

  if (!inspection) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg, padding: 20, gap: 12 }}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ ...type.cardTitle, color: tokens.text }}>Record not found</Text>
        <Text style={{ ...type.cardSub, color: tokens.textDim }}>
          This NDT record may have been deleted.
        </Text>
        <Button variant="ghost" onPress={() => router.back()}>
          Back
        </Button>
      </View>
    );
  }

  const lockedNotice = !isEditable
    ? {
        title: 'Record is locked',
        body: 'Verified records use amendments instead of direct edits.',
      }
    : hasPending
      ? {
          title: 'Verification request pending',
          body: 'Complete or cancel the pending verifier request before editing.',
        }
      : null;

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
        title="Edit NDT record"
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
            <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>
              {`${inspection.status.toUpperCase()} · NDT RECORD`}
            </Text>
            <Text style={heroTitleStyle} numberOfLines={2}>
              {site.trim() || inspection.site || 'Untitled record'}
            </Text>
            <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 4 }}>
              Edit the self-maintained record before it is verified by an NDT Level III.
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
              <Pill tone={isAuditReady ? 'ok' : 'warn'}>
                {isAuditReady ? 'Ready to self-log' : `${missingSummary.length} to add`}
              </Pill>
              {Number(hours) > 0 ? <Pill tone="chip">{`${Number(hours).toFixed(1)} hrs`}</Pill> : null}
            </View>
            {missingSummary.length > 0 ? (
              <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 8 }}>
                {`Still needed before self-logging: ${missingSummary.join(', ')}.`}
              </Text>
            ) : null}
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

        <SectionH kicker="01 METHOD & TECHNIQUE" title="What you inspected with" />
        <View style={{ paddingHorizontal: 20, gap: 14 }}>
          <NdtPickerGroup label="NDT METHOD" invalid={showErrors && gaps.method}>
            <ChipSelect<NdtMethod> value={method} options={METHOD_OPTIONS} onChange={setMethod} />
          </NdtPickerGroup>
          <View>
            <Field
              label="Technique (optional)"
              value={technique}
              onChangeText={setTechnique}
              placeholder="e.g. PAUT, TOFD, AUT"
              autoCapitalize="characters"
            />
            <TechniqueSuggestions
              current={technique}
              suggestions={TECHNIQUE_SUGGESTIONS}
              onPick={setTechnique}
            />
          </View>
        </View>

        <SectionH kicker="02 SUPERVISION & LEVEL" title="How you worked, what you held" />
        <View style={{ paddingHorizontal: 20, gap: 14 }}>
          <NdtPickerGroup label="SUPERVISED OR INDEPENDENT" invalid={showErrors && gaps.supervised}>
            <ChipSelect<NdtSupervision>
              value={supervised}
              options={SUPERVISION_OPTIONS}
              onChange={setSupervised}
            />
          </NdtPickerGroup>
          <NdtPickerGroup
            label="NDT LEVEL HELD"
            invalid={showErrors && gaps.ndtLevel}
            helper="The level you held while accruing this experience — this does not assert competency."
          >
            <ChipSelect<NdtLevel> value={ndtLevel} options={LEVEL_OPTIONS} onChange={setNdtLevel} />
          </NdtPickerGroup>
          <Field
            label="Hours"
            value={hours}
            onChangeText={(v) => setHours(v.replace(/[^\d.]/g, ''))}
            keyboardType="decimal-pad"
            suffix="hrs"
            placeholder="0"
            invalid={showErrors && gaps.hours}
          />
        </View>

        <SectionH kicker="03 WHEN & WHERE" title="Dates, site, parties" />
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <DateField
                label="From"
                value={dateFrom || null}
                onChange={(iso) => setDateFrom(iso ?? '')}
                maxDate={dateTo || null}
                invalid={showErrors && !validRange}
              />
            </View>
            <View style={{ flex: 1 }}>
              <DateField
                label="To"
                value={dateTo || null}
                onChange={(iso) => setDateTo(iso ?? '')}
                minDate={dateFrom || null}
                error={validRange ? undefined : 'Invalid range'}
              />
            </View>
          </View>
          <Field
            label="Site / job reference"
            value={site}
            onChangeText={setSite}
            placeholder="Plant, job number, work order"
            autoCapitalize="words"
            invalid={showErrors && gaps.site}
          />
          <Field
            label="Employer (optional)"
            value={employer}
            onChangeText={setEmployer}
            placeholder="Who you worked for"
            autoCapitalize="words"
          />
          <Field
            label="Client (optional)"
            value={client}
            onChangeText={setClient}
            placeholder="End client / asset owner"
            autoCapitalize="words"
          />
        </View>

        <SectionH kicker="04 SCOPE" title="Procedure, component, scheme" />
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <Field
            label="Procedure reference (optional)"
            value={procedureRef}
            onChangeText={setProcedureRef}
            placeholder="e.g. WI-UT-014 rev. C"
          />
          <Field
            label="Component / material (optional)"
            value={component}
            onChangeText={setComponent}
            placeholder="e.g. CS pipe weld, 12 mm wall"
          />
          <NdtPickerGroup
            label="NDT SCHEME (OPTIONAL)"
            helper="The scheme this experience is recorded under. Verification rests with the NDT Level III."
          >
            <ChipSelect<NdtScheme>
              value={scheme}
              options={SCHEME_OPTIONS}
              onChange={(next) => setScheme(scheme === next ? null : next)}
            />
          </NdtPickerGroup>
        </View>

        <SectionH kicker="05 NOTES & LINK" title="Description, rope-access link" />
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <Field
            label="Description / notes (optional)"
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Scope, findings, indications, anything notable"
          />
          <View>
            <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 6 }}>
              LINKED ROPE-ACCESS ENTRY (OPTIONAL)
            </Text>
            <LinkedEntryPicker
              entries={entries.data ?? []}
              value={linkedEntryId}
              onChange={setLinkedEntryId}
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
          disabled={!canSave || updateInspection.isPending}
        >
          {updateInspection.isPending
            ? 'Saving…'
            : !isEditable || hasPending
              ? 'Record locked'
              : isAuditReady
                ? 'Save self-logged record'
                : 'Save record'}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}
