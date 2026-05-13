import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronDown, ChevronUp, Save } from 'lucide-react-native';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { HeightUnit } from '@/src/domain/logbook/types';
import { useEntryDetail, useUpdateDraftEntry } from '@/src/domain/logbook/use-logbook';
import { AnimatedStamp, Chip, DateField, DocActionButton, DocBand, Field, Screen, SectionH } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

const TASK_PRESETS = ['Inspection', 'Maintenance', 'Rescue standby', 'Training'];
const ACCESS_PRESETS = ['Two-rope access', 'Aid climb', 'Rescue cover', 'Fall restraint'];
const STRUCTURE_PRESETS = ['Bridge', 'Tower', 'Wind turbine', 'Facade'];

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
  const { spacing, typography, touchTarget, tidewater, hairlines } = useTheme();
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
  const [showDetails, setShowDetails] = React.useState(true);
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
  const isMissing = React.useCallback((field: string) => missing.includes(field), [missing]);
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
      },
      { onSuccess: (updated) => router.replace(`/entry/${updated.entry.id}`) },
    );
  }

  if (detail.isLoading) {
    return (
      <Screen padded={false} weave>
        <DocBand variant="top" formId="CH.5A - DRAFT EDIT" rev="LOADING" rightLabel="WAIT" />
        <View style={{ padding: spacing.base }}>
          <Text style={{ ...typography.body, color: tidewater.ink }}>Loading draft…</Text>
        </View>
      </Screen>
    );
  }

  const lockedNotice = entry?.status && entry.status !== 'draft'
    ? { title: 'ENTRY IS LOCKED', body: 'Signed records use amendments instead of direct edits.' }
    : hasPendingRequest
      ? { title: 'REMOTE REQUEST PENDING', body: 'Complete or cancel the pending verifier request before editing.' }
      : null;

  return (
    <Screen
      padded={false}
      weave
      footer={
        <DocActionButton
          title={isAuditReady ? 'SAVE AUDIT-READY DRAFT' : 'SAVE DRAFT'}
          icon={Save}
          onPress={save}
          disabled={!canSave}
          loading={updateDraft.isPending}
        />
      }
    >
      <DocBand
        variant="top"
        formId="CH.5A - DRAFT EDIT"
        rev={entry?.status === 'draft' ? 'DRAFT' : 'LOCKED'}
        effective="ENTRY-HASH v2"
        rightLabel={canSave ? (isAuditReady ? 'READY' : 'DRAFT') : 'HOLD'}
      />

      <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.base, gap: spacing.lg }}>
        {/* Header card */}
        <View
          style={{
            borderWidth: hairlines.standard.width,
            borderColor: hairlines.standard.color,
            backgroundColor: tidewater.white,
          }}
        >
          <View
            style={{
              padding: spacing.md,
              borderBottomWidth: 1.5,
              borderBottomColor: tidewater.hair,
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: spacing.sm,
              alignItems: 'flex-start',
            }}
          >
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.8 }}>
                EDIT DRAFT
              </Text>
              <Text selectable style={{ ...typography.displayMd, color: tidewater.ink }} numberOfLines={2}>
                {site || entry?.site || 'Untitled draft'}
              </Text>
            </View>
            <AnimatedStamp tone={isAuditReady ? 'green' : 'yellow'} rotation="light">
              {isAuditReady ? 'READY' : 'DRAFT'}
            </AnimatedStamp>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, padding: spacing.md }}>
            <Chip tone={isAuditReady ? 'green' : 'yellow'}>
              {isAuditReady ? 'AUDIT-READY' : `${missing.length} MISSING`}
            </Chip>
            {Number.isFinite(parsedHours) && parsedHours > 0 ? (
              <Chip tone="mute">{`${parsedHours.toFixed(1)} HR`}</Chip>
            ) : null}
            {Number.isFinite(parsedHeight) && parsedHeight > 0 ? (
              <Chip tone="mute">{`${parsedHeight.toFixed(0)} ${heightUnit.toUpperCase()}`}</Chip>
            ) : null}
          </View>
          {lockedNotice ? (
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: tidewater.hairFaint,
                backgroundColor: tidewater.yellowSoft,
                padding: spacing.md,
              }}
            >
              <Text style={{ ...typography.displaySm, color: tidewater.ink, letterSpacing: 1.2 }}>
                {lockedNotice.title}
              </Text>
              <Text style={{ ...typography.monoSm, color: tidewater.ink2, marginTop: 4 }}>
                {lockedNotice.body}
              </Text>
            </View>
          ) : null}
        </View>

        {/* § 22 Site & task */}
        <View>
          <SectionH n="22" right={isMissing('site') || isMissing('task') ? 'REQUIRED' : 'OK'}>
            Site and task
          </SectionH>
          <View style={{ gap: spacing.md }}>
            <Field
              label="Site"
              value={site}
              onChangeText={setSite}
              placeholder="Tower / plant / bridge"
              invalid={isMissing('site')}
            />
            <View style={{ gap: spacing.xs }}>
              <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.5 }}>
                TASK
              </Text>
              <ChipRow options={TASK_PRESETS} value={workTask} onChange={setWorkTask} />
              <Field
                label="Custom task"
                value={workTask}
                onChangeText={setWorkTask}
                placeholder="Inspection / maintenance / rescue cover"
                invalid={isMissing('task')}
                />
            </View>
            <View style={{ gap: spacing.xs }}>
              <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.5 }}>
                ACCESS METHOD
              </Text>
              <ChipRow options={ACCESS_PRESETS} value={accessMethod} onChange={setAccessMethod} />
            </View>
            <Field
              label="Rope access hours"
              value={hours}
              onChangeText={setHours}
              keyboardType="decimal-pad"
              placeholder="8"
              invalid={isMissing('hours')}
            />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => setShowDetails((value) => !value)}
          style={({ pressed }) => ({
            minHeight: touchTarget.min,
            borderWidth: 1.5,
            borderColor: tidewater.hair,
            backgroundColor: tidewater.white,
            paddingHorizontal: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.sm,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ ...typography.displaySm, color: tidewater.ink, letterSpacing: 1.2 }}>
            {showDetails ? 'HIDE DETAILS' : 'SHOW DETAILS'}
          </Text>
          {showDetails ? (
            <ChevronUp size={18} color={tidewater.ink2} strokeWidth={2.2} />
          ) : (
            <ChevronDown size={18} color={tidewater.ink2} strokeWidth={2.2} />
          )}
        </Pressable>

        {showDetails ? (
          <>
            {/* § 23 Dates and parties */}
            <View>
              <SectionH n="23" right={isMissing('dates') || isMissing('employer') || isMissing('client') ? 'REQUIRED' : 'OK'}>
                Dates and parties
              </SectionH>
              <View style={{ gap: spacing.md }}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <DateField
                      label="From"
                      value={dateFrom}
                      onChange={setDateFrom}
                      invalid={isMissing('dates')}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <DateField label="To" value={dateTo} onChange={setDateTo} invalid={isMissing('dates')} />
                  </View>
                </View>
                <Field
                  label="Employer"
                  value={employer}
                  onChangeText={setEmployer}
                  placeholder="Company"
                  invalid={isMissing('employer')}
                    />
                <Field
                  label="Client"
                  value={client}
                  onChangeText={setClient}
                  placeholder="Customer / contractor"
                  invalid={isMissing('client')}
                    />
              </View>
            </View>

            {/* § 24 Structure and height */}
            <View>
              <SectionH n="24" right={isMissing('structure') || isMissing('height') ? 'REQUIRED' : 'OK'}>
                Structure and height
              </SectionH>
              <View style={{ gap: spacing.md }}>
                <View style={{ gap: spacing.xs }}>
                  <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.5 }}>
                    STRUCTURE
                  </Text>
                  <ChipRow options={STRUCTURE_PRESETS} value={structureType} onChange={setStructureType} />
                  <Field
                    label="Structure type"
                    value={structureType}
                    onChangeText={setStructureType}
                    placeholder="Bridge / tower / wind turbine"
                    invalid={isMissing('structure')}
                        />
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
                  <View style={{ flex: 2 }}>
                    <Field
                      label="Maximum height"
                      value={maxHeight}
                      onChangeText={(v) => setMaxHeight(v.replace(/[^\d.]/g, ''))}
                      keyboardType="decimal-pad"
                      placeholder="120"
                      invalid={isMissing('height')}
                            />
                  </View>
                  <View
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      borderWidth: 1.5,
                      borderColor: tidewater.hair,
                      height: 48,
                    }}
                  >
                    {(['ft', 'm'] as const).map((unit, i) => {
                      const active = heightUnit === unit;
                      return (
                        <Pressable
                          key={unit}
                          onPress={() => setHeightUnit(unit)}
                          style={{
                            flex: 1,
                            backgroundColor: active ? tidewater.ink : 'transparent',
                            borderRightWidth: i === 0 ? 1 : 0,
                            borderRightColor: tidewater.hairSoft,
                            alignItems: 'center',
                            justifyContent: 'center',
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

            {/* § 25 Notes */}
            <View>
              <SectionH n="25" right={isMissing('notes') ? 'REQUIRED' : 'OK'}>
                Work notes
              </SectionH>
              <TextInput
                value={description}
                onChangeText={setDescription}
                multiline
                placeholder="What work was performed on rope?"
                placeholderTextColor={tidewater.ink3}
                style={{
                  borderWidth: 1.5,
                  borderColor: isMissing('notes') ? tidewater.yellowDeep : tidewater.hair,
                  backgroundColor: isMissing('notes') ? tidewater.yellowSoft : tidewater.white,
                  padding: spacing.sm,
                  ...typography.body,
                  color: tidewater.ink,
                  minHeight: 120,
                  textAlignVertical: 'top',
                }}
              />
            </View>
          </>
        ) : null}
      </View>

      <DocBand
        variant="footer"
        text={
          isAuditReady
            ? 'DRAFT IS AUDIT-READY - SAVE TO PROCEED TO SIGN OR REQUEST'
            : 'DRAFT EDIT - FINISH HIGHLIGHTED FIELDS BEFORE SIGNING'
        }
        page={entryId ? `ENTRY ${entryId.slice(-6).toUpperCase()}` : 'ENTRY ------'}
      />
    </Screen>
  );
}

function ChipRow({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const { tidewater, typography, spacing } = useTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option)}
            style={({ pressed }) => ({
              borderWidth: 1.5,
              borderColor: selected ? tidewater.accent : tidewater.hair,
              backgroundColor: selected ? tidewater.accentSoft : 'transparent',
              paddingHorizontal: spacing.sm,
              paddingVertical: 6,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ ...typography.displaySm, color: tidewater.ink, letterSpacing: 1.2 }}>
              {option.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

