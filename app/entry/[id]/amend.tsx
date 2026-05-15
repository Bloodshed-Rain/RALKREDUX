import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Save } from 'lucide-react-native';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { HeightUnit } from '@/src/domain/logbook/types';
import { useCreateAmendment, useEntryDetail } from '@/src/domain/logbook/use-logbook';
import { AnimatedStamp, Chip, DocActionButton, DocBand, Field, Screen, SectionH } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { haptics } from '@/src/ui/haptics';

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

const TASK_PRESETS = ['Inspection', 'Maintenance', 'Rescue standby', 'Training'];
const ACCESS_PRESETS = ['Two-rope access', 'Aid climb', 'Rescue cover', 'Fall restraint'];
const STRUCTURE_PRESETS = ['Bridge', 'Tower', 'Wind turbine', 'Facade'];

export default function AmendEntryScreen() {
  const { spacing, typography, tidewater, hairlines } = useTheme();
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
  const isMissing = {
    employer: employer.trim().length === 0,
    site: site.trim().length === 0,
    client: client.trim().length === 0,
    task: workTask.trim().length === 0,
    access: accessMethod.trim().length === 0,
    structure: structureType.trim().length === 0,
    notes: description.trim().length === 0,
    hours: !Number.isFinite(parsedHours) || parsedHours <= 0,
    height: !Number.isFinite(parsedHeight) || parsedHeight <= 0,
  };
  const missingCount = Object.values(isMissing).filter(Boolean).length;

  const canSave = Boolean(entryId) && entry?.status === 'signed' && missingCount === 0;

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
      {
        onSuccess: (draft) => {
          haptics.success();
          router.replace(`/entry/${draft.id}`);
        },
        onError: () => haptics.error(),
      },
    );
  }

  const sourceLocked = entry?.status && entry.status !== 'signed';

  return (
    <Screen
      padded={false}
      weave
      footer={
        <DocActionButton
          title={canSave ? 'CREATE AMENDMENT DRAFT' : 'FINISH AMENDMENT'}
          icon={Save}
          onPress={save}
          disabled={!canSave}
          loading={createAmendment.isPending}
        />
      }
    >
      <DocBand
        variant="top"
        formId="CH.9 - AMENDMENT"
        rev={entry?.status === 'signed' ? 'SIGNED SOURCE' : 'UNAVAILABLE'}
        effective="ENTRY-HASH v2"
        rightLabel={canSave ? 'READY' : 'HOLD'}
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
                AMENDMENT DRAFT
              </Text>
              <Text selectable style={{ ...typography.displayMd, color: tidewater.ink }} numberOfLines={2}>
                {entry?.site || 'Loading entry'}
              </Text>
              <Text style={{ ...typography.monoSm, color: tidewater.ink3 }}>
                AMENDS ENTRY {entryId ? entryId.slice(-6).toUpperCase() : '------'}
              </Text>
            </View>
            <AnimatedStamp tone={entry?.status === 'signed' ? 'green' : 'yellow'} rotation="light">
              {entry?.status === 'signed' ? 'SIGNED SOURCE' : 'LOCKED'}
            </AnimatedStamp>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, padding: spacing.md }}>
            <Chip tone="mute">{entry ? `${entry.work_hours.toFixed(1)} HR ON FILE` : '—'}</Chip>
            <Chip tone={missingCount === 0 ? 'green' : 'yellow'}>
              {missingCount === 0 ? 'COMPLETE' : `${missingCount} MISSING`}
            </Chip>
          </View>
          {sourceLocked ? (
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: tidewater.hairFaint,
                backgroundColor: tidewater.yellowSoft,
                padding: spacing.md,
              }}
            >
              <Text style={{ ...typography.displaySm, color: tidewater.ink, letterSpacing: 1.2 }}>
                AMENDMENTS REQUIRE A SIGNED SOURCE
              </Text>
              <Text style={{ ...typography.monoSm, color: tidewater.ink2, marginTop: 4 }}>
                Only signed entries can be amended. Drafts should be edited instead.
              </Text>
            </View>
          ) : null}
        </View>

        {/* § 26 Site & parties */}
        <View>
          <SectionH n="26" right={isMissing.employer || isMissing.site || isMissing.client ? 'REQUIRED' : 'OK'}>
            Site and parties
          </SectionH>
          <View style={{ gap: spacing.md }}>
            <Field
              label="Site"
              value={site}
              onChangeText={setSite}
              placeholder="Tower / plant / bridge"
              invalid={isMissing.site}
            />
            <Field
              label="Employer"
              value={employer}
              onChangeText={setEmployer}
              placeholder="Company"
              invalid={isMissing.employer}
            />
            <Field
              label="Client"
              value={client}
              onChangeText={setClient}
              placeholder="Customer / contractor"
              invalid={isMissing.client}
            />
          </View>
        </View>

        {/* § 27 Task & method */}
        <View>
          <SectionH n="27" right={isMissing.task || isMissing.access || isMissing.structure ? 'REQUIRED' : 'OK'}>
            Task and method
          </SectionH>
          <View style={{ gap: spacing.md }}>
            <View style={{ gap: spacing.xs }}>
              <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.5 }}>TASK</Text>
              <ChipRow options={TASK_PRESETS} value={workTask} onChange={setWorkTask} />
              <Field
                label="Work task"
                value={workTask}
                onChangeText={setWorkTask}
                placeholder="Inspection / maintenance / rescue cover"
                invalid={isMissing.task}
                />
            </View>
            <View style={{ gap: spacing.xs }}>
              <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.5 }}>ACCESS METHOD</Text>
              <ChipRow options={ACCESS_PRESETS} value={accessMethod} onChange={setAccessMethod} />
              <Field
                label="Access method"
                value={accessMethod}
                onChangeText={setAccessMethod}
                placeholder="Two-rope access"
                invalid={isMissing.access}
                />
            </View>
            <View style={{ gap: spacing.xs }}>
              <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.5 }}>STRUCTURE</Text>
              <ChipRow options={STRUCTURE_PRESETS} value={structureType} onChange={setStructureType} />
              <Field
                label="Structure type"
                value={structureType}
                onChangeText={setStructureType}
                placeholder="Bridge / tower / wind turbine"
                invalid={isMissing.structure}
                />
            </View>
          </View>
        </View>

        {/* § 28 Time and height */}
        <View>
          <SectionH n="28" right={isMissing.hours || isMissing.height ? 'REQUIRED' : 'OK'}>
            Time and height
          </SectionH>
          <View style={{ gap: spacing.md }}>
            <Field
              label="Rope access hours"
              value={hours}
              onChangeText={setHours}
              keyboardType="decimal-pad"
              placeholder="8"
              invalid={isMissing.hours}
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
              <View style={{ flex: 2 }}>
                <Field
                  label="Maximum height"
                  value={maxHeight}
                  onChangeText={(v) => setMaxHeight(v.replace(/[^\d.]/g, ''))}
                  keyboardType="decimal-pad"
                  placeholder="120"
                  invalid={isMissing.height}
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

        {/* § 29 Notes */}
        <View>
          <SectionH n="29" right={isMissing.notes ? 'REQUIRED' : 'OK'}>
            Work notes
          </SectionH>
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Describe the correction or addition."
            placeholderTextColor={tidewater.ink3}
            style={{
              borderWidth: 1.5,
              borderColor: isMissing.notes ? tidewater.yellowDeep : tidewater.hair,
              backgroundColor: isMissing.notes ? tidewater.yellowSoft : tidewater.white,
              padding: spacing.sm,
              ...typography.body,
              color: tidewater.ink,
              minHeight: 120,
              textAlignVertical: 'top',
            }}
          />
        </View>
      </View>

      <DocBand
        variant="footer"
        text={
          canSave
            ? 'AMENDMENT DRAFT WILL BE A NEW ENTRY POINTING BACK TO THE SIGNED SOURCE'
            : 'AMENDMENT HOLD - COMPLETE REQUIRED FIELDS BEFORE SAVING'
        }
        page={entryId ? `AMENDS ${entryId.slice(-6).toUpperCase()}` : 'AMENDS ------'}
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

