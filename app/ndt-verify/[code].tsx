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
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDateOrDash, formatDateRange } from '@/src/domain/date-format';
import {
  useCompleteNdtRemoteRequest,
  useNdtRemoteRequestDetail,
} from '@/src/domain/ndt/use-ndt';
import type {
  NdtInspection,
  NdtInspectionDetail,
  NdtMethod,
  NdtVerifierLevel,
} from '@/src/domain/ndt/types';
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

// NDT verifier attestation — DISTINCT from the rope-access wording. The "(or
// authorised verifier)" clause already folds the delegate case into a single
// string, so unlike the rope-access screen there is no verifier-vs-delegate
// branch on the attestation text. The "Different signer" pill is still shown
// visually when the signer's name differs from who the request was sent to, so
// the auditor can compare the two recorded names, but the attestation itself is
// one verbatim sentence.
const ATTESTATION_NDT =
  'I am the responsible NDT Level III (or authorised verifier) and I confirm the logged method-hours were performed under the applicable procedure.';

// Method label map — mirrors app/ndt/[id].tsx METHOD_LABEL.
const METHOD_LABEL: Record<NdtMethod, string> = {
  UT: 'Ultrasonic',
  MT: 'Magnetic Particle',
  PT: 'Penetrant',
  RT: 'Radiographic',
  ET: 'Eddy Current',
  VT: 'Visual',
  LT: 'Leak',
  AE: 'Acoustic Emission',
  IRT: 'Infrared',
  NR: 'Neutron Radiography',
  GW: 'Guided Wave',
};

function methodLabel(method: NdtMethod): string {
  return `${method} · ${METHOD_LABEL[method] ?? method}`;
}

function supervisionLabel(value: NdtInspection['supervised']): string {
  return value === 'independent' ? 'Independent' : 'Supervised';
}

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

function truncateHash(value: string): string {
  return `${value.slice(0, 16)}…${value.slice(-12)}`;
}

const LEVEL_OPTIONS: Array<{ value: NdtVerifierLevel; label: string }> = [
  { value: 'II', label: 'Level II' },
  { value: 'III', label: 'Level III' },
];

export default function NdtRemoteVerifyScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { code, token } = useLocalSearchParams<{
    code?: string | string[];
    token?: string | string[];
  }>();
  const requestCode = firstParam(code);
  const queryToken = firstParam(token);
  const [signingToken, setSigningToken] = React.useState<string | null>(queryToken);
  // Local-deep-link path only. The NDT hosted (Supabase) fetch branch is
  // deferred to Phase 2, so — unlike app/verify/[code].tsx — there is no
  // hosted request query / hosted completion branch here.
  const requestDetail = useNdtRemoteRequestDetail(requestCode, signingToken);
  const completeRequest = useCompleteNdtRemoteRequest();

  const [verifierName, setVerifierName] = React.useState('');
  const [verifierCertNumber, setVerifierCertNumber] = React.useState('');
  const [verifierLevel, setVerifierLevel] = React.useState<NdtVerifierLevel>('III');
  const [verifierScheme, setVerifierScheme] = React.useState('');
  const [verifierEmployer, setVerifierEmployer] = React.useState('');
  const [signaturePath, setSignaturePath] = React.useState('');
  const [signatureActive, setSignatureActive] = React.useState(false);
  const [attestationAccepted, setAttestationAccepted] = React.useState(false);
  const [completedDetail, setCompletedDetail] = React.useState<NdtInspectionDetail | null>(null);
  const previousRequestCodeRef = React.useRef<string | null>(requestCode);
  const sigRef = React.useRef<SigPadHandle | null>(null);

  const detail = requestDetail.data ?? null;
  const inspection = detail?.inspection;
  const request = detail?.request;

  // Deep-link entry means this portal is often the first screen on the stack,
  // so router.back() may have nowhere to go — fall back to the root.
  const goClose = React.useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, []);

  // The signer differs from who the request was sent to → flag visually so the
  // auditor can compare the two recorded names. The attestation text does NOT
  // branch (see ATTESTATION_NDT).
  const isDifferentSigner =
    verifierName.trim().length > 0 &&
    !!request?.recipient_name &&
    verifierName.trim().toLowerCase() !== request.recipient_name.trim().toLowerCase();

  React.useEffect(() => {
    const requestChanged = previousRequestCodeRef.current !== requestCode;
    if (requestChanged) {
      previousRequestCodeRef.current = requestCode;
      setSigningToken(queryToken);
      setVerifierName('');
      setVerifierCertNumber('');
      setVerifierLevel('III');
      setVerifierScheme('');
      setVerifierEmployer('');
      setSignaturePath('');
      setSignatureActive(false);
      setAttestationAccepted(false);
      setCompletedDetail(null);
      return;
    }
    if (queryToken) setSigningToken(queryToken);
  }, [queryToken, requestCode]);

  React.useEffect(() => {
    if (request?.recipient_name && !verifierName) {
      setVerifierName(request.recipient_name);
    }
  }, [request?.recipient_name, verifierName]);

  // Cert number is ALWAYS required for NDT — a Level III without a cert number
  // is meaningless. Plain free text (≥2); no SPRAT/IRATA formatting.
  const hasName = verifierName.trim().length > 1;
  const hasCert = verifierCertNumber.trim().length >= 2;
  const hasSignature = signaturePath.trim().length > 0;
  // The inspection sits in 'pending' (in-flight to the verifier) while a request
  // is live — NOT 'draft'. completeRemoteRequest throws unless it is 'pending'.
  const canSign =
    Boolean(requestCode) &&
    Boolean(signingToken) &&
    request?.status === 'pending' &&
    inspection?.status === 'pending' &&
    hasName &&
    hasCert &&
    hasSignature &&
    attestationAccepted;

  function submit() {
    if (!canSign || !requestCode) return;
    completeRequest.mutate(
      {
        request_code: requestCode,
        signing_token: signingToken,
        verifier_name: verifierName.trim(),
        verifier_cert_number: verifierCertNumber.trim(),
        verifier_level: verifierLevel,
        verifier_scheme: verifierScheme.trim() || null,
        verifier_employer: verifierEmployer.trim() || null,
        signature_path: signaturePath,
        attestation_accepted: true,
        signer_attestation: ATTESTATION_NDT,
      },
      {
        onSuccess: (signed) => {
          setCompletedDetail(signed);
          haptics.success();
        },
        onError: () => haptics.error(),
      },
    );
  }

  // Completed state ------------------------------------------------
  if (completedDetail) {
    const signed = completedDetail.signature;
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg }}>
        <Stack.Screen options={{ headerShown: false }} />
        <TopBar
          title="Submitted"
          leading={<IconBtn icon={IconArrowLeft} label="Close" size="md" onPress={goClose} />}
        />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 + insets.bottom, gap: 14 }}
        >
          <Card padding={18}>
            <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>
              NDT VERIFICATION COMPLETE
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
              {completedDetail.inspection.site}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              <Pill tone="ok" icon={IconVerified}>Verified</Pill>
              <Pill tone="chip">{methodLabel(completedDetail.inspection.method)}</Pill>
            </View>
            {signed?.verifier_name ? (
              <View style={{ marginTop: 14 }}>
                <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 8 }}>
                  VERIFIER
                </Text>
                <SigFill name={signed.verifier_name} height={56} />
              </View>
            ) : null}
            <View style={{ marginTop: 14, gap: 6 }}>
              <Row label="Verified" value={formatDateOrDash(signed?.signed_at)} />
              {signed?.chain_hash ? (
                <Row label="Chain hash" value={truncateHash(signed.chain_hash)} mono last />
              ) : null}
            </View>
          </Card>
          {/* The remote verifier has no local NDT log to return to — give them
              an explicit way to leave the page after submitting. */}
          <Button variant="secondary" full onPress={goClose}>
            Done
          </Button>
        </ScrollView>
      </View>
    );
  }

  // No token -------------------------------------------------------
  if (!signingToken) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg }}>
        <Stack.Screen options={{ headerShown: false }} />
        <TopBar
          title="NDT verifier portal"
          leading={<IconBtn icon={IconArrowLeft} label="Close" size="md" onPress={goClose} />}
        />
        <View style={{ paddingHorizontal: 20, paddingTop: 4, gap: 12 }}>
          <Card padding={18}>
            <Text style={{ ...type.cardTitle, color: tokens.text }}>Secure link required</Text>
            <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 4 }}>
              Open the full verifier link from the request message. The request code alone cannot authorize a verification.
            </Text>
          </Card>
          {requestCode ? (
            <Card padding={14}>
              <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>REQUEST CODE</Text>
              <Text
                selectable
                style={{
                  fontFamily: 'JetBrainsMono_600SemiBold',
                  fontWeight: '600',
                  fontSize: 24,
                  letterSpacing: 1.5,
                  color: tokens.text,
                  marginTop: 4,
                }}
              >
                {requestCode}
              </Text>
              <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 8 }}>
                Read this back to the technician so they can re-share the full link.
              </Text>
            </Card>
          ) : null}
        </View>
      </View>
    );
  }

  // Loading --------------------------------------------------------
  if (requestDetail.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg }}>
        <Stack.Screen options={{ headerShown: false }} />
        <TopBar
          title="NDT verifier portal"
          leading={<IconBtn icon={IconArrowLeft} label="Close" size="md" onPress={goClose} />}
        />
        <View style={{ padding: 20 }}>
          <Text style={{ ...type.body, color: tokens.textDim }}>Loading request…</Text>
        </View>
      </View>
    );
  }

  // Bad / unreadable link ------------------------------------------
  // The local NDT path reads from on-device SQLite, so a thrown query is almost
  // always a bad / mismatched signing token (the service throws
  // ndt_remote_request_token_invalid), not a network failure. Frame it as a
  // link problem rather than the rope-access "couldn't connect" wording.
  if (requestDetail.isError) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg }}>
        <Stack.Screen options={{ headerShown: false }} />
        <TopBar
          title="NDT verifier portal"
          leading={<IconBtn icon={IconArrowLeft} label="Close" size="md" onPress={goClose} />}
        />
        <View style={{ paddingHorizontal: 20, paddingTop: 4, gap: 12 }}>
          <Card padding={18}>
            <Text style={{ ...type.cardTitle, color: tokens.text }}>Link couldn’t be read</Text>
            <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 4 }}>
              This verification link is incomplete or no longer valid. Ask the technician to re-share the full link.
            </Text>
          </Card>
          <Button variant="primary" full onPress={() => requestDetail.refetch()}>
            Try again
          </Button>
        </View>
      </View>
    );
  }

  // Not found ------------------------------------------------------
  if (!detail || !inspection || !request) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg }}>
        <Stack.Screen options={{ headerShown: false }} />
        <TopBar
          title="NDT verifier portal"
          leading={<IconBtn icon={IconArrowLeft} label="Close" size="md" onPress={goClose} />}
        />
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

  const dateLabel = formatDateRange(inspection.date_from, inspection.date_to);
  // Actionable only while BOTH the request and the inspection are still pending.
  // maybeExpireNdtRequest self-heals an expired request server-side, so a stale
  // link lands here with request.status === 'expired'.
  const isActionable = request.status === 'pending' && inspection.status === 'pending';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: tokens.bg }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <TopBar
        title="NDT verifier portal"
        leading={<IconBtn icon={IconArrowLeft} label="Close" size="md" onPress={goClose} />}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        scrollEnabled={!signatureActive}
        keyboardShouldPersistTaps="handled"
      >
        {!isActionable ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
            <ClosedStateCard status={request.status} expiresAt={request.expires_at} />
          </View>
        ) : null}

        <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
          <Card padding={18}>
            <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>
              NDT VERIFICATION REQUEST
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
              {inspection.site}
            </Text>
            <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 4 }} numberOfLines={2}>
              {[inspection.employer, inspection.client].filter(Boolean).join(' · ') || 'No employer / client on file'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
              <Pill tone="chip">{dateLabel}</Pill>
              <Pill tone="chip">{`${inspection.hours.toFixed(1)} hr`}</Pill>
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

        {/* Read-only inspection — what the verifier is attesting to. */}
        <SectionH kicker="INSPECTION" title={dateLabel} />
        <View style={{ paddingHorizontal: 20 }}>
          <Card padding={14}>
            <Row label="Method" value={methodLabel(inspection.method)} />
            <Row label="Technique" value={inspection.technique || '—'} />
            <Row label="Dates" value={dateLabel} />
            <Row label="Hours" value={inspection.hours.toFixed(1)} />
            <Row label="Mode" value={supervisionLabel(inspection.supervised)} />
            <Row label="Level held" value={inspection.ndt_level_snapshot ?? '—'} />
            <Row label="Site / job" value={inspection.site || '—'} />
            <Row label="Employer" value={inspection.employer || '—'} />
            <Row label="Client" value={inspection.client || '—'} />
            <Row label="Procedure" value={inspection.procedure_ref || '—'} />
            <Row label="Component" value={inspection.component || '—'} />
            <Row
              label="Scheme"
              value={inspection.ndt_scheme || '—'}
              last={!inspection.description?.trim()}
            />
            {inspection.description?.trim() ? (
              <InspectionBlock label="Description" body={inspection.description} />
            ) : null}
          </Card>
        </View>

        <SectionH kicker="RECORD CHANGE CHECK" title="Record integrity" />
        <View style={{ paddingHorizontal: 20 }}>
          <Card padding={14}>
            <Text style={{ ...type.cardSub, color: tokens.textDim, marginBottom: 8 }}>
              This hash is tamper-evident: if the record changed after the request was sent, the
              hash would no longer match.
            </Text>
            <Row label="Record hash" value={truncateHash(request.inspection_hash)} mono last />
          </Card>
        </View>

        {isActionable ? (
          <>
            <SectionH kicker="VERIFICATION" title="Sign as Level III" />
            <View style={{ paddingHorizontal: 20, gap: 12 }}>
              {/* Identity reconcile: who the request was sent to vs who actually
                  signs are persisted separately. Surface the distinction so an
                  auditor can compare the two recorded names in the export. */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  backgroundColor: tokens.surface2,
                  borderWidth: 1,
                  borderColor: tokens.lineSoft,
                }}
              >
                <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>SENT TO</Text>
                <Text
                  style={{ ...type.body, color: tokens.text, flex: 1, fontWeight: '600' }}
                  numberOfLines={1}
                >
                  {request.recipient_name}
                </Text>
                {isDifferentSigner ? <Pill tone="warn" size="sm">Different signer</Pill> : null}
              </View>
              <Field
                label="I am signing as"
                value={verifierName}
                onChangeText={setVerifierName}
                placeholder="Your full name"
                autoCapitalize="words"
                helper={
                  isDifferentSigner
                    ? 'Both your name and the requested verifier name are recorded.'
                    : 'Type your name as it appears on your NDT certification. Both this and the requested name are recorded.'
                }
              />
              <Field
                label="Certification number"
                value={verifierCertNumber}
                onChangeText={setVerifierCertNumber}
                placeholder="Your NDT certification number"
                autoCapitalize="characters"
                helper="Required — your NDT certification number."
              />
              <View>
                <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 6 }}>
                  YOUR LEVEL
                </Text>
                <ChipSelect<NdtVerifierLevel>
                  value={verifierLevel}
                  options={LEVEL_OPTIONS}
                  onChange={setVerifierLevel}
                />
              </View>
              <Field
                label="Scheme (optional)"
                value={verifierScheme}
                onChangeText={setVerifierScheme}
                placeholder="e.g. ISO 9712 / SNT-TC-1A / PCN"
                helper="Optional — recorded as a neutral label only."
              />
              <Field
                label="Employer (optional)"
                value={verifierEmployer}
                onChangeText={setVerifierEmployer}
                placeholder="Company name"
                autoCapitalize="words"
                helper="Optional — the organisation you represent."
              />
              <View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}
                >
                  <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>SIGNATURE</Text>
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
                text={ATTESTATION_NDT}
                accepted={attestationAccepted}
                onToggle={() => setAttestationAccepted((v) => !v)}
              />
            </View>
          </>
        ) : null}

        {completeRequest.isError ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
            <Text style={{ ...type.cardSub, color: tokens.danger }}>
              Couldn’t submit the verification. Your details and signature are still here — tap
              Submit to try again.
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
            disabled={!canSign || completeRequest.isPending}
          >
            {completeRequest.isPending
              ? 'Submitting…'
              : completeRequest.isError && canSign
                ? 'Retry submit'
                : canSign
                  ? 'Submit verification'
                  : nextStepLabel({ hasName, hasCert, hasSignature, attestationAccepted })}
          </Button>
        ) : (
          <Button variant="secondary" size="lg" full onPress={goClose}>
            Close
          </Button>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// Next-step hint for the disabled submit button. NDT-local equivalent of the
// rope-access nextVerifierStep helper (which takes logbook-shaped fields).
function nextStepLabel(args: {
  hasName: boolean;
  hasCert: boolean;
  hasSignature: boolean;
  attestationAccepted: boolean;
}): string {
  if (!args.hasName) return 'Enter your name';
  if (!args.hasCert) return 'Enter your certification number';
  if (!args.hasSignature) return 'Add your signature';
  if (!args.attestationAccepted) return 'Confirm the attestation';
  return 'Finish verification';
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
        style={[mono ? type.mono : type.body, { color: tokens.text, flex: 1 }]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

// Multi-line block for the long-form description field. Same kicker treatment as
// `Row` but full-width with no row-length truncation.
function InspectionBlock({ label, body }: { label: string; body: string }) {
  const { tokens } = useTheme();
  return (
    <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: tokens.lineSoft }}>
      <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 4 }}>
        {label.toUpperCase()}
      </Text>
      <Text selectable style={{ ...type.body, color: tokens.text }}>
        {body}
      </Text>
    </View>
  );
}

function AttestationRow({
  text,
  accepted,
  onToggle,
}: {
  text: string;
  accepted: boolean;
  onToggle: () => void;
}) {
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
      <View style={boxStyle}>{accepted ? <IconCheck size={17} color={tokens.bg} fill={tokens.bg} /> : null}</View>
      <Text style={textStyle}>{text}</Text>
    </Pressable>
  );
}

// Closed-state banner. Built inline by branching on the NDT request status —
// the rope-access describeClosedRemoteRequest / RemoteRequestClosedReason
// helpers are logbook-typed and intentionally NOT reused. maybeExpireNdtRequest
// self-heals an expired request server-side, so 'expired' arrives ready to read.
function ClosedStateCard({
  status,
  expiresAt,
}: {
  status: string;
  expiresAt: string | null;
}) {
  const { tokens } = useTheme();
  const copy =
    status === 'completed'
      ? { title: 'Verification already submitted', detail: 'This request has been verified. No further action is needed.', tone: 'ok' as const }
      : status === 'expired'
        ? { title: 'Request expired', detail: 'Ask the technician to send a new verification request.', tone: 'warn' as const }
        : status === 'cancelled'
          ? { title: 'Request cancelled', detail: 'The technician cancelled this verification request.', tone: 'danger' as const }
          : { title: 'Request closed', detail: 'This request is no longer pending.', tone: 'chip' as const };
  const tones = {
    ok: { fg: tokens.ok, bg: tokens.okSoft },
    warn: { fg: tokens.warn, bg: tokens.warnSoft },
    danger: { fg: tokens.danger, bg: tokens.dangerSoft },
    chip: { fg: tokens.textDim, bg: tokens.surface },
  } as const;
  const tone = tones[copy.tone];
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
      <Text style={{ ...type.cardTitle, color: tokens.text }}>{copy.title}</Text>
      <Text style={{ ...type.cardSub, color: tokens.textDim }}>{copy.detail}</Text>
      {status === 'expired' && expiresAt ? (
        <Text style={{ ...type.monoSm, color: tokens.textFaint, marginTop: 4 }}>
          EXPIRED · {formatDateOrDash(expiresAt)}
        </Text>
      ) : null}
    </View>
  );
}
