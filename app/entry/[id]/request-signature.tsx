import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronDown, ChevronUp, Mail, Send } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { getEntryVerificationReadiness } from '@/src/domain/logbook/entry-readiness';
import {
  useCreateRemoteSignatureRequest,
  useEntryDetail,
  useSupervisorContacts,
} from '@/src/domain/logbook/use-logbook';
import { AnimatedStamp, Chip, DocActionButton, DocBand, Field, Screen, SectionH } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

export default function RemoteSignatureRequestScreen() {
  const { spacing, typography, touchTarget, tidewater, hairlines } = useTheme();
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

  const footerTitle = canCreate
    ? 'CREATE REMOTE REQUEST'
    : hasVerifierName
      ? 'FINISH ENTRY FIRST'
      : 'ADD VERIFIER NAME';

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
      padded={false}
      footer={
        <DocActionButton
          title={footerTitle}
          icon={Send}
          onPress={submit}
          disabled={!canCreate}
          loading={createRequest.isPending}
        />
      }
    >
      <DocBand
        variant="top"
        formId="CH.6 - REMOTE REQUEST"
        rev={detail.data?.remote_request ? 'REQUEST EXISTS' : 'TOKEN LINK'}
        effective="HOSTED FALLBACK"
        rightLabel={canCreate ? 'READY' : 'HOLD'}
      />

      <View style={{ paddingHorizontal: spacing.base, gap: spacing.lg }}>
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
                REQUEST READINESS
              </Text>
              <Text style={{ ...typography.displayMd, color: tidewater.ink }} numberOfLines={2}>
                {entry?.site || 'Loading entry'}
              </Text>
            </View>
            <AnimatedStamp tone={readiness?.ready && !detail.data?.remote_request ? 'green' : 'yellow'} rotation="light">
              {readiness?.ready && !detail.data?.remote_request ? 'READY' : 'HOLD'}
            </AnimatedStamp>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, padding: spacing.md }}>
            <Chip tone="ink">{entry?.site || 'LOADING'}</Chip>
            <Chip tone="mute">{entry ? `${entry.work_hours.toFixed(1)} HR` : '0.0 HR'}</Chip>
            <Chip tone={readiness?.ready ? 'green' : 'yellow'}>
              {readiness?.ready ? 'ENTRY READY' : `${readiness?.missingFields.length ?? 0} MISSING`}
            </Chip>
            {detail.data?.remote_request ? <Chip tone="yellow">REQUEST PENDING</Chip> : null}
          </View>
          {entry?.status === 'draft' && readiness && !readiness.ready ? (
            <DocNotice title="Finish the entry first" body={`Add ${readiness.missingFields.join(', ')}`} />
          ) : null}
          {detail.data?.remote_request ? (
            <DocNotice
              title="Remote request already open"
              body="Use the existing request on the entry detail screen, or close it before creating another."
            />
          ) : null}
        </View>

        <View>
          <SectionH n="17" right={selectedKnownSupervisor ? 'KNOWN' : hasVerifierName ? 'NEW' : 'REQUIRED'}>
            Verifier
          </SectionH>
          <Text selectable style={{ ...typography.monoSm, color: tidewater.ink3, marginBottom: spacing.sm }}>
            Choose a saved supervisor or type the verifier who will receive the secure signing link.
          </Text>
          {supervisors.data?.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm }}>
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
                      borderWidth: 1.5,
                      borderColor: selected ? tidewater.accent : tidewater.hair,
                      backgroundColor: selected ? tidewater.accentSoft : tidewater.white,
                      opacity: pressed ? 0.82 : 1,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 6,
                    })}
                  >
                    <Text
                      selectable={false}
                      style={{
                        ...typography.monoSm,
                        color: selected ? tidewater.accent : tidewater.ink2,
                        fontFamily: 'IBMPlexMono_600SemiBold',
                        fontWeight: '600',
                      }}
                    >
                      {supervisor.name.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          <View style={{ gap: spacing.md }}>
            <Field
              label="Verifier name"
              value={recipientName}
              onChangeText={setRecipientName}
              placeholder="Jordan Lee"
              invalid={!hasVerifierName}
              style={{ borderRadius: 0, borderWidth: 1.5 }}
            />
            <Field
              label="Verifier contact"
              value={recipientContact}
              onChangeText={setRecipientContact}
              placeholder="Optional email or phone"
              hint="Optional. Add it if you want it saved for next time."
              keyboardType="email-address"
              autoCapitalize="none"
              style={{ borderRadius: 0, borderWidth: 1.5 }}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => setDetailsOpen((value) => !value)}
              style={({ pressed }) => ({
                minHeight: 48,
                borderWidth: 1.5,
                borderColor: tidewater.hair,
                backgroundColor: verifierRole || verifierCompany ? tidewater.greenSoft : tidewater.white,
                opacity: pressed ? 0.82 : 1,
                paddingHorizontal: spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: spacing.sm,
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
                <Mail size={18} color={verifierRole || verifierCompany ? tidewater.green : tidewater.ink2} strokeWidth={2.2} />
                <Text selectable={false} style={{ ...typography.displaySm, color: tidewater.ink, letterSpacing: 1.2 }}>
                  VERIFIER DETAILS
                </Text>
              </View>
              {detailsOpen ? (
                <ChevronUp size={18} color={tidewater.ink2} strokeWidth={2.2} />
              ) : (
                <ChevronDown size={18} color={tidewater.ink2} strokeWidth={2.2} />
              )}
            </Pressable>
            {detailsOpen ? (
              <>
                <Field
                  label="Verifier role"
                  value={verifierRole}
                  onChangeText={setVerifierRole}
                  placeholder="IRATA L3 / Rope Access Manager"
                  style={{ borderRadius: 0, borderWidth: 1.5 }}
                />
                <Field
                  label="Company"
                  value={verifierCompany}
                  onChangeText={setVerifierCompany}
                  placeholder="Optional"
                  style={{ borderRadius: 0, borderWidth: 1.5 }}
                />
              </>
            ) : null}
          </View>
        </View>

        {entry?.status && entry.status !== 'draft' ? (
          <Text selectable style={{ ...typography.body, color: tidewater.ink2 }}>
            Remote requests can only be created for draft entries.
          </Text>
        ) : null}
      </View>

      <DocBand
        variant="footer"
        text={canCreate ? 'REMOTE LINK WILL BE TOKEN-GATED AND ONE-TIME COMPLETABLE' : 'REMOTE REQUEST HOLD - COMPLETE REQUIRED FIELDS'}
        page={entryId ? `ENTRY ${entryId.slice(-6).toUpperCase()}` : 'ENTRY ------'}
      />
    </Screen>
  );
}

function DocNotice({ title, body }: { title: string; body: string }) {
  const { spacing, typography, tidewater } = useTheme();

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: tidewater.hairFaint,
        backgroundColor: tidewater.yellowSoft,
        padding: spacing.md,
      }}
    >
      <Text selectable style={{ ...typography.displaySm, color: tidewater.ink, letterSpacing: 1.2 }}>
        {title.toUpperCase()}
      </Text>
      <Text selectable style={{ ...typography.monoSm, color: tidewater.ink2, marginTop: 4 }}>
        {body}
      </Text>
    </View>
  );
}

