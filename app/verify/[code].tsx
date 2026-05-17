import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { BadgeCheck, CalendarClock, ShieldOff } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  completeHostedRemoteSignatureRequest,
  fetchHostedRemoteSigningRequest,
} from '@/src/cloud/supabase/remote-signing';
import {
  certLevelToDigit,
  formatIrataNumber,
  irataNumberDigits,
  normalizeSpratNumber,
} from '@/src/domain/cert-number';
import { formatDateOrDash, formatDateRange } from '@/src/domain/date-format';
import {
  describeClosedRemoteRequest,
  RemoteRequestClosedReason,
} from '@/src/domain/logbook/remote-signing-status';
import { EntryDetail } from '@/src/domain/logbook/types';
import {
  useCompleteRemoteSignatureRequest,
  useRemoteSignatureRequestDetail,
} from '@/src/domain/logbook/use-logbook';
import type { CertLevel, CertScheme } from '@/src/domain/profile/types';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import {
  Button,
  Card,
  ChipSelect,
  Field,
  IconBtn,
  Pill,
  SectionH,
  SigFill,
  SigPad,
  TopBar,
  type SigPadHandle,
} from '@/src/ui/primitives/v2';
import { IconArrowLeft, IconCheck, IconVerified } from '@/src/ui/icons';
import { haptics } from '@/src/ui/haptics';

const ATTESTATION_TEXT =
  'I am the requested verifier, I reviewed this remote request and work record, and I authorize this signature.';

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

function truncateHash(value: string): string {
  return `${value.slice(0, 16)}…${value.slice(-12)}`;
}

const SCHEME_OPTIONS: Array<{ value: CertScheme; label: string }> = [
  { value: 'sprat', label: 'SPRAT' },
  { value: 'irata', label: 'IRATA' },
];

const LEVEL_OPTIONS: Array<{ value: CertLevel; label: string }> = [
  { value: 'I', label: 'Level I' },
  { value: 'II', label: 'Level II' },
  { value: 'III', label: 'Level III' },
];

export default function RemoteVerifyScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { code, token } = useLocalSearchParams<{
    code?: string | string[];
    token?: string | string[];
  }>();
  const requestCode = firstParam(code);
  const queryToken = firstParam(token);
  const [signingToken, setSigningToken] = React.useState<string | null>(queryToken);
  const requestDetail = useRemoteSignatureRequestDetail(requestCode, signingToken);
  const hostedRequestDetail = useQuery({
    enabled: Boolean(requestCode && signingToken && !requestDetail.isLoading && !requestDetail.data),
    queryKey: ['hostedRemoteSignatureRequest', requestCode, signingToken],
    queryFn: () => {
      if (!requestCode || !signingToken) throw new Error('remote_request_code_required');
      return fetchHostedRemoteSigningRequest(requestCode, signingToken);
    },
  });
  const completeRequest = useCompleteRemoteSignatureRequest();

  const [supervisorName, setSupervisorName] = React.useState('');
  const [supervisorScheme, setSupervisorScheme] = React.useState<CertScheme>('sprat');
  const [supervisorCertNumber, setSupervisorCertNumber] = React.useState('');
  const [supervisorIrataLevel, setSupervisorIrataLevel] = React.useState<CertLevel>('II');
  const [signaturePath, setSignaturePath] = React.useState('');
  const [signatureActive, setSignatureActive] = React.useState(false);
  const [attestationAccepted, setAttestationAccepted] = React.useState(false);
  const [completedDetail, setCompletedDetail] = React.useState<EntryDetail | null>(null);
  const [completedFromHosted, setCompletedFromHosted] = React.useState(false);
  const [hostedCompletePending, setHostedCompletePending] = React.useState(false);
  const [hostedCompleteFailed, setHostedCompleteFailed] = React.useState(false);
  const previousRequestCodeRef = React.useRef<string | null>(requestCode);
  const sigRef = React.useRef<SigPadHandle | null>(null);

  const detail = requestDetail.data ?? hostedRequestDetail.data ?? null;
  const isHostedRequest = !requestDetail.data && Boolean(hostedRequestDetail.data);
  const entry = detail?.entry;
  const request = detail?.request;
  const requiresCertNumber = supervisorScheme === 'irata';

  React.useEffect(() => {
    const requestChanged = previousRequestCodeRef.current !== requestCode;
    if (requestChanged) {
      previousRequestCodeRef.current = requestCode;
      setSigningToken(queryToken);
      setSupervisorName('');
      setSupervisorScheme('sprat');
      setSupervisorCertNumber('');
      setSupervisorIrataLevel('II');
      setSignaturePath('');
      setSignatureActive(false);
      setAttestationAccepted(false);
      setCompletedDetail(null);
      setCompletedFromHosted(false);
      setHostedCompleteFailed(false);
      return;
    }
    if (queryToken) setSigningToken(queryToken);
  }, [queryToken, requestCode]);

  React.useEffect(() => {
    if (Platform.OS === 'web' && detail && requestCode && queryToken) {
      router.replace(`/verify/${requestCode}`);
    }
  }, [detail, queryToken, requestCode]);

  React.useEffect(() => {
    if (request?.recipient_name && !supervisorName) {
      setSupervisorName(request.recipient_name);
    }
  }, [request?.recipient_name, supervisorName]);

  const certReady =
    !requiresCertNumber || irataNumberDigits(supervisorCertNumber).length === 5;
  const hasSignature = signaturePath.trim().length > 0;
  const hasName = supervisorName.trim().length > 1;
  const canSign =
    Boolean(requestCode) &&
    Boolean(signingToken) &&
    request?.status === 'pending' &&
    entry?.status === 'draft' &&
    hasName &&
    certReady &&
    hasSignature &&
    attestationAccepted;

  async function submit() {
    if (!canSign || !requestCode || !detail) return;

    const input = {
      request_code: requestCode,
      signing_token: signingToken,
      supervisor_name: supervisorName,
      supervisor_scheme: supervisorScheme,
      supervisor_cert_number: requiresCertNumber
        ? formatIrataNumber(supervisorIrataLevel, supervisorCertNumber)
        : normalizeSpratNumber(supervisorCertNumber),
      signature_path: signaturePath,
      attestation_accepted: attestationAccepted,
      signer_attestation: ATTESTATION_TEXT,
    };

    if (isHostedRequest) {
      setHostedCompletePending(true);
      setHostedCompleteFailed(false);
      try {
        setCompletedDetail(await completeHostedRemoteSignatureRequest(detail, input));
        setCompletedFromHosted(true);
        haptics.success();
      } catch {
        setHostedCompleteFailed(true);
        haptics.error();
      } finally {
        setHostedCompletePending(false);
      }
      return;
    }

    completeRequest.mutate(input, {
      onSuccess: (signed) => {
        setCompletedFromHosted(false);
        setCompletedDetail(signed);
        haptics.success();
      },
      onError: () => haptics.error(),
    });
  }

  // Completed state ------------------------------------------------
  if (completedDetail) {
    const signed = completedDetail.signature;
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg }}>
        <Stack.Screen options={{ headerShown: false }} />
        <TopBar title="Submitted" />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 + insets.bottom, gap: 14 }}
        >
          <Card padding={18}>
            <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>
              REMOTE SIGNATURE COMPLETE
            </Text>
            <Text
              style={{
                fontFamily: 'Manrope_800ExtraBold',
                fontWeight: '800',
                fontSize: 26,
                letterSpacing: -0.7,
                lineHeight: 30,
                color: tokens.text,
                marginTop: 4,
              }}
              numberOfLines={2}
            >
              {completedDetail.entry.site}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              <Pill tone="ok" icon={IconVerified}>Signed</Pill>
              <Pill tone="chip">{signed?.method ?? 'remote'}</Pill>
            </View>
            {signed?.supervisor_name ? (
              <View style={{ marginTop: 14 }}>
                <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 8 }}>
                  SIGNER
                </Text>
                <SigFill name={signed.supervisor_name} height={56} />
              </View>
            ) : null}
            <View style={{ marginTop: 14, gap: 6 }}>
              <Row label="Signed" value={formatDateOrDash(signed?.signed_at)} />
              {signed?.chain_hash ? (
                <Row label="Chain hash" value={truncateHash(signed.chain_hash)} mono />
              ) : null}
            </View>
          </Card>
          {!completedFromHosted ? (
            <Button
              variant="secondary"
              full
              onPress={() => router.replace(`/entry/${completedDetail.entry.id}`)}
            >
              Return to logbook
            </Button>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  // No token -------------------------------------------------------
  if (!signingToken) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg }}>
        <Stack.Screen options={{ headerShown: false }} />
        <TopBar title="Verifier portal" />
        <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
          <Card padding={18}>
            <Text style={{ ...type.cardTitle, color: tokens.text }}>Secure link required</Text>
            <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 4 }}>
              Open the full verifier link from the request message. The request code alone cannot authorize a remote signature.
            </Text>
          </Card>
        </View>
      </View>
    );
  }

  // Loading --------------------------------------------------------
  if (requestDetail.isLoading || hostedRequestDetail.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg }}>
        <Stack.Screen options={{ headerShown: false }} />
        <TopBar title="Verifier portal" />
        <View style={{ padding: 20 }}>
          <Text style={{ ...type.body, color: tokens.textDim }}>Loading request…</Text>
        </View>
      </View>
    );
  }

  // Not found ------------------------------------------------------
  if (!detail || !entry || !request) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg }}>
        <Stack.Screen options={{ headerShown: false }} />
        <TopBar title="Verifier portal" />
        <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
          <Card padding={18}>
            <Text style={{ ...type.cardTitle, color: tokens.text }}>Request not found</Text>
            <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 4 }}>
              Check the request code and try again.
            </Text>
          </Card>
        </View>
      </View>
    );
  }

  const dateLabel = formatDateRange(entry.date_from, entry.date_to);
  const isActionable = request.status === 'pending' && entry.status === 'draft';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: tokens.bg }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <TopBar
        title="Verifier portal"
        leading={
          <IconBtn
            icon={IconArrowLeft}
            label="Close"
            size="sm"
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/');
            }}
          />
        }
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        scrollEnabled={!signatureActive}
        keyboardShouldPersistTaps="handled"
      >
        {!isActionable ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
            <ClosedStateCard reason={describeClosedRemoteRequest(request, entry, detail.signature)} />
          </View>
        ) : null}

        <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
          <Card padding={18}>
            <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>
              REMOTE SIGNATURE REQUEST
            </Text>
            <Text
              style={{
                fontFamily: 'Manrope_800ExtraBold',
                fontWeight: '800',
                fontSize: 26,
                letterSpacing: -0.7,
                lineHeight: 30,
                color: tokens.text,
                marginTop: 4,
              }}
              numberOfLines={2}
            >
              {entry.site}
            </Text>
            <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 4 }} numberOfLines={2}>
              {[entry.employer, entry.client].filter(Boolean).join(' · ') || 'No employer / client on file'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
              <Pill tone="chip">{dateLabel}</Pill>
              <Pill tone="chip">{`${entry.work_hours.toFixed(1)} hr`}</Pill>
              <Pill tone={isActionable ? 'warn' : 'chip'}>{request.status}</Pill>
              <Pill tone="chip">{`code ${request.request_code}`}</Pill>
            </View>
          </Card>
        </View>

        <SectionH kicker="REQUEST" title={`Expires ${formatDateOrDash(request.expires_at)}`} />
        <View style={{ paddingHorizontal: 20 }}>
          <Card padding={14}>
            <Row label="Requested" value={request.recipient_name} />
            <Row label="Contact" value={request.recipient_contact ?? '—'} />
            <Row label="Role" value={request.verifier_role ?? '—'} />
            <Row label="Company" value={request.verifier_company ?? '—'} />
            <Row label="Link check" value={request.token_hint ?? '—'} mono last />
          </Card>
        </View>

        <SectionH kicker="WORK RECORD" title={dateLabel} />
        <View style={{ paddingHorizontal: 20 }}>
          <Card padding={14}>
            <Row label="Hours" value={entry.work_hours.toFixed(1)} />
            <Row label="Task" value={entry.work_task || '—'} />
            <Row label="Access" value={entry.access_method || '—'} />
            <Row label="Structure" value={entry.structure_type || '—'} />
            <Row
              label="Height"
              value={
                !entry.max_height || entry.max_height <= 0
                  ? '—'
                  : `${entry.max_height.toFixed(0)} ${entry.height_unit}`
              }
              last={!entry.description}
            />
            {entry.description ? (
              <View
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: tokens.lineSoft,
                }}
              >
                <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 4 }}>
                  NOTES
                </Text>
                <Text selectable style={{ ...type.body, color: tokens.text }}>
                  {entry.description}
                </Text>
              </View>
            ) : null}
          </Card>
        </View>

        <SectionH kicker="RECORD CHANGE CHECK" title="Tamper proof" />
        <View style={{ paddingHorizontal: 20 }}>
          <Card padding={14}>
            <Text style={{ ...type.cardSub, color: tokens.textDim, marginBottom: 8 }}>
              This hash proves the record has not changed since the request was sent.
            </Text>
            <Row label="Entry hash" value={truncateHash(request.entry_hash)} mono last />
          </Card>
        </View>

        {isActionable ? (
          <>
            <SectionH kicker="AUTHORIZATION" title="Sign as verifier" />
            <View style={{ paddingHorizontal: 20, gap: 12 }}>
              <Field
                label="Verifier name"
                value={supervisorName}
                onChangeText={setSupervisorName}
                placeholder="Jordan Lee"
                autoCapitalize="words"
              />
              <View>
                <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 6 }}>
                  YOUR SCHEME
                </Text>
                <ChipSelect<CertScheme>
                  value={supervisorScheme}
                  options={SCHEME_OPTIONS}
                  onChange={(next) => {
                    setSupervisorScheme(next);
                    setSupervisorCertNumber(
                      next === 'irata'
                        ? formatIrataNumber(supervisorIrataLevel, supervisorCertNumber)
                        : normalizeSpratNumber(supervisorCertNumber),
                    );
                  }}
                />
              </View>
              <Field
                label={requiresCertNumber ? 'IRATA number' : 'SPRAT number'}
                value={
                  requiresCertNumber
                    ? irataNumberDigits(supervisorCertNumber)
                    : normalizeSpratNumber(supervisorCertNumber)
                }
                onChangeText={(value) => {
                  setSupervisorCertNumber(
                    requiresCertNumber
                      ? formatIrataNumber(supervisorIrataLevel, value)
                      : normalizeSpratNumber(value),
                  );
                }}
                placeholder={requiresCertNumber ? '12345' : 'Optional'}
                keyboardType="number-pad"
                maxLength={requiresCertNumber ? 5 : 12}
                helper={
                  requiresCertNumber
                    ? `Required for IRATA. Saved as ${certLevelToDigit(supervisorIrataLevel)}/12345.`
                    : 'Optional for SPRAT.'
                }
              />
              {requiresCertNumber ? (
                <View>
                  <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 6 }}>
                    YOUR LEVEL
                  </Text>
                  <ChipSelect<CertLevel>
                    value={supervisorIrataLevel}
                    options={LEVEL_OPTIONS}
                    onChange={(level) => {
                      setSupervisorIrataLevel(level);
                      setSupervisorCertNumber(formatIrataNumber(level, supervisorCertNumber));
                    }}
                  />
                </View>
              ) : null}
              <View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}
                >
                  <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>
                    SIGNATURE
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => sigRef.current?.clear()}
                    hitSlop={10}
                  >
                    <Text
                      style={{
                        fontFamily: 'Manrope_600SemiBold',
                        fontWeight: '600',
                        fontSize: 12,
                        color: tokens.textDim,
                      }}
                    >
                      Clear
                    </Text>
                  </Pressable>
                </View>
                <SigPad
                  ref={sigRef}
                  value={signaturePath}
                  onChange={setSignaturePath}
                  onStrokeStart={() => setSignatureActive(true)}
                  onStrokeEnd={() => setSignatureActive(false)}
                />
              </View>
              <AttestationRow
                accepted={attestationAccepted}
                onToggle={() => setAttestationAccepted((v) => !v)}
              />
            </View>
          </>
        ) : null}

        {completeRequest.isError || hostedCompleteFailed ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
            <Text style={{ ...type.cardSub, color: tokens.danger }}>
              Remote signing failed. Refresh the request and try again.
            </Text>
          </View>
        ) : null}
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
        {isActionable ? (
          <Button
            variant="primary"
            size="lg"
            full
            onPress={submit}
            disabled={!canSign || completeRequest.isPending || hostedCompletePending}
          >
            {completeRequest.isPending || hostedCompletePending
              ? 'Submitting…'
              : canSign
                ? 'Submit remote signature'
                : 'Finish verification'}
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="lg"
            full
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/');
            }}
          >
            Close
          </Button>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function Row({
  label,
  value,
  mono = false,
  last = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  last?: boolean;
}) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 8,
        gap: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: tokens.lineSoft,
      }}
    >
      <Text style={{ ...type.monoKicker, color: tokens.textFaint, width: 92 }}>
        {label.toUpperCase()}
      </Text>
      <Text
        selectable
        style={[
          mono ? type.mono : type.body,
          { color: tokens.text, flex: 1 },
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

function AttestationRow({ accepted, onToggle }: { accepted: boolean; onToggle: () => void }) {
  const { tokens } = useTheme();
  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: accepted ? tokens.ok : tokens.lineSoft,
    backgroundColor: accepted ? tokens.okSoft : tokens.surface,
    alignItems: 'flex-start',
  };
  const boxStyle: ViewStyle = {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: accepted ? tokens.ok : tokens.line,
    backgroundColor: accepted ? tokens.ok : 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  };
  const textStyle: TextStyle = { ...type.cardSub, color: tokens.text, flex: 1 };
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: accepted }}
      onPress={onToggle}
      style={({ pressed }) => [rowStyle, pressed ? { opacity: 0.92 } : null]}
    >
      <View style={boxStyle}>
        {accepted ? (
          <IconCheck size={14} color={tokens.bg} fill={tokens.bg} />
        ) : null}
      </View>
      <Text style={textStyle}>{ATTESTATION_TEXT}</Text>
    </Pressable>
  );
}

type ClosedTone = 'ok' | 'warn' | 'danger' | 'chip';

function closedCardCopy(reason: RemoteRequestClosedReason | null): {
  title: string;
  detail: string;
  icon: LucideIcon;
  tone: ClosedTone;
  signedAt?: string | null;
  signer?: string | null;
  expiresAt?: string | null;
} {
  if (!reason) {
    return {
      title: 'Request closed',
      detail: 'This request is no longer pending.',
      icon: ShieldOff,
      tone: 'chip',
    };
  }
  if (reason.kind === 'completed') {
    return {
      title: 'Signature already submitted',
      detail: 'This request has been signed. No further action is needed.',
      icon: BadgeCheck,
      tone: 'ok',
      signedAt: reason.signed_at,
      signer: reason.signer_name,
    };
  }
  if (reason.kind === 'expired') {
    return {
      title: 'Request expired',
      detail: 'Ask the technician to send a new request.',
      icon: CalendarClock,
      tone: 'warn',
      expiresAt: reason.expires_at,
    };
  }
  if (reason.kind === 'cancelled') {
    return {
      title: 'Request cancelled',
      detail: 'The technician cancelled this remote signing request.',
      icon: ShieldOff,
      tone: 'danger',
    };
  }
  return {
    title: 'Entry already closed',
    detail: 'The technician completed this record without a remote signature.',
    icon: BadgeCheck,
    tone: 'chip',
  };
}

function ClosedStateCard({ reason }: { reason: RemoteRequestClosedReason | null }) {
  const { tokens } = useTheme();
  const copy = closedCardCopy(reason);
  const tones = {
    ok: { fg: tokens.ok, bg: tokens.okSoft },
    warn: { fg: tokens.warn, bg: tokens.warnSoft },
    danger: { fg: tokens.danger, bg: tokens.dangerSoft },
    chip: { fg: tokens.textDim, bg: tokens.surface },
  } as const;
  const tone = tones[copy.tone];
  const Icon = copy.icon;
  return (
    <View
      style={{
        backgroundColor: tone.bg,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: tone.fg,
        padding: 14,
        gap: 6,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Icon size={20} color={tone.fg} strokeWidth={2.2} />
        <Text style={{ ...type.cardTitle, color: tokens.text, flex: 1 }}>{copy.title}</Text>
      </View>
      <Text style={{ ...type.cardSub, color: tokens.textDim }}>{copy.detail}</Text>
      {copy.signer ? (
        <Text style={{ ...type.monoSm, color: tokens.textFaint, marginTop: 4 }}>
          SIGNER · {copy.signer}
        </Text>
      ) : null}
      {copy.signedAt ? (
        <Text style={{ ...type.monoSm, color: tokens.textFaint }}>
          SIGNED · {formatDateOrDash(copy.signedAt)}
        </Text>
      ) : null}
      {copy.expiresAt ? (
        <Text style={{ ...type.monoSm, color: tokens.textFaint }}>
          EXPIRED · {formatDateOrDash(copy.expiresAt)}
        </Text>
      ) : null}
    </View>
  );
}
