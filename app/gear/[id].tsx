import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDate, formatDateOrDash } from '@/src/domain/date-format';
import { todayLocalIsoDate } from '@/src/domain/date-utils';
import type { GearInspection, GearInspectionResult, GearStatus } from '@/src/domain/gear/types';
import {
  useGearInspections,
  useGearItemDetail,
  useRecordGearInspection,
} from '@/src/domain/gear/use-gear';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import {
  Button,
  Card,
  ChipSelect,
  CountdownDial,
  DateField,
  Field,
  IconBtn,
  Pill,
  SectionH,
  TopBar,
  type CountdownStatus,
} from '@/src/ui/primitives/v2';
import {
  GEAR_ICON,
  IconArrowLeft,
  IconCheck,
  IconLock,
  IconVoid,
  IconWarn,
} from '@/src/ui/icons';
import { haptics } from '@/src/ui/haptics';

const MS_PER_DAY = 86_400_000;

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function parseLocalDate(iso: string | null | undefined): number | null {
  if (!iso) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(iso)) {
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).getTime();
  }
  const ts = Date.parse(iso);
  return Number.isFinite(ts) ? ts : null;
}

function statusToDialStatus(status: GearStatus): CountdownStatus {
  return status === 'current' ? 'ok' : status;
}

const RESULT_OPTIONS: Array<{ value: GearInspectionResult; label: string }> = [
  { value: 'pass', label: 'Pass' },
  { value: 'pass_with_concerns', label: 'Concerns' },
  { value: 'fail', label: 'Fail — retire' },
];

export default function GearDetailScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const gearId = firstParam(id);
  const detail = useGearItemDetail(gearId);
  const inspections = useGearInspections(gearId, 8);
  const recordInspection = useRecordGearInspection();

  const [showInspect, setShowInspect] = React.useState(false);
  const [inspResult, setInspResult] = React.useState<GearInspectionResult>('pass');
  const [inspDate, setInspDate] = React.useState(todayLocalIsoDate());
  const [inspNotes, setInspNotes] = React.useState('');
  const [inspNextDue, setInspNextDue] = React.useState('');
  // Audit-grade: every inspection records who did it.
  const [inspectorName, setInspectorName] = React.useState('');
  const [inspectorCertNumber, setInspectorCertNumber] = React.useState('');

  const item = detail.data?.item;
  const status = detail.data?.status ?? 'unscheduled';
  const isRetired = status === 'retired';

  if (detail.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg }}>
        <TopBar
          title="Gear"
          leading={
            <IconBtn icon={IconArrowLeft} label="Back" size="md" onPress={() => router.replace('/gear')} />
          }
        />
        <View style={{ padding: 20 }}>
          <Text style={{ ...type.body, color: tokens.textDim }}>Loading gear…</Text>
        </View>
      </View>
    );
  }

  if (detail.isError) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg }}>
        <TopBar
          title="Gear"
          leading={
            <IconBtn icon={IconArrowLeft} label="Back" size="md" onPress={() => router.replace('/gear')} />
          }
        />
        <View style={{ padding: 20, gap: 16 }}>
          <Text style={{ ...type.heroCardTitle, color: tokens.text }}>Couldn&apos;t load this gear item</Text>
          <Text style={{ ...type.body, color: tokens.textDim }}>
            Something went wrong. Check your connection and try again.
          </Text>
          <Button variant="primary" onPress={() => detail.refetch()}>
            Retry
          </Button>
        </View>
      </View>
    );
  }

  if (!detail.data || !item) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg }}>
        <TopBar
          title="Gear"
          leading={
            <IconBtn
              icon={IconArrowLeft}
              label="Back"
              size="md"
              onPress={() => router.replace('/gear')}
            />
          }
        />
        <View style={{ padding: 20, gap: 16 }}>
          <Text style={{ ...type.heroCardTitle, color: tokens.text }}>Gear not found</Text>
          <Button variant="primary" onPress={() => router.replace('/gear')}>
            Back to gear
          </Button>
        </View>
      </View>
    );
  }

  const today = new Date();
  const todayStart = startOfLocalDay(today);
  const nextDueTs = parseLocalDate(item.next_inspection_due);
  const lastInspectionTs =
    parseLocalDate(detail.data.latest_inspection?.inspected_on) ??
    parseLocalDate(item.created_at);

  let dialDays: number | null = null;
  let dialProgress = 0;
  if (nextDueTs != null) {
    dialDays = Math.round((nextDueTs - todayStart) / MS_PER_DAY);
    if (lastInspectionTs != null && nextDueTs > lastInspectionTs) {
      dialProgress = Math.max(0, Math.min(1, (todayStart - lastInspectionTs) / (nextDueTs - lastInspectionTs)));
    } else if (dialDays < 0) {
      dialProgress = 1;
    }
  }

  const Icon = GEAR_ICON[item.category];

  function submitInspection() {
    if (!gearId) return;
    if (inspResult === 'fail') {
      haptics.warning();
      Alert.alert(
        'Retire gear?',
        `Logging a failed inspection retires ${item?.name ?? 'this item'} from active use. This cannot be undone in the app — re-add the item if it's later restored to service.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retire on fail', style: 'destructive', onPress: performSubmit },
        ],
      );
      return;
    }
    performSubmit();
  }

  function performSubmit() {
    if (!gearId) return;
    recordInspection.mutate(
      {
        gear_id: gearId,
        result: inspResult,
        inspected_on: inspDate,
        notes: inspNotes.trim() || null,
        next_inspection_due: inspNextDue.trim() || null,
        inspector_name: inspectorName,
        inspector_cert_number: inspectorCertNumber.trim() || null,
      },
      {
        onSuccess: () => {
          haptics.success();
          setInspResult('pass');
          setInspNotes('');
          setInspNextDue('');
          setInspDate(todayLocalIsoDate());
          setInspectorName('');
          setInspectorCertNumber('');
          setShowInspect(false);
        },
        onError: (err) => {
          haptics.error();
          const code = err instanceof Error ? err.message : String(err);
          const friendly =
            code === 'gear_retired'
              ? 'This item is already retired, so the inspection was not recorded and the item was not changed. Pull to refresh and reopen the item.'
              : code === 'gear_not_found'
                ? 'This gear item could not be found — it may have been removed on another device. Nothing was changed.'
                : code === 'inspector_identity_required'
                  ? 'Add the inspector name before saving. The inspection was not recorded.'
                  : 'Could not save the inspection. The item was NOT changed — please try again.';
          Alert.alert('Inspection not saved', friendly);
        },
      },
    );
  }

  const categoryLabel = item.category.charAt(0).toUpperCase() + item.category.slice(1);
  const mfgModel = [item.manufacturer, item.model].filter(Boolean).join(' ');

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: tokens.bg }}
    >
      <TopBar
        title={categoryLabel}
        leading={
          <IconBtn
            icon={IconArrowLeft}
            label="Back"
            size="md"
            onPress={() => router.back()}
          />
        }
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 24 + insets.bottom,
          gap: 14,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* HERO */}
        <Card padding={18}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                backgroundColor: tokens.surface2,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size={42} color={tokens.text} fill={tokens.accent} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              {mfgModel ? (
                <Text style={{ ...type.monoKicker, color: tokens.textFaint }} numberOfLines={1}>
                  {mfgModel.toUpperCase()}
                </Text>
              ) : null}
              <Text
                style={{
                  fontFamily: 'Manrope_700Bold',
                  fontWeight: '700',
                  fontSize: 20,
                  lineHeight: 24,
                  letterSpacing: -0.4,
                  color: tokens.text,
                  marginTop: 2,
                }}
                numberOfLines={2}
                selectable
              >
                {item.name}
              </Text>
              {item.serial_number ? (
                <Text style={{ ...type.mono, color: tokens.textDim, marginTop: 2 }} numberOfLines={1}>
                  S/N {item.serial_number}
                </Text>
              ) : null}
            </View>
            <StatusPillForGear status={status} />
          </View>

          <View style={{ height: 1, backgroundColor: tokens.lineSoft, marginVertical: 16 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <CountdownDial
              progress={dialProgress}
              status={statusToDialStatus(status)}
              days={dialDays}
              size={90}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>NEXT INSPECTION</Text>
              <Text
                style={{
                  fontFamily: 'Manrope_700Bold',
                  fontWeight: '700',
                  fontSize: 20,
                  lineHeight: 24,
                  color: tokens.text,
                  marginTop: 2,
                }}
              >
                {formatDateOrDash(item.next_inspection_due)}
              </Text>
              <Text
                style={{
                  ...type.cardSub,
                  color:
                    status === 'overdue'
                      ? tokens.danger
                      : status === 'due_soon'
                        ? tokens.warn
                        : tokens.textDim,
                  marginTop: 4,
                }}
              >
                {status === 'retired'
                  ? `Retired ${formatDateOrDash(item.retired_at)}`
                  : dialDays == null
                    ? 'No inspection scheduled'
                    : dialDays < 0
                      ? `${Math.abs(dialDays)} days overdue`
                      : dialDays === 0
                        ? 'Due today'
                        : `${dialDays} days remaining`}
              </Text>
            </View>
          </View>
        </Card>

        {!isRetired ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button
              variant="primary"
              full
              onPress={() => setShowInspect((v) => !v)}
            >
              {showInspect ? 'Close' : 'Record inspection'}
            </Button>
            <IconBtn
              icon={IconLock}
              label="Retire gear"
              size="lg"
              tone="danger"
              onPress={() => {
                haptics.warning();
                setInspResult('fail');
                setShowInspect(true);
              }}
            />
          </View>
        ) : null}

        {showInspect && !isRetired ? (
          <Card padding={16}>
            <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 10 }}>
              NEW INSPECTION
            </Text>
            <View style={{ gap: 10 }}>
              <View>
                <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 6 }}>
                  RESULT
                </Text>
                <ChipSelect<GearInspectionResult>
                  value={inspResult}
                  options={RESULT_OPTIONS}
                  onChange={setInspResult}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <DateField
                    label="Inspected on"
                    value={inspDate || null}
                    onChange={(iso) => setInspDate(iso ?? '')}
                    maxDate={todayLocalIsoDate()}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <DateField
                    label="Next due"
                    value={inspNextDue || null}
                    onChange={(iso) => setInspNextDue(iso ?? '')}
                    minDate={inspDate || null}
                    clearable
                    disabled={inspResult === 'fail'}
                    placeholder={inspResult === 'fail' ? 'Cleared on retire' : undefined}
                  />
                </View>
              </View>
              {inspResult !== 'fail' && !inspNextDue.trim() ? (
                // A clean pass with no next-due silently drops the item to
                // "unscheduled" (a warning state) — warn before that happens.
                <Text style={{ ...type.cardSub, color: tokens.text }}>
                  No next-due date set — this item will show as “unscheduled” until one is added.
                </Text>
              ) : null}
              <Field
                label="Notes"
                value={inspNotes}
                onChangeText={setInspNotes}
                placeholder="Anything the next inspector should know"
                multiline
              />
              <Field
                label="Inspector name"
                value={inspectorName}
                onChangeText={setInspectorName}
                placeholder="Your full name"
                autoCapitalize="words"
                helper="Required — recorded against this inspection."
              />
              <Field
                label="Inspector cert number"
                value={inspectorCertNumber}
                onChangeText={setInspectorCertNumber}
                placeholder="e.g. IRATA 30219 / SPRAT 1234"
                keyboardType="default"
                helper="Optional but expected for audit-grade records."
              />
              <Button
                variant="primary"
                full
                onPress={submitInspection}
                disabled={recordInspection.isPending || inspectorName.trim().length < 2}
              >
                {recordInspection.isPending
                  ? 'Recording…'
                  : inspResult === 'fail'
                    ? 'Retire & record fail'
                    : 'Save inspection'}
              </Button>
            </View>
          </Card>
        ) : null}

        {/* HISTORY */}
        <SectionH
          kicker="HISTORY"
          title={
            inspections.data && inspections.data.length > 0
              ? `${inspections.data.length} inspection${inspections.data.length === 1 ? '' : 's'}`
              : 'No history yet'
          }
        />
        {inspections.data && inspections.data.length > 0 ? (
          <Card padding={14}>
            <View style={{ gap: 12 }}>
              {inspections.data.slice(0, 4).map((insp) => (
                <InspectionRow key={insp.id} insp={insp} />
              ))}
            </View>
          </Card>
        ) : (
          <Card padding={16}>
            <Text style={{ ...type.cardSub, color: tokens.textDim }}>
              {isRetired
                ? 'This item has been retired.'
                : 'Record an inspection to start the history.'}
            </Text>
          </Card>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function StatusPillForGear({ status }: { status: GearStatus }) {
  if (status === 'overdue') return <Pill tone="danger" size="sm">Overdue</Pill>;
  if (status === 'due_soon') return <Pill tone="warn" size="sm">Due soon</Pill>;
  if (status === 'retired') return <Pill tone="chip" size="sm">Retired</Pill>;
  if (status === 'unscheduled') return <Pill tone="warn" size="sm">No date</Pill>;
  return <Pill tone="ok" size="sm">Current</Pill>;
}

function InspectionRow({ insp }: { insp: GearInspection }) {
  const { tokens } = useTheme();
  const tone =
    insp.result === 'pass'
      ? { bg: tokens.okSoft, fg: tokens.ok }
      : insp.result === 'pass_with_concerns'
        ? { bg: tokens.warnSoft, fg: tokens.warn }
        : { bg: tokens.dangerSoft, fg: tokens.danger };
  const Icon =
    insp.result === 'pass' ? IconCheck : insp.result === 'pass_with_concerns' ? IconWarn : IconVoid;
  const label =
    insp.result === 'pass'
      ? 'Pass'
      : insp.result === 'pass_with_concerns'
        ? 'Pass with concerns'
        : 'Fail · retired';

  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  };
  const titleStyle: TextStyle = {
    ...type.cardTitle,
    color: tokens.text,
  };
  const subStyle: TextStyle = {
    ...type.monoSm,
    color: tokens.textDim,
    marginTop: 2,
  };

  return (
    <View style={rowStyle}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: tone.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={21} color={tone.fg} fill={tone.fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={titleStyle} numberOfLines={1}>
          {label}
        </Text>
        <Text style={subStyle} numberOfLines={1}>
          {formatDate(insp.inspected_on)}
          {insp.inspector_name ? ` · ${insp.inspector_name}` : ''}
          {insp.inspector_cert_number ? ` (${insp.inspector_cert_number})` : ''}
        </Text>
        {insp.notes ? (
          <Text style={[subStyle, { marginTop: 1 }]} numberOfLines={2}>
            {insp.notes}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

