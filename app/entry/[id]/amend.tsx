import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { HeightUnit } from '@/src/domain/logbook/types';
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
  const canSave =
    Boolean(entryId) &&
    entry?.status === 'signed' &&
    employer.trim().length > 0 &&
    site.trim().length > 0 &&
    client.trim().length > 0 &&
    workTask.trim().length > 0 &&
    accessMethod.trim().length > 0 &&
    structureType.trim().length > 0 &&
    description.trim().length > 0 &&
    Number.isFinite(parsedHours) &&
    parsedHours > 0 &&
    Number.isFinite(parsedHeight) &&
    parsedHeight > 0;

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
    <Screen>
      <Card>
        <Text selectable style={{ ...typography.title2, color: colors.textPrimary }}>
          Amendment draft
        </Text>
        <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
          The original stays locked. This draft becomes the replacement once signed.
        </Text>
        <Field label="Employer" value={employer} onChangeText={setEmployer} placeholder="Company" />
        <Field label="Site" value={site} onChangeText={setSite} placeholder="Tower / plant / bridge" />
        <Field label="Client" value={client} onChangeText={setClient} placeholder="Client" />
        <Field label="Work task" value={workTask} onChangeText={setWorkTask} placeholder="Inspection / maintenance / rescue cover" />
        <Field label="Access method" value={accessMethod} onChangeText={setAccessMethod} placeholder="Two-rope access" />
        <Field label="Structure type" value={structureType} onChangeText={setStructureType} placeholder="Bridge / tower / wind turbine" />
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

      <Button
        title="Create draft"
        onPress={save}
        disabled={!canSave}
        loading={createAmendment.isPending}
      />
    </Screen>
  );
}
