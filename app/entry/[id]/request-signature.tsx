import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type TextStyle,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getEntryVerificationReadiness } from '@/src/domain/logbook/entry-readiness';
import {
  useCreateRemoteSignatureRequest,
  useEntryDetail,
  useSupervisorContacts,
} from '@/src/domain/logbook/use-logbook';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import {
  Button,
  Card,
  Field,
  IconBtn,
  Pill,
  SectionH,
  TopBar,
} from '@/src/ui/primitives/v2';
import { IconArrowLeft, IconWarn } from '@/src/ui/icons';
import { haptics } from '@/src/ui/haptics';

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

export default function RemoteSignatureRequestScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
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
    (s) => s.name === recipientName && (s.contact ?? '') === recipientContact,
  );
  const hasVerifierName = recipientName.trim().length > 1;

  const canCreate =
    Boolean(entryId) &&
    entry?.status === 'draft' &&
    readiness?.ready === true &&
    !detail.data?.remote_request &&
    hasVerifierName;

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
      {
        onSuccess: (updated) => {
          haptics.success();
          router.replace(`/entry/${updated.entry.id}`);
        },
        onError: () => haptics.error(),
      },
    );
  }

  const heroKickerStyle: TextStyle = { ...type.monoKicker, color: tokens.textFaint };
  const heroTitleStyle: TextStyle = {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 26,
    letterSpacing: -0.7,
    lineHeight: 30,
    color: tokens.text,
    marginTop: 4,
  };

  const blockingMessage = entry
    ? entry.status !== 'draft'
      ? 'Remote requests can only be created for draft entries.'
      : detail.data?.remote_request
        ? 'A remote request is already open. Use the entry detail screen, or close it before creating another.'
        : readiness && !readiness.ready
          ? `Finish the entry first: add ${readiness.missingFields.join(', ')}.`
          : null
    : null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: tokens.bg }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <TopBar
        title="Remote request"
        leading={
          <IconBtn icon={IconArrowLeft} label="Back" size="sm" onPress={() => router.back()} />
        }
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
          <Card padding={18}>
            <Text style={heroKickerStyle}>REQUEST READINESS</Text>
            <Text style={heroTitleStyle} numberOfLines={2}>
              {entry?.site || 'Loading entry'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
              <Pill tone="chip">{entry ? `${entry.work_hours.toFixed(1)} hr` : '— hr'}</Pill>
              <Pill tone={readiness?.ready ? 'ok' : 'warn'}>
                {readiness?.ready ? 'Entry ready' : `${readiness?.missingFields.length ?? 0} missing`}
              </Pill>
              {detail.data?.remote_request ? <Pill tone="warn">Request pending</Pill> : null}
            </View>
            {blockingMessage ? (
              <View
                style={{
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: tokens.warnSoft,
                  flexDirection: 'row',
                  gap: 10,
                  alignItems: 'flex-start',
                }}
              >
                <IconWarn size={18} color={tokens.warn} fill={tokens.warn} />
                <Text style={{ ...type.cardSub, color: tokens.text, flex: 1 }}>
                  {blockingMessage}
                </Text>
              </View>
            ) : null}
          </Card>
        </View>

        <SectionH kicker="01 VERIFIER" title="Who's signing?" />
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          {supervisors.data?.length ? (
            <View>
              <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 6 }}>
                SAVED CONTACTS
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
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
                      style={{
                        paddingVertical: 7,
                        paddingHorizontal: 12,
                        borderRadius: 999,
                        backgroundColor: selected ? tokens.accent : tokens.surface,
                        borderWidth: 1,
                        borderColor: selected ? tokens.accent : tokens.lineSoft,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'Manrope_600SemiBold',
                          fontWeight: '600',
                          fontSize: 12,
                          color: selected ? tokens.accentInk : tokens.text,
                        }}
                      >
                        {supervisor.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
          <Field
            label="Verifier name"
            value={recipientName}
            onChangeText={setRecipientName}
            placeholder="Jordan Lee"
            autoCapitalize="words"
          />
          <Field
            label="Contact"
            value={recipientContact}
            onChangeText={setRecipientContact}
            placeholder="Optional email or phone"
            keyboardType="email-address"
            autoCapitalize="none"
            helper="Optional. Saved for future requests."
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => setDetailsOpen((v) => !v)}
            style={({ pressed }) => ({
              backgroundColor: tokens.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: tokens.lineSoft,
              paddingVertical: 12,
              paddingHorizontal: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ ...type.cardTitle, color: tokens.text }}>
              {detailsOpen ? 'Hide role + company' : 'Add role + company'}
            </Text>
            <Text style={{ ...type.monoSm, color: tokens.textDim }}>
              {detailsOpen ? '−' : '+'}
            </Text>
          </Pressable>
          {detailsOpen ? (
            <>
              <Field
                label="Role"
                value={verifierRole}
                onChangeText={setVerifierRole}
                placeholder="IRATA L3 / Rope access manager"
              />
              <Field
                label="Company"
                value={verifierCompany}
                onChangeText={setVerifierCompany}
                placeholder="Optional"
              />
            </>
          ) : null}
        </View>
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          backgroundColor: tokens.bg,
          borderTopWidth: 1,
          borderTopColor: tokens.lineSoft,
        }}
      >
        <Button
          variant="primary"
          size="lg"
          full
          onPress={submit}
          disabled={!canCreate || createRequest.isPending}
        >
          {createRequest.isPending
            ? 'Creating request…'
            : canCreate
              ? 'Create remote request'
              : hasVerifierName
                ? 'Finish entry first'
                : 'Add verifier name'}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}
