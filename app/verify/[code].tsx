import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, BadgeCheck, CalendarClock, CheckCircle2, ShieldOff } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Platform, Pressable, Text, View } from 'react-native';
import {
  completeHostedRemoteSignatureRequest,
  fetchHostedRemoteSigningRequest,
} from '@/src/cloud/supabase/remote-signing';
import {
  certLevelToDigit,
  formatIrataNumber,
  inferSchemeFromCertNumber,
  irataNumberDigits,
  normalizeSpratNumber,
} from '@/src/domain/cert-number';
import { formatDateOrDash, formatDateRange } from '@/src/domain/date-format';
import { describeClosedRemoteRequest, RemoteRequestClosedReason } from '@/src/domain/logbook/remote-signing-status';
import { EntryDetail } from '@/src/domain/logbook/types';
import {
  useCompleteRemoteSignatureRequest,
  useRemoteSignatureRequestDetail,
} from '@/src/domain/logbook/use-logbook';
import type { CertLevel, CertScheme } from '@/src/domain/profile/types';
import { AnimatedStamp, CheckboxRow, Chip, DocActionButton, DocBand, Field, Screen, SectionH, SignatureFill, SignaturePad } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

const ATTESTATION_TEXT =
  'I am the requested verifier, I reviewed this remote request and work record, and I authorize this signature.';

export default function RemoteVerifyScreen() {
  const { spacing, typography, tidewater, hairlines } = useTheme();
  const { code, token } = useLocalSearchParams<{ code?: string | string[]; token?: string | string[] }>();
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

    if (queryToken) {
      setSigningToken(queryToken);
    }
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

  const certReady = !requiresCertNumber || irataNumberDigits(supervisorCertNumber).length === 5;
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
      } catch {
        setHostedCompleteFailed(true);
      } finally {
        setHostedCompletePending(false);
      }
      return;
    }

    completeRequest.mutate(input, {
      onSuccess: (signed) => {
        setCompletedFromHosted(false);
        setCompletedDetail(signed);
      },
    });
  }

  // Completed state
  if (completedDetail) {
    const signed = completedDetail.signature;
    return (
      <Screen padded={false} weave>
        <DocBand
          variant="top"
          formId="CH.8 - VERIFIER PORTAL"
          rev="SUBMITTED"
          effective="ENTRY-HASH v2"
          rightLabel="COMPLETE"
        />
        <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.base, gap: spacing.lg }}>
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
                  REMOTE SIGNATURE COMPLETE
                </Text>
                <Text selectable style={{ ...typography.displayMd, color: tidewater.ink }}>
                  {completedDetail.entry.site}
                </Text>
              </View>
              <AnimatedStamp tone="green" rotation="standard">
                SIGNED
              </AnimatedStamp>
            </View>
            {signed?.supervisor_name ? (
              <View
                style={{
                  paddingHorizontal: spacing.sm,
                  paddingTop: spacing.sm,
                  paddingBottom: spacing.xs,
                  borderBottomWidth: 1,
                  borderBottomColor: tidewater.hairFaint,
                  gap: 4,
                }}
              >
                <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.5 }}>
                  SIGNER
                </Text>
                <SignatureFill name={signed.supervisor_name} fontSize={22} />
              </View>
            ) : null}
            <DocRow label="METHOD" value={signed?.method ?? 'remote'} />
            <DocRow label="SIGNED" value={formatDateOrDash(signed?.signed_at)} />
            {signed?.chain_hash ? (
              <DocRow label="CHAIN HASH" value={truncateHash(signed.chain_hash)} mono last />
            ) : null}
          </View>
          {!completedFromHosted ? (
            <DocActionButton
              title="RETURN TO LOGBOOK"
              icon={ArrowLeft}
              variant="secondary"
              onPress={() => router.replace(`/entry/${completedDetail.entry.id}`)}
            />
          ) : null}
        </View>
        <DocBand
          variant="footer"
          text="REMOTE SIGNATURE SEALED INTO HASH CHAIN"
          page={requestCode ? `REQ ${requestCode}` : 'REQ ------'}
        />
      </Screen>
    );
  }

  // No token
  if (!signingToken) {
    return (
      <Screen padded={false} weave>
        <DocBand variant="top" formId="CH.8 - VERIFIER PORTAL" rev="NO TOKEN" rightLabel="HOLD" />
        <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.base, gap: spacing.md }}>
          <View
            style={{
              borderWidth: 1.5,
              borderColor: tidewater.yellowDeep,
              backgroundColor: tidewater.yellowSoft,
              padding: spacing.md,
              gap: spacing.xs,
            }}
          >
            <Text style={{ ...typography.displaySm, color: tidewater.ink, letterSpacing: 1.2 }}>
              SECURE LINK REQUIRED
            </Text>
            <Text style={{ ...typography.body, color: tidewater.ink2 }}>
              Open the full verifier link from the request message. The request code alone cannot authorize a remote
              signature.
            </Text>
          </View>
        </View>
      </Screen>
    );
  }

  // Loading
  if (requestDetail.isLoading || hostedRequestDetail.isLoading) {
    return (
      <Screen padded={false} weave>
        <DocBand variant="top" formId="CH.8 - VERIFIER PORTAL" rev="LOADING" rightLabel="WAIT" />
        <View style={{ padding: spacing.base }}>
          <Text style={{ ...typography.body, color: tidewater.ink }}>Loading request…</Text>
        </View>
      </Screen>
    );
  }

  // Not found
  if (!detail || !entry || !request) {
    return (
      <Screen padded={false} weave>
        <DocBand variant="top" formId="CH.8 - VERIFIER PORTAL" rev="NOT FOUND" rightLabel="404" />
        <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.base, gap: spacing.md }}>
          <Text style={{ ...typography.displayMd, color: tidewater.ink }}>Request not found</Text>
          <Text style={{ ...typography.body, color: tidewater.ink2 }}>Check the request code and try again.</Text>
        </View>
      </Screen>
    );
  }

  const dateLabel = formatDateRange(entry.date_from, entry.date_to);
  const isActionable = request.status === 'pending' && entry.status === 'draft';

  return (
    <Screen
      padded={false}
      weave
      preserveChildTouches
      scrollEnabled={!signatureActive}
      footer={
        isActionable ? (
          <DocActionButton
            title={canSign ? 'SUBMIT REMOTE SIGNATURE' : 'FINISH VERIFICATION'}
            icon={CheckCircle2}
            onPress={submit}
            disabled={!canSign}
            loading={completeRequest.isPending || hostedCompletePending}
          />
        ) : (
          <DocActionButton
            title="CLOSE"
            icon={ArrowLeft}
            variant="secondary"
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/');
            }}
          />
        )
      }
    >
      <DocBand
        variant="top"
        formId="CH.8 - VERIFIER PORTAL"
        rev={request.status.toUpperCase()}
        effective="ENTRY-HASH v2"
        rightLabel={isActionable ? (canSign ? 'READY' : 'HOLD') : 'CLOSED'}
      />

      <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.base, gap: spacing.lg }}>
        {/* Closed state notice (if not actionable) */}
        {!isActionable ? (
          <ClosedStateCard reason={describeClosedRemoteRequest(request, entry, detail.signature)} />
        ) : null}

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
                REMOTE SIGNATURE REQUEST
              </Text>
              <Text selectable style={{ ...typography.displayMd, color: tidewater.ink }} numberOfLines={2}>
                {entry.site}
              </Text>
              <Text selectable style={{ ...typography.monoSm, color: tidewater.ink2 }} numberOfLines={2}>
                {[entry.employer, entry.client].filter(Boolean).join(' · ') || 'No employer / client'}
              </Text>
            </View>
            <AnimatedStamp tone={isActionable ? 'yellow' : 'mute'} rotation="light">
              {request.status.toUpperCase()}
            </AnimatedStamp>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, padding: spacing.md }}>
            <Chip tone="ink">{dateLabel.toUpperCase()}</Chip>
            <Chip tone="mute">{`${entry.work_hours.toFixed(1)} HR`}</Chip>
            <Chip tone="mute">{`CODE ${request.request_code}`}</Chip>
          </View>
        </View>

        {/* § 18 Request details */}
        <View>
          <SectionH n="18" right={`EXPIRES ${formatDateOrDash(request.expires_at).toUpperCase()}`}>
            Request
          </SectionH>
          <View
            style={{
              borderWidth: 1.5,
              borderColor: tidewater.hair,
              backgroundColor: tidewater.white,
            }}
          >
            <DocRow label="REQUESTED" value={request.recipient_name} />
            <DocRow label="CONTACT" value={request.recipient_contact ?? '—'} />
            <DocRow label="ROLE" value={request.verifier_role ?? '—'} />
            <DocRow label="COMPANY" value={request.verifier_company ?? '—'} />
            <DocRow label="LINK CHECK" value={request.token_hint ?? '—'} mono last />
          </View>
        </View>

        {/* § 19 Work record */}
        <View>
          <SectionH n="19">Work record</SectionH>
          <View
            style={{
              borderWidth: 1.5,
              borderColor: tidewater.hair,
              backgroundColor: tidewater.white,
            }}
          >
            <DocRow label="DATE" value={dateLabel} />
            <DocRow label="HOURS" value={entry.work_hours.toFixed(1)} />
            <DocRow label="TASK" value={entry.work_task || '—'} />
            <DocRow label="ACCESS" value={entry.access_method || '—'} />
            <DocRow label="STRUCTURE" value={entry.structure_type || '—'} />
            <DocRow
              label="HEIGHT"
              value={!entry.max_height || entry.max_height <= 0 ? '—' : `${entry.max_height.toFixed(0)} ${entry.height_unit}`}
              last={!entry.description}
            />
            {entry.description ? (
              <View
                style={{
                  padding: spacing.sm,
                  borderTopWidth: 1,
                  borderTopColor: tidewater.hairFaint,
                }}
              >
                <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.5 }}>NOTES</Text>
                <Text selectable style={{ ...typography.body, color: tidewater.ink, marginTop: 4 }}>
                  {entry.description}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* § 20 Record change check */}
        <View>
          <SectionH n="20">Record change check</SectionH>
          <Text style={{ ...typography.monoSm, color: tidewater.ink3, marginBottom: spacing.sm }}>
            This code proves the record has not changed since the request was sent.
          </Text>
          <View
            style={{
              borderWidth: 1.5,
              borderColor: tidewater.hair,
              backgroundColor: tidewater.white,
            }}
          >
            <DocRow label="ENTRY HASH" value={truncateHash(request.entry_hash)} mono last />
          </View>
        </View>

        {/* § 21 Authorization (only when actionable) */}
        {isActionable ? (
          <View>
            <SectionH n="21" right={canSign ? 'READY' : 'REQUIRED'}>
              Remote authorization
            </SectionH>
            <View style={{ gap: spacing.md }}>
              <Field
                label="Verifier name"
                value={supervisorName}
                onChangeText={setSupervisorName}
                placeholder="Jordan Lee"
                invalid={!hasName}
              />
              <View style={{ gap: spacing.xs }}>
                <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.5 }}>
                  YOUR SCHEME
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {(['sprat', 'irata'] as const).map((scheme) => (
                    <LevelChip
                      key={scheme}
                      label={scheme.toUpperCase()}
                      selected={scheme === supervisorScheme}
                      onPress={() => {
                        setSupervisorScheme(scheme);
                        setSupervisorCertNumber(
                          scheme === 'irata'
                            ? formatIrataNumber(supervisorIrataLevel, supervisorCertNumber)
                            : normalizeSpratNumber(supervisorCertNumber),
                        );
                      }}
                    />
                  ))}
                </View>
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
                invalid={requiresCertNumber && !certReady}
                hint={
                  requiresCertNumber
                    ? `Required for IRATA verifiers. Saved as ${certLevelToDigit(supervisorIrataLevel)}/12345.`
                    : 'Optional for SPRAT verifiers. Add it if you have a SPRAT card number.'
                }
              />
              {requiresCertNumber ? (
                <View style={{ gap: spacing.xs }}>
                  <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.5 }}>
                    YOUR LEVEL
                  </Text>
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    {(['I', 'II', 'III'] as const).map((level) => (
                      <LevelChip
                        key={level}
                        label={certLevelToDigit(level)}
                        selected={level === supervisorIrataLevel}
                        onPress={() => {
                          setSupervisorIrataLevel(level);
                          setSupervisorCertNumber(formatIrataNumber(level, supervisorCertNumber));
                        }}
                      />
                    ))}
                  </View>
                </View>
              ) : null}
              <SignaturePad
                label="Verifier signature"
                value={signaturePath}
                onChange={setSignaturePath}
                onStrokeStart={() => setSignatureActive(true)}
                onStrokeEnd={() => setSignatureActive(false)}
              />
              <View
                style={{
                  borderWidth: 1.5,
                  borderColor: attestationAccepted ? tidewater.green : tidewater.hairSoft,
                  backgroundColor: attestationAccepted ? tidewater.greenSoft : tidewater.white,
                  padding: spacing.sm,
                }}
              >
                <CheckboxRow
                  checked={attestationAccepted}
                  label={ATTESTATION_TEXT}
                  onChange={setAttestationAccepted}
                />
              </View>
            </View>
          </View>
        ) : null}

        {completeRequest.isError || hostedCompleteFailed ? (
          <Text selectable style={{ ...typography.monoSm, color: tidewater.red }}>
            Remote signing failed. Refresh the request and try again.
          </Text>
        ) : null}
      </View>

      <DocBand
        variant="footer"
        text={
          isActionable
            ? canSign
              ? 'SUBMITTING SEALS THIS SIGNATURE INTO THE HASH CHAIN'
              : 'VERIFIER PORTAL HOLD - COMPLETE REQUIRED FIELDS'
            : 'REQUEST CLOSED - READ-ONLY VIEW'
        }
        page={requestCode ? `REQ ${requestCode}` : 'REQ ------'}
      />
    </Screen>
  );
}

function truncateHash(value: string): string {
  return `${value.slice(0, 16)}…${value.slice(-12)}`;
}

function DocRow({
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
  const { spacing, typography, tidewater } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs + 2,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: tidewater.hairFaint,
        gap: spacing.sm,
      }}
    >
      <Text style={{ ...typography.monoSm, color: tidewater.ink3, width: 96, letterSpacing: 1.5 }}>
        {label}
      </Text>
      <Text
        selectable
        style={{
          flex: 1,
          ...(mono ? typography.monoMd : typography.body),
          color: tidewater.ink,
          fontVariant: mono ? ['tabular-nums'] : undefined,
        }}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

type ClosedCardTone = 'green' | 'yellow' | 'red' | 'ink';

function closedCardCopy(reason: RemoteRequestClosedReason | null): {
  title: string;
  detail: string;
  icon: LucideIcon;
  tone: ClosedCardTone;
  signedAt?: string | null;
  signer?: string | null;
  expiresAt?: string | null;
} {
  if (!reason) {
    return {
      title: 'REQUEST CLOSED',
      detail: 'This request is no longer pending.',
      icon: ShieldOff,
      tone: 'ink',
    };
  }

  if (reason.kind === 'completed') {
    return {
      title: 'SIGNATURE ALREADY SUBMITTED',
      detail: 'This request has been signed. No further action is needed.',
      icon: BadgeCheck,
      tone: 'green',
      signedAt: reason.signed_at,
      signer: reason.signer_name,
    };
  }

  if (reason.kind === 'expired') {
    return {
      title: 'REQUEST EXPIRED',
      detail: 'Ask the technician to send a new request.',
      icon: CalendarClock,
      tone: 'yellow',
      expiresAt: reason.expires_at,
    };
  }

  if (reason.kind === 'cancelled') {
    return {
      title: 'REQUEST CANCELLED',
      detail: 'The technician cancelled this remote signing request.',
      icon: ShieldOff,
      tone: 'red',
    };
  }

  return {
    title: 'ENTRY ALREADY CLOSED',
    detail: 'The technician completed this record without a remote signature.',
    icon: BadgeCheck,
    tone: 'ink',
  };
}

function ClosedStateCard({ reason }: { reason: RemoteRequestClosedReason | null }) {
  const { spacing, typography, tidewater } = useTheme();
  const copy = closedCardCopy(reason);
  const toneColor =
    copy.tone === 'green'
      ? tidewater.green
      : copy.tone === 'yellow'
        ? tidewater.yellowDeep
        : copy.tone === 'red'
          ? tidewater.red
          : tidewater.ink2;
  const toneBg =
    copy.tone === 'green'
      ? tidewater.greenSoft
      : copy.tone === 'yellow'
        ? tidewater.yellowSoft
        : copy.tone === 'red'
          ? tidewater.redSoft
          : tidewater.paper2;
  const Icon = copy.icon;

  return (
    <View
      style={{
        borderWidth: 1.5,
        borderColor: toneColor,
        backgroundColor: toneBg,
        padding: spacing.md,
        gap: spacing.xs,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Icon size={20} color={toneColor} strokeWidth={2.2} />
        <Text style={{ ...typography.displaySm, color: tidewater.ink, letterSpacing: 1.2, flex: 1 }}>
          {copy.title}
        </Text>
      </View>
      <Text style={{ ...typography.body, color: tidewater.ink2 }}>{copy.detail}</Text>
      {copy.signer ? (
        <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.2 }}>
          SIGNER · {copy.signer}
        </Text>
      ) : null}
      {copy.signedAt ? (
        <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.2 }}>
          SIGNED · {formatDateOrDash(copy.signedAt)}
        </Text>
      ) : null}
      {copy.expiresAt ? (
        <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.2 }}>
          EXPIRED · {formatDateOrDash(copy.expiresAt)}
        </Text>
      ) : null}
    </View>
  );
}

function LevelChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { spacing, typography, touchTarget, tidewater } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: touchTarget.min,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: selected ? tidewater.accent : tidewater.hair,
        backgroundColor: selected ? tidewater.accent : tidewater.white,
        opacity: pressed ? 0.82 : 1,
        paddingHorizontal: spacing.md,
      })}
    >
      <Text selectable={false} style={{ ...typography.displaySm, color: selected ? tidewater.paper : tidewater.ink2 }}>
        Level {label}
      </Text>
    </Pressable>
  );
}

