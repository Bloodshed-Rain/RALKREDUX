import React from 'react';
import { CheckCircle2, Copy, PenLine, Save, Send, Star } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { isValidIsoDateRange, todayLocalIsoDate } from '@/src/domain/date-utils';
import type { HeightUnit } from '@/src/domain/logbook/types';
import {
  useCreateEntry,
  useCreateEntryTemplate,
  useEntries,
  useEntryTemplates,
} from '@/src/domain/logbook/use-logbook';
import { useProfile } from '@/src/domain/profile/use-profile';
import { Button, Card, DateField, Field, Screen } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

export default function NewEntryScreen() {
  const { colors, radii, spacing, typography, touchTarget } = useTheme();
  const profile = useProfile();
  const createEntry = useCreateEntry();
  const entries = useEntries();
  const templates = useEntryTemplates();
  const createTemplate = useCreateEntryTemplate();
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(null);
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
  const [dateFrom, setDateFrom] = React.useState(todayLocalIsoDate());
  const [dateTo, setDateTo] = React.useState(todayLocalIsoDate());
  const [templateName, setTemplateName] = React.useState('');
  const [showTemplateSave, setShowTemplateSave] = React.useState(false);
  const [saveDestination, setSaveDestination] = React.useState<'detail' | 'sign' | 'request' | null>(null);

  const parsedHours = Number(hours);
  const parsedHeight = Number(maxHeight);
  const dateRangeValid = isValidIsoDateRange(dateFrom, dateTo || dateFrom);
  const canSave =
    site.trim().length > 0 &&
    workTask.trim().length > 0 &&
    Number.isFinite(parsedHours) &&
    parsedHours > 0 &&
    dateRangeValid;
  const isAuditReady =
    canSave &&
    employer.trim().length > 0 &&
    client.trim().length > 0 &&
    accessMethod.trim().length > 0 &&
    structureType.trim().length > 0 &&
    description.trim().length > 0 &&
    Number.isFinite(parsedHeight) &&
    parsedHeight > 0;
  const missingForDraft = [
    site.trim() ? null : 'site or location',
    workTask.trim() ? null : 'work task',
    Number.isFinite(parsedHours) && parsedHours > 0 ? null : 'rope access hours',
    dateRangeValid ? null : 'valid work dates',
  ].filter(Boolean) as string[];
  const missingForSigning = [
    employer.trim() ? null : 'employer',
    client.trim() ? null : 'client',
    accessMethod.trim() ? null : 'access method',
    structureType.trim() ? null : 'structure',
    description.trim() ? null : 'work notes',
    Number.isFinite(parsedHeight) && parsedHeight > 0 ? null : 'height',
  ].filter(Boolean) as string[];

  function save(destination: 'detail' | 'sign' | 'request' = 'detail') {
    if (!canSave) return;
    const p = profile.data;
    setSaveDestination(destination);
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
        date_from: dateFrom,
        date_to: dateTo || dateFrom,
        template_id: selectedTemplateId,
        sprat_level_snapshot: p?.sprat_level ?? null,
        irata_level_snapshot: p?.irata_level ?? null,
      },
      {
        onSuccess: (entry) => {
          if (destination === 'sign') {
            router.replace(`/entry/${entry.id}/sign`);
            return;
          }

          if (destination === 'request') {
            router.replace(`/entry/${entry.id}/request-signature`);
            return;
          }

          router.replace(`/entry/${entry.id}`);
        },
        onSettled: () => setSaveDestination(null),
      },
    );
  }

  function applyTemplate(template: NonNullable<typeof templates.data>[number]) {
    setSelectedTemplateId(template.id);
    if (template.employer) setEmployer(template.employer);
    if (template.client) setClient(template.client);
    setWorkTask(template.work_task);
    setAccessMethod(template.access_method);
    setStructureType(template.structure_type);
    setDescription(template.description);
    setHours(String(template.work_hours));
    setMaxHeight(template.max_height === null ? '' : String(template.max_height));
    setHeightUnit(template.height_unit);
  }

  function duplicateLastEntry() {
    const latest = entries.data?.[0];
    if (!latest) return;
    setSelectedTemplateId(null);
    setEmployer(latest.employer);
    setSite(latest.site);
    setClient(latest.client);
    setWorkTask(latest.work_task);
    setAccessMethod(latest.access_method);
    setStructureType(latest.structure_type);
    setMaxHeight(latest.max_height === null ? '' : String(latest.max_height));
    setHeightUnit(latest.height_unit);
    setDescription(latest.description);
    setHours(String(latest.work_hours));
    setDateFrom(todayLocalIsoDate());
    setDateTo(todayLocalIsoDate());
  }

  function saveTemplate() {
    if (!templateName.trim() || !isAuditReady) return;
    createTemplate.mutate({
      name: templateName,
      employer,
      client,
      work_task: workTask,
      access_method: accessMethod,
      structure_type: structureType,
      description,
      work_hours: parsedHours,
      max_height: parsedHeight,
      height_unit: heightUnit,
    }, {
      onSuccess: (template) => {
        setSelectedTemplateId(template.id);
        setTemplateName('');
      },
    });
  }

  return (
    <Screen
      footer={
        <View style={{ gap: spacing.sm }}>
          {!isAuditReady ? (
            <RequirementList
              title={canSave ? 'Before supervisor sign-off' : 'Before saving'}
              items={canSave ? missingForSigning : missingForDraft}
            />
          ) : null}
          {isAuditReady ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                title="Sign now"
                icon={PenLine}
                onPress={() => save('sign')}
                disabled={!canSave || createEntry.isPending}
                loading={saveDestination === 'sign' && createEntry.isPending}
                style={{ flex: 1 }}
              />
              <Button
                title="Request"
                icon={Send}
                variant="secondary"
                onPress={() => save('request')}
                disabled={!canSave || createEntry.isPending}
                loading={saveDestination === 'request' && createEntry.isPending}
                style={{ flex: 1 }}
              />
            </View>
          ) : null}
          <Button
            title={isAuditReady ? 'Save only' : 'Save draft'}
            icon={Save}
            variant={isAuditReady ? 'secondary' : 'primary'}
            onPress={() => save('detail')}
            disabled={!canSave || createEntry.isPending}
            loading={saveDestination === 'detail' && createEntry.isPending}
          />
        </View>
      }
    >
      <Card>
        <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
          {isAuditReady
            ? 'Ready for supervisor review'
            : canSave
              ? `${missingForSigning.length} items left before signing`
              : `${missingForDraft.length} items left before saving`}
        </Text>
        <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
          {isAuditReady
            ? 'This entry has the details needed for sign-off. Save it and go straight to local signing or a verifier request.'
            : canSave
              ? `You can save now and finish later. Add ${missingForSigning.join(', ')} before signing.`
              : `Add ${missingForDraft.join(', ')} to save this draft.`}
        </Text>
      </Card>

      <Card>
        <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
          Job basics
        </Text>
        {templates.data?.length ? (
          <View style={{ gap: spacing.sm }}>
            <Text selectable style={{ ...typography.label, color: colors.textPrimary }}>
              Templates
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {templates.data.map((template) => {
                const selected = template.id === selectedTemplateId;
                return (
                  <Pressable
                    key={template.id}
                    accessibilityRole="button"
                    onPress={() => applyTemplate(template)}
                    style={{
                      minHeight: touchTarget.min,
                      justifyContent: 'center',
                      borderRadius: radii.sm,
                      borderWidth: 1,
                      borderColor: selected ? colors.accentPrimary : colors.border,
                      backgroundColor: selected ? colors.accentTint : colors.bgSurface,
                      paddingHorizontal: spacing.sm,
                    }}
                  >
                    <Text
                      selectable={false}
                      style={{
                        ...typography.caption,
                        color: selected ? colors.accentPrimary : colors.textSecondary,
                      }}
                    >
                      {template.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
        {entries.data?.length ? (
          <Button title="Duplicate last" icon={Copy} variant="secondary" onPress={duplicateLastEntry} />
        ) : null}
        <Field label="Site" value={site} onChangeText={setSite} placeholder="Tower / plant / bridge" />
        <View style={{ gap: spacing.sm }}>
          <Text selectable style={{ ...typography.label, color: colors.textPrimary }}>
            Task
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {['Inspection', 'Maintenance', 'Rescue standby', 'Training'].map((preset) => (
              <Pressable
                key={preset}
                accessibilityRole="button"
                onPress={() => setWorkTask(preset)}
                style={{
                  minHeight: touchTarget.min,
                  justifyContent: 'center',
                  borderRadius: radii.sm,
                  borderWidth: 1,
                  borderColor: workTask === preset ? colors.accentPrimary : colors.border,
                  backgroundColor: workTask === preset ? colors.accentTint : colors.bgSurface,
                  paddingHorizontal: spacing.sm,
                }}
              >
                <Text selectable={false} style={{ ...typography.caption, color: workTask === preset ? colors.accentPrimary : colors.textSecondary }}>
                  {preset}
                </Text>
              </Pressable>
            ))}
          </View>
          <Field label="Custom task" value={workTask} onChangeText={setWorkTask} placeholder="Inspection / maintenance / rescue cover" />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {['Two-rope access', 'Aid climb', 'Rescue cover', 'Fall restraint'].map((preset) => (
            <Pressable
              key={preset}
              accessibilityRole="button"
              onPress={() => setAccessMethod(preset)}
              style={{
                minHeight: touchTarget.min,
                justifyContent: 'center',
                borderRadius: radii.sm,
                borderWidth: 1,
                borderColor: accessMethod === preset ? colors.accentPrimary : colors.border,
                backgroundColor: accessMethod === preset ? colors.accentTint : colors.bgSurface,
                paddingHorizontal: spacing.sm,
              }}
            >
              <Text selectable={false} style={{ ...typography.caption, color: accessMethod === preset ? colors.accentPrimary : colors.textSecondary }}>
                {preset}
              </Text>
            </Pressable>
          ))}
        </View>
        <Field
          label="Rope access hours"
          value={hours}
          onChangeText={setHours}
          keyboardType="decimal-pad"
          placeholder="8"
        />
      </Card>

      <Card>
        <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
          Required for sign-off
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <DateField label="From" value={dateFrom} onChange={setDateFrom} />
          </View>
          <View style={{ flex: 1 }}>
            <DateField label="To" value={dateTo} onChange={setDateTo} />
          </View>
        </View>
        <Field label="Employer" value={employer} onChangeText={setEmployer} placeholder="Company" />
        <Field label="Client" value={client} onChangeText={setClient} placeholder="Client" />
        <Field label="Access method" value={accessMethod} onChangeText={setAccessMethod} placeholder="Two-rope access" />
        <Field label="Structure type" value={structureType} onChangeText={setStructureType} placeholder="Bridge / tower / wind turbine" />
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
          label="Work notes"
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
          style={{ minHeight: 96 }}
          placeholder="What work was performed?"
        />
        {isAuditReady ? (
          <Button
            title={showTemplateSave ? 'Cancel template' : 'Save as template'}
            icon={Star}
            variant="ghost"
            onPress={() => setShowTemplateSave((value) => !value)}
          />
        ) : null}
        {showTemplateSave ? (
          <>
            <Field
              label="Template name"
              value={templateName}
              onChangeText={setTemplateName}
              placeholder="Template name"
            />
            <Button
              title={createTemplate.isPending ? 'Saving template' : 'Save template'}
              icon={Save}
              onPress={saveTemplate}
              variant="secondary"
              disabled={!isAuditReady || !templateName.trim()}
            />
          </>
        ) : null}
      </Card>
    </Screen>
  );
}

function RequirementList({ title, items }: { title: string; items: string[] }) {
  const { colors, radii, spacing, typography } = useTheme();
  if (!items.length) return null;

  return (
    <View
      style={{
        borderRadius: radii.sm,
        backgroundColor: colors.statusWarnTint,
        padding: spacing.md,
        gap: spacing.xs,
      }}
    >
      <Text selectable={false} style={{ ...typography.label, color: colors.statusWarn }}>
        {title}
      </Text>
      {items.map((item) => (
        <View key={item} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <CheckCircle2 size={14} color={colors.statusWarn} strokeWidth={2.2} />
          <Text selectable={false} style={{ ...typography.caption, color: colors.statusWarn, flex: 1 }}>
            Add {item}
          </Text>
        </View>
      ))}
    </View>
  );
}
