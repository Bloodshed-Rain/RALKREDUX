import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ChevronDown,
  ChevronUp,
  Save,
} from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import type { HeightUnit } from '@/src/domain/logbook/types';
import { useEntryDetail, useUpdateDraftEntry } from '@/src/domain/logbook/use-logbook';
import { Button, Card, DateField, Field, Screen } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

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
  const { colors, spacing, typography } = useTheme();
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
      <Screen>
        <Text selectable style={{ ...typography.body, color: colors.textPrimary }}>
          Loading draft
        </Text>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <Button
          title={isAuditReady ? 'Save audit-ready draft' : 'Save draft'}
          icon={Save}
          onPress={save}
          disabled={!canSave}
          loading={updateDraft.isPending}
        />
      }
    >
      {entry?.status && entry.status !== 'draft' ? (
        <Card>
          <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
            Entry is locked
          </Text>
          <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
            Signed records use amendments instead of direct edits.
          </Text>
        </Card>
      ) : null}

      {hasPendingRequest ? (
        <Card>
          <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
            Remote request pending
          </Text>
          <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
            Complete the pending verifier request before changing this draft.
          </Text>
        </Card>
      ) : null}

      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Pill
            label={isAuditReady ? 'Ready to sign' : `${missing.length} missing`}
            tone={isAuditReady ? 'ok' : 'warn'}
          />
          {missing.length ? <Pill label="Complete highlighted fields" tone="neutral" /> : null}
        </View>

        <Field
          label="Site"
          value={site}
          onChangeText={setSite}
          placeholder="Tower / plant / bridge"
          invalid={isMissing('site')}
          hint={isMissing('site') ? 'Required before signing' : undefined}
        />

        <View style={{ gap: spacing.sm }}>
          <Text selectable style={{ ...typography.label, color: isMissing('task') ? colors.statusWarn : colors.textPrimary }}>
            Task
          </Text>
          <ChipRow
            options={['Inspection', 'Maintenance', 'Rescue standby', 'Training']}
            value={workTask}
            onChange={setWorkTask}
          />
          <Field
            label="Custom task"
            value={workTask}
            onChangeText={setWorkTask}
            placeholder="Inspection / maintenance / rescue cover"
            invalid={isMissing('task')}
            hint={isMissing('task') ? 'Pick a preset or type the task' : undefined}
          />
        </View>

        <ChipRow
          options={['Two-rope access', 'Aid climb', 'Rescue cover', 'Fall restraint']}
          value={accessMethod}
          onChange={setAccessMethod}
        />

        <Field
          label="Rope access hours"
          value={hours}
          onChangeText={setHours}
          keyboardType="decimal-pad"
          placeholder="8"
          invalid={isMissing('hours')}
          hint={isMissing('hours') ? 'Enter hours greater than 0' : undefined}
        />

        <Button
          title={showDetails ? 'Hide details' : 'Add missing details'}
          icon={showDetails ? ChevronUp : ChevronDown}
          variant="ghost"
          onPress={() => setShowDetails((value) => !value)}
        />

        {showDetails ? (
          <>
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
                <DateField
                  label="To"
                  value={dateTo}
                  onChange={setDateTo}
                  invalid={isMissing('dates')}
                />
              </View>
            </View>
            <Field
              label="Employer"
              value={employer}
              onChangeText={setEmployer}
              placeholder="Company"
              invalid={isMissing('employer')}
              hint={isMissing('employer') ? 'Required before signing' : undefined}
            />
            <Field
              label="Client"
              value={client}
              onChangeText={setClient}
              placeholder="Client"
              invalid={isMissing('client')}
              hint={isMissing('client') ? 'Required before signing' : undefined}
            />
            <View style={{ gap: spacing.sm }}>
              <Text selectable style={{ ...typography.label, color: isMissing('structure') ? colors.statusWarn : colors.textPrimary }}>
                Structure
              </Text>
              <ChipRow
                options={['Bridge', 'Tower', 'Wind turbine', 'Facade']}
                value={structureType}
                onChange={setStructureType}
              />
              <Field
                label="Structure type"
                value={structureType}
                onChangeText={setStructureType}
                placeholder="Bridge / tower / wind turbine"
                invalid={isMissing('structure')}
                hint={isMissing('structure') ? 'Pick a preset or type the structure' : undefined}
              />
            </View>
            <Field
              label="Access method"
              value={accessMethod}
              onChangeText={setAccessMethod}
              placeholder="Two-rope access"
              invalid={isMissing('access')}
              hint={isMissing('access') ? 'Required before signing' : undefined}
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Maximum height"
                  value={maxHeight}
                  onChangeText={setMaxHeight}
                  keyboardType="decimal-pad"
                  placeholder="120"
                  invalid={isMissing('height')}
                  hint={isMissing('height') ? 'Required before signing' : undefined}
                  style={{ minWidth: 0 }}
                />
              </View>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text selectable style={{ ...typography.label, color: colors.textPrimary }}>
                  Unit
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {(['ft', 'm'] as const).map((unit) => (
                    <ChoiceButton
                      key={unit}
                      label={unit}
                      selected={unit === heightUnit}
                      onPress={() => setHeightUnit(unit)}
                    />
                  ))}
                </View>
              </View>
            </View>
            <Field
              label="Work notes"
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              style={{ minHeight: 96 }}
              placeholder="What work was performed?"
              invalid={isMissing('notes')}
              hint={isMissing('notes') ? 'Required before signing' : undefined}
            />
          </>
        ) : null}
      </Card>
    </Screen>
  );
}

function Pill({ label, tone }: { label: string; tone: 'ok' | 'warn' | 'neutral' }) {
  const { colors, radii, spacing, typography, touchTarget } = useTheme();
  const color = tone === 'ok' ? colors.statusOk : tone === 'warn' ? colors.statusWarn : colors.textSecondary;
  const backgroundColor = tone === 'ok' ? colors.statusOkTint : tone === 'warn' ? colors.statusWarnTint : colors.bgMuted;

  return (
    <View
      style={{
        minHeight: 30,
        borderRadius: radii.pill,
        backgroundColor,
        paddingHorizontal: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text selectable={false} style={{ ...typography.caption, color }}>
        {label}
      </Text>
    </View>
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
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((option) => (
        <ChoiceButton
          key={option}
          label={option}
          selected={value === option}
          onPress={() => onChange(option)}
        />
      ))}
    </View>
  );
}

function ChoiceButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors, radii, spacing, typography, touchTarget } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: touchTarget.min,
        borderRadius: radii.sm,
        borderWidth: 1,
        borderColor: selected ? colors.accentPrimary : colors.border,
        backgroundColor: selected ? colors.accentTint : colors.bgSurface,
        justifyContent: 'center',
        opacity: pressed ? 0.82 : 1,
        paddingHorizontal: spacing.sm,
      })}
    >
      <Text
        selectable={false}
        numberOfLines={1}
        style={{
          ...typography.caption,
          color: selected ? colors.accentPrimary : colors.textSecondary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
