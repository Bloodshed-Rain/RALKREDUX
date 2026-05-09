import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import { Platform, Text, View } from 'react-native';
import {
  completeHostedRemoteSignatureRequest,
  fetchHostedRemoteSigningRequest,
} from '@/src/cloud/supabase/remote-signing';
import { formatDateOrDash, formatDateRange } from '@/src/domain/date-format';
import { EntryDetail } from '@/src/domain/logbook/types';
import {
  useCompleteRemoteSignatureRequest,
  useRemoteSignatureRequestDetail,
} from '@/src/domain/logbook/use-logbook';
import { Button, Card, CheckboxRow, Field, Screen, SignaturePad, StatRow } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

const ATTESTATION_TEXT = 'I am the requested verifier, I reviewed this remote request and work record, and I authorize this signature.';

function HashPreview({ value }: { value: string }) {
  const { colors, typography } = useTheme();
  return (
    <Text
      selectable
      style={{
        ...typography.caption,
        color: colors.textSecondary,
        fontVariant: ['tabular-nums'],
      }}
    >
      {value.slice(0, 16)}...{value.slice(-12)}
    </Text>
  );
}

export default function RemoteVerifyScreen() {
  const { colors, spacing, typography } = useTheme();
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
  const [supervisorCertNumber, setSupervisorCertNumber] = React.useState('');
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
  const requiresCertNumber = Boolean(entry?.irata_level_snapshot);

  React.useEffect(() => {
    const requestChanged = previousRequestCodeRef.current !== requestCode;
    if (requestChanged) {
      previousRequestCodeRef.current = requestCode;
      setSigningToken(queryToken);
      setSupervisorName('');
      setSupervisorCertNumber('');
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

  const canSign =
    Boolean(requestCode) &&
    Boolean(signingToken) &&
    request?.status === 'pending' &&
    entry?.status === 'draft' &&
    supervisorName.trim().length > 1 &&
    (!requiresCertNumber || supervisorCertNumber.trim().length > 1) &&
    signaturePath.trim().length > 0 &&
    attestationAccepted;
  const missingToSubmit = [
    request?.status === 'pending' ? null : 'pending request',
    entry?.status === 'draft' ? null : 'open draft record',
    supervisorName.trim().length > 1 ? null : 'verifier name',
    !requiresCertNumber || supervisorCertNumber.trim().length > 1 ? null : 'IRATA verifier number',
    signaturePath.trim() ? null : 'drawn signature',
    attestationAccepted ? null : 'authorization checkbox',
  ].filter(Boolean) as string[];

  async function submit() {
    if (!canSign || !requestCode || !detail) return;

    const input = {
      request_code: requestCode,
      signing_token: signingToken,
      supervisor_name: supervisorName,
      supervisor_cert_number: supervisorCertNumber,
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

    completeRequest.mutate(
      input,
      {
        onSuccess: (signed) => {
          setCompletedFromHosted(false);
          setCompletedDetail(signed);
        },
      },
    );
  }

  if (completedDetail) {
    const signed = completedDetail.signature;
    return (
      <Screen>
        <Card>
          <Text selectable style={{ ...typography.caption, color: colors.statusOk, textTransform: 'uppercase' }}>
            Submitted
          </Text>
          <Text selectable style={{ ...typography.title2, color: colors.textPrimary }}>
            Remote signature complete
          </Text>
          <StatRow label="Site" value={completedDetail.entry.site} />
          <StatRow label="Method" value={signed?.method ?? 'remote'} />
          <StatRow label="Signed" value={formatDateOrDash(signed?.signed_at)} />
          {signed?.chain_hash ? (
            <View style={{ gap: spacing.xs }}>
              <Text selectable style={{ ...typography.label, color: colors.textPrimary }}>
                Chain hash
              </Text>
              <HashPreview value={signed.chain_hash} />
            </View>
          ) : null}
        </Card>
        {!completedFromHosted ? (
          <Button
            title="Return to logbook record"
            icon={ArrowLeft}
            variant="secondary"
            onPress={() => router.replace(`/entry/${completedDetail.entry.id}`)}
          />
        ) : null}
      </Screen>
    );
  }

  if (!signingToken) {
    return (
      <Screen>
        <Card>
          <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
            Secure link required
          </Text>
          <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
            Open the full verifier link from the request message. The request code alone cannot authorize a remote signature.
          </Text>
        </Card>
      </Screen>
    );
  }

  if (requestDetail.isLoading || hostedRequestDetail.isLoading) {
    return (
      <Screen>
        <Text selectable style={{ ...typography.body, color: colors.textPrimary }}>
          Loading request
        </Text>
      </Screen>
    );
  }

  if (!detail || !entry || !request) {
    return (
      <Screen>
        <Card>
          <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
            Request not found
          </Text>
          <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
            Check the request code and try again.
          </Text>
        </Card>
      </Screen>
    );
  }

  const dateLabel = formatDateRange(entry.date_from, entry.date_to);

  return (
    <Screen
      preserveChildTouches
      scrollEnabled={!signatureActive}
      footer={
        <View style={{ gap: spacing.sm }}>
          {!canSign ? <RequirementList title="Before submitting" items={missingToSubmit} /> : null}
          <Button
            title="Submit remote signature"
            icon={CheckCircle2}
            onPress={submit}
            disabled={!canSign}
            loading={completeRequest.isPending || hostedCompletePending}
          />
        </View>
      }
    >
      <Card>
        <View style={{ gap: spacing.xs }}>
          <Text selectable style={{ ...typography.caption, color: colors.textSecondary, textTransform: 'uppercase' }}>
            Verifier portal - {request.status}
          </Text>
          <Text selectable style={{ ...typography.title2, color: colors.textPrimary }}>
            Remote signature request
          </Text>
        </View>
        <StatRow label="Requested verifier" value={request.recipient_name} />
        <StatRow label="Contact" value={request.recipient_contact ?? '-'} />
        <StatRow label="Expires" value={formatDateOrDash(request.expires_at)} />
        <StatRow label="Link check" value={request.token_hint ?? '-'} />
      </Card>

      <Card>
        <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
          Work record under review
        </Text>
        <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
          {entry.site} - {entry.employer}
        </Text>
        <StatRow label="Date" value={dateLabel} />
        <StatRow label="Hours" value={entry.work_hours.toFixed(1)} />
        <StatRow label="Task" value={entry.work_task} />
        <StatRow label="Access" value={entry.access_method} />
        <StatRow label="Structure" value={entry.structure_type} />
        <StatRow label="Max height" value={!entry.max_height || entry.max_height <= 0 ? '-' : `${entry.max_height.toFixed(0)} ${entry.height_unit}`} />
        <Text selectable style={{ ...typography.body, color: colors.textPrimary }}>
          {entry.description}
        </Text>
      </Card>

      <Card>
        <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
          Record change check
        </Text>
        <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
          This code proves the record has not changed since the request was sent.
        </Text>
        <HashPreview value={request.entry_hash} />
        <StatRow label="Code" value={request.request_code} />
        <StatRow label="Verifier role" value={request.verifier_role ?? '-'} />
        <StatRow label="Company" value={request.verifier_company ?? '-'} />
      </Card>

      {request.status === 'pending' && entry.status === 'draft' ? (
        <Card>
          <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
            Remote authorization
          </Text>
          <Field label="Verifier name" value={supervisorName} onChangeText={setSupervisorName} placeholder="Jordan Lee" />
          <Field
            label="SPRAT / IRATA number"
            value={supervisorCertNumber}
            onChangeText={setSupervisorCertNumber}
            placeholder={requiresCertNumber ? 'Required for IRATA' : 'Optional'}
            hint={requiresCertNumber
              ? 'Required for IRATA entries. Use the verifier IRATA number.'
              : 'Optional for SPRAT entries. Add it when the verifier has a SPRAT or IRATA card/member number.'}
          />
          <SignaturePad
            label="Verifier signature"
            value={signaturePath}
            onChange={setSignaturePath}
            onStrokeStart={() => setSignatureActive(true)}
            onStrokeEnd={() => setSignatureActive(false)}
          />
          <CheckboxRow
            checked={attestationAccepted}
            label={ATTESTATION_TEXT}
            onChange={setAttestationAccepted}
          />
        </Card>
      ) : (
        <Card>
          <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
            Request closed
          </Text>
          <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
            This request is no longer pending.
          </Text>
        </Card>
      )}

      {completeRequest.isError || hostedCompleteFailed ? (
        <Text selectable style={{ ...typography.body, color: colors.statusErr }}>
          Remote signing failed. Refresh the request and try again.
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
