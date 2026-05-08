import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AlertTriangle,
  Building2,
  ClipboardPenLine,
  Clock3,
  FilePenLine,
  MapPin,
  Ruler,
  Save,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import type { HeightUnit } from '@/src/domain/logbook/types';
import { useCreateAmendment, useEntryDetail } from '@/src/domain/logbook/use-logbook';
import { Button, Card, Field, Screen } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

export default function AmendEntryScreen() {
  const { colors, radii, spacing, typography } = useTheme();
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
  }, [entry, loadedId]);

  const parsedHours = Number(hours);
  const parsedHeight = Number(maxHeight);
  const missingFields = [
    ['Employer', employer],
    ['Site', site],
    ['Client', client],
    ['Task', workTask],
    ['Access', accessMethod],
    ['Structure', structureType],
    ['Notes', description],
  ]
    .filter(([, value]) => String(value).trim().length === 0)
    .map(([label]) => label);
  if (!Number.isFinite(parsedHours) || parsedHours <= 0) missingFields.push('Hours');
  if (!Number.isFinite(parsedHeight) || parsedHeight <= 0) missingFields.push('Height');

  const canSave =
    Boolean(entryId) &&
    entry?.status === 'signed' &&
    missingFields.length === 0;

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
      },
      { onSuccess: (draft) => router.replace(`/entry/${draft.id}`) },
    );
  }

  return (
    <Screen
      footer={
        <Button
          title={canSave ? 'Create amendment draft' : `${missingFields.length || 1} item${missingFields.length === 1 ? '' : 's'} needed`}
          icon={Save}
          onPress={save}
          disabled={!canSave}
          loading={createAmendment.isPending}
        />
      }
    >
      <Card>
        <SectionHeader
          icon={FilePenLine}
          title="Amendment draft"
          pill={entry?.status === 'signed' ? 'Signed source' : 'Locked'}
          tone={entry?.status === 'signed' ? 'ok' : 'warn'}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <MiniStat icon={MapPin} label={entry?.site || 'Loading'} />
          <MiniStat icon={Clock3} label={entry ? `${entry.work_hours.toFixed(1)} h` : '-'} />
        </View>
        {missingFields.length ? (
          <View
            style={{
              borderRadius: radii.sm,
              backgroundColor: colors.statusWarnTint,
              padding: spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            }}
          >
            <AlertTriangle size={18} color={colors.statusWarn} strokeWidth={2.2} />
            <Text selectable style={{ ...typography.caption, color: colors.statusWarn, flex: 1 }}>
              {missingFields.join(', ')}
            </Text>
          </View>
        ) : null}
      </Card>

      <Card>
        <SectionHeader icon={Building2} title="Work" />
        <Field label="Employer" value={employer} onChangeText={setEmployer} placeholder="Company" />
        <Field label="Site" value={site} onChangeText={setSite} placeholder="Tower / plant / bridge" />
        <Field label="Client" value={client} onChangeText={setClient} placeholder="Client" />
        <ChipRow
          options={['Inspection', 'Maintenance', 'Rescue standby', 'Training']}
          value={workTask}
          onChange={setWorkTask}
        />
        <Field label="Work task" value={workTask} onChangeText={setWorkTask} placeholder="Inspection / maintenance / rescue cover" />
      </Card>

      <Card>
        <SectionHeader icon={ClipboardPenLine} title="Method" />
        <ChipRow
          options={['Two-rope access', 'Aid climb', 'Rescue cover', 'Fall restraint']}
          value={accessMethod}
          onChange={setAccessMethod}
        />
        <Field label="Access method" value={accessMethod} onChangeText={setAccessMethod} placeholder="Two-rope access" />
        <ChipRow
          options={['Bridge', 'Tower', 'Wind turbine', 'Facade']}
          value={structureType}
          onChange={setStructureType}
        />
        <Field label="Structure type" value={structureType} onChangeText={setStructureType} placeholder="Bridge / tower / wind turbine" />
      </Card>

      <Card>
        <SectionHeader icon={Ruler} title="Time and height" />
        <Field label="Rope access hours" value={hours} onChangeText={setHours} keyboardType="decimal-pad" placeholder="8" />
        <Field label="Maximum height" value={maxHeight} onChangeText={setMaxHeight} keyboardType="decimal-pad" placeholder="120" />
        <View style={{ gap: spacing.sm }}>
          <Text selectable style={{ ...typography.label, color: colors.textPrimary }}>
            Height unit
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {(['ft', 'm'] as const).map((unit) => {
              const selected = unit === heightUnit;
              return (
                <Pressable
                  key={unit}
                  accessibilityRole="button"
                  onPress={() => setHeightUnit(unit)}
                  style={{
                    minHeight: 44,
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: radii.sm,
                    borderWidth: 1,
                    borderColor: selected ? colors.accentPrimary : colors.border,
                    backgroundColor: selected ? colors.accentTint : colors.bgSurface,
                  }}
                >
                  <Text
                    selectable={false}
                    style={{
                      ...typography.label,
                      color: selected ? colors.accentPrimary : colors.textSecondary,
                    }}
                  >
                    {unit}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Card>

      <Card>
        <SectionHeader icon={ClipboardPenLine} title="Notes" />
        <Field
          label="Work description"
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
          style={{ minHeight: 112 }}
        />
      </Card>

      {entry?.status && entry.status !== 'signed' ? (
        <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
          Only signed entries can receive amendments.
        </Text>
      ) : null}
    </Screen>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  pill,
  tone = 'default',
}: {
  icon: LucideIcon;
  title: string;
  pill?: string;
  tone?: 'default' | 'ok' | 'warn';
}) {
  const { colors, radii, spacing, typography } = useTheme();
  const pillColor = tone === 'ok' ? colors.statusOk : tone === 'warn' ? colors.statusWarn : colors.textSecondary;
  const pillBg = tone === 'ok' ? colors.statusOkTint : tone === 'warn' ? colors.statusWarnTint : colors.bgMuted;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: radii.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bgMuted,
        }}
      >
        <Icon size={18} color={colors.textSecondary} strokeWidth={2.2} />
      </View>
      <Text selectable={false} style={{ ...typography.title3, color: colors.textPrimary, flex: 1 }}>
        {title}
      </Text>
      {pill ? (
        <View
          style={{
            borderRadius: radii.pill,
            backgroundColor: pillBg,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
          }}
        >
          <Text selectable={false} style={{ ...typography.caption, color: pillColor }}>
            {pill}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function MiniStat({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  const { colors, radii, spacing, typography } = useTheme();

  return (
    <View
      style={{
        minHeight: 40,
        borderRadius: radii.sm,
        backgroundColor: colors.bgMuted,
        paddingHorizontal: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
      }}
    >
      <Icon size={16} color={colors.textSecondary} strokeWidth={2.2} />
      <Text selectable numberOfLines={1} style={{ ...typography.label, color: colors.textSecondary }}>
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
  const { colors, radii, spacing, typography } = useTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {options.map((option) => {
        const selected = value === option;

        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option)}
            style={({ pressed }) => ({
              minHeight: 40,
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
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
