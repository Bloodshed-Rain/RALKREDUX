import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { HeightUnit } from '@/src/domain/logbook/types';
import { useCreateEntry } from '@/src/domain/logbook/use-logbook';
import { useProfile } from '@/src/domain/profile/use-profile';
import { Button, Card, Field, Screen } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

export default function NewEntryScreen() {
  const { colors, radii, spacing, typography } = useTheme();
  const profile = useProfile();
  const createEntry = useCreateEntry();
  const [employer, setEmployer] = React.useState('');
  const [site, setSite] = React.useState('');
  const [client, setClient] = React.useState('');
  const [workTask, setWorkTask] = React.useState('');
  const [accessMethod, setAccessMethod] = React.useState('Two-rope access');
  const [structureType, setStructureType] = React.useState('');
  const [maxHeight, setMaxHeight] = React.useState('');
  const [heightUnit, setHeightUnit] = React.useState<HeightUnit>('ft');
  const [description, setDescription] = React.useState('');
  const [hours, setHours] = React.useState('8');

  const parsedHours = Number(hours);
  const parsedHeight = Number(maxHeight);
  const canSave =
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
    if (!canSave) return;
    const p = profile.data;
    createEntry.mutate(
      {
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
        sprat_level_snapshot: p?.sprat_level ?? null,
        irata_level_snapshot: p?.irata_level ?? null,
      },
      { onSuccess: (entry) => router.replace(`/entry/${entry.id}`) },
    );
  }

  return (
    <Screen>
      <Card>
        <Text selectable style={{ ...typography.title2, color: colors.textPrimary }}>
          Draft entry
        </Text>
        <Field label="Employer" value={employer} onChangeText={setEmployer} placeholder="Company" />
        <Field label="Site" value={site} onChangeText={setSite} placeholder="Tower / plant / bridge" />
        <Field label="Client" value={client} onChangeText={setClient} placeholder="Client" />
        <Field label="Work task" value={workTask} onChangeText={setWorkTask} placeholder="Inspection / maintenance / rescue cover" />
        <Field label="Access method" value={accessMethod} onChangeText={setAccessMethod} placeholder="Two-rope access" />
        <Field label="Structure type" value={structureType} onChangeText={setStructureType} placeholder="Bridge / tower / wind turbine" />
        <Field
          label="Rope access hours"
          value={hours}
          onChangeText={setHours}
          keyboardType="decimal-pad"
          placeholder="8"
        />
        <Field
          label="Maximum height"
          value={maxHeight}
          onChangeText={setMaxHeight}
          keyboardType="decimal-pad"
          placeholder="120"
        />
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
          placeholder="What work was performed?"
        />
      </Card>
      <Button
        title="Save draft"
        onPress={save}
        disabled={!canSave}
        loading={createEntry.isPending}
      />
    </Screen>
  );
}
