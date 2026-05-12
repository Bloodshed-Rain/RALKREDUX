import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Mail,
  Send,
  UserRound,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { getEntryVerificationReadiness } from '@/src/domain/logbook/entry-readiness';
import {
  useCreateRemoteSignatureRequest,
  useEntryDetail,
  useSupervisorContacts,
} from '@/src/domain/logbook/use-logbook';
import { Button, Card, Field, Screen } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

export default function RemoteSignatureRequestScreen() {
  const { colors, radii, spacing, typography, touchTarget } = useTheme();
  const { id, supervisorId } = useLocalSearchParams<{
    id?: string | string[];
    supervisorId?: string | string[];
  }>();
  const entryId = firstParam(id);
  const supervisorIdParam = firstParam(supervisorId);
  const detail = useEntryDetail(entryId);
  const createRequest = useCreateRemoteSignatureRequest();
  const supervisors = useSupervisorContacts();
  const [recipientName, setRecipientName] = React.useState('');
  const [recipientContact, setRecipientContact] = React.useState('');
  const [verifierRole, setVerifierRole] = React.useState('');
  const [verifierCompany, setVerifierCompany] = React.useState('');
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const didPrefillSupervisor = React.useRef(false);
  const entry = detail.data?.entry;
  const readiness = entry ? getEntryVerificationReadiness(entry) : null;

  React.useEffect(() => {
    if (didPrefillSupervisor.current || !supervisorIdParam) return;
    const supervisor = supervisors.data?.find((item) => item.id === supervisorIdParam);
    if (!supervisor) return;

    didPrefillSupervisor.current = true;
    setRecipientName(supervisor.name);
    setRecipientContact(supervisor.contact ?? '');
    setVerifierRole(supervisor.role ?? '');
    setVerifierCompany(supervisor.company ?? '');
    setDetailsOpen(Boolean(supervisor.role || supervisor.company));
  }, [supervisorIdParam, supervisors.data]);

  const selectedKnownSupervisor = supervisors.data?.find(
    (supervisor) =>
      supervisor.name === recipientName &&
      (supervisor.contact ?? '') === recipientContact,
  );
  const hasVerifierName = recipientName.trim().length > 1;

  const canCreate =
    Boolean(entryId) &&
    entry?.status === 'draft' &&
    readiness?.ready === true &&
    !detail.data?.remote_request &&
    hasVerifierName;
  const missingToCreate = [
    ...(readiness?.missingFields ?? []),
    hasVerifierName ? null : 'verifier name',
    detail.data?.remote_request ? 'finish or cancel the pending request' : null,
    entry?.status && entry.status !== 'draft' ? 'use a draft entry' : null,
  ].filter(Boolean) as string[];

  const footerTitle = canCreate
    ? 'Create remote request'
    : hasVerifierName
      ? 'Finish entry first'
      : 'Add verifier name';

  function submit() {
    if (!canCreate || !entryId) return;
    createRequest.mutate(
      {
        entry_id: entryId,
        recipient_name: recipientName,
        recipient_contact: recipientContact.trim() || null,
        verifier_role: verifierRole || null,
        verifier_company: verifierCompany || null,
      },
      { onSuccess: (updated) => router.replace(`/entry/${updated.entry.id}`) },
    );
  }

  return (
    <Screen
      footer={
        <View style={{ gap: spacing.sm }}>
          {!canCreate ? <RequirementList title="Before creating request" items={missingToCreate} /> : null}
          <Button
            title={footerTitle}
            icon={Send}
            onPress={submit}
            disabled={!canCreate}
            loading={createRequest.isPending}
          />
        </View>
      }
    >
      <Card>
        <SectionHeader icon={Send} title="Remote request" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Pill icon={BadgeCheck} label={entry ? `${entry.site} - ${entry.work_hours.toFixed(1)} h` : 'Loading'} />
          <Pill
            icon={readiness?.ready ? CheckCircle2 : AlertTriangle}
            label={readiness?.ready ? 'Ready' : `${readiness?.missingFields.length ?? 0} missing`}
            tone={readiness?.ready ? 'ok' : 'warn'}
          />
        </View>
        {entry?.status === 'draft' && readiness && !readiness.ready ? (
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
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text selectable style={{ ...typography.label, color: colors.statusWarn }}>
                Finish the entry first
              </Text>
              <Text selectable style={{ ...typography.caption, color: colors.statusWarn }}>
                Add {readiness.missingFields.join(', ')}
              </Text>
            </View>
          </View>
        ) : null}
      </Card>

      <Card>
        <SectionHeader
          icon={UserRound}
          title="Verifier"
          pill={selectedKnownSupervisor ? 'Known' : hasVerifierName ? 'New' : undefined}
        />
        <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
          Choose a saved supervisor or type a new verifier. Contact is optional; the request link can still be shared manually.
        </Text>
        {supervisors.data?.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {supervisors.data.map((supervisor) => {
              const selected = supervisor.id === selectedKnownSupervisor?.id;

              return (
                <Pressable
                  key={supervisor.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setRecipientName(supervisor.name);
                    setRecipientContact(supervisor.contact ?? '');
                    setVerifierRole(supervisor.role ?? '');
                    setVerifierCompany(supervisor.company ?? '');
                    setDetailsOpen(Boolean(supervisor.role || supervisor.company));
                  }}
                  style={({ pressed }) => ({
                    minHeight: touchTarget.min,
                    justifyContent: 'center',
                    borderRadius: radii.sm,
                    borderWidth: 1,
                    borderColor: selected ? colors.accentPrimary : colors.border,
                    backgroundColor: selected ? colors.accentTint : colors.bgSurface,
                    opacity: pressed ? 0.82 : 1,
                    paddingHorizontal: spacing.sm,
                  })}
                >
                  <Text
                    selectable={false}
                    style={{
                      ...typography.caption,
                      color: selected ? colors.accentPrimary : colors.textSecondary,
                    }}
                  >
                    {supervisor.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        <Field label="Verifier name" value={recipientName} onChangeText={setRecipientName} placeholder="Jordan Lee" />
        <Field
          label="Verifier contact"
          value={recipientContact}
          onChangeText={setRecipientContact}
          placeholder="Optional email or phone"
          hint="Optional. Add it if you want it saved for next time."
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => setDetailsOpen((value) => !value)}
          style={({ pressed }) => ({
            minHeight: 48,
            borderRadius: radii.sm,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: verifierRole || verifierCompany ? colors.statusOkTint : colors.bgSurface,
            opacity: pressed ? 0.82 : 1,
            paddingHorizontal: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.sm,
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
            <Mail size={18} color={verifierRole || verifierCompany ? colors.statusOk : colors.textSecondary} strokeWidth={2.2} />
            <Text selectable={false} style={{ ...typography.label, color: colors.textPrimary }}>
              Verifier details
            </Text>
          </View>
          {detailsOpen ? (
            <ChevronUp size={18} color={colors.textSecondary} strokeWidth={2.2} />
          ) : (
            <ChevronDown size={18} color={colors.textSecondary} strokeWidth={2.2} />
          )}
        </Pressable>
        {detailsOpen ? (
          <>
            <Field
              label="Verifier role"
              value={verifierRole}
              onChangeText={setVerifierRole}
              placeholder="IRATA L3 / Rope Access Manager"
            />
            <Field
              label="Company"
              value={verifierCompany}
              onChangeText={setVerifierCompany}
              placeholder="Optional"
            />
          </>
        ) : null}
      </Card>

      {detail.data?.remote_request ? (
        <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
          A remote request is already pending for this entry.
        </Text>
      ) : null}

      {entry?.status && entry.status !== 'draft' ? (
        <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
          Remote requests can only be created for draft entries.
        </Text>
      ) : null}

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
          <AlertTriangle size={14} color={colors.statusWarn} strokeWidth={2.2} />
          <Text selectable={false} style={{ ...typography.caption, color: colors.statusWarn, flex: 1 }}>
            Needs {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  pill,
}: {
  icon: LucideIcon;
  title: string;
  pill?: string;
}) {
  const { colors, radii, spacing, typography } = useTheme();

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
            backgroundColor: colors.accentTint,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
          }}
        >
          <Text selectable={false} style={{ ...typography.caption, color: colors.accentPrimary }}>
            {pill}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function Pill({
  icon: Icon,
  label,
  tone = 'default',
}: {
  icon: LucideIcon;
  label: string;
  tone?: 'default' | 'ok' | 'warn';
}) {
  const { colors, radii, spacing, typography } = useTheme();
  const color = tone === 'ok' ? colors.statusOk : tone === 'warn' ? colors.statusWarn : colors.textSecondary;
  const bg = tone === 'ok' ? colors.statusOkTint : tone === 'warn' ? colors.statusWarnTint : colors.bgMuted;

  return (
    <View
      style={{
        minHeight: 32,
        borderRadius: radii.pill,
        backgroundColor: bg,
        paddingHorizontal: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
      }}
    >
      <Icon size={14} color={color} strokeWidth={2.2} />
      <Text selectable={false} numberOfLines={1} style={{ ...typography.caption, color }}>
        {label}
      </Text>
    </View>
  );
}
