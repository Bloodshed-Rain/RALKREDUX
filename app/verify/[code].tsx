import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import { Text, View } from 'react-native';
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
  const signingToken = firstParam(token);
  const requestDetail = useRemoteSignatureRequestDetail(requestCode, signingToken);
  const completeRequest = useCompleteRemoteSignatureRequest();
  const [supervisorName, setSupervisorName] = React.useState('');
  const [supervisorCertNumber, setSupervisorCertNumber] = React.useState('');
  const [signaturePath, setSignaturePath] = React.useState('');
  const [signatureActive, setSignatureActive] = React.useState(false);
  const [attestationAccepted, setAttestationAccepted] = React.useState(false);
  const [completedDetail, setCompletedDetail] = React.useState<EntryDetail | null>(null);
  const detail = requestDetail.data;
  const entry = detail?.entry;
  const request = detail?.request;

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
    supervisorCertNumber.trim().length > 1 &&
    signaturePath.trim().length > 0 &&
    attestationAccepted;

  function submit() {
    if (!canSign || !requestCode) return;
    completeRequest.mutate(
      {
        request_code: requestCode,
        signing_token: signingToken,
        supervisor_name: supervisorName,
        supervisor_cert_number: supervisorCertNumber,
        signature_path: signaturePath,
        attestation_accepted: attestationAccepted,
        signer_attestation: ATTESTATION_TEXT,
      },
      { onSuccess: (signed) => setCompletedDetail(signed) },
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
          <StatRow label="Signed" value={signed?.signed_at.slice(0, 10) ?? '-'} />
          {signed?.chain_hash ? (
            <View style={{ gap: spacing.xs }}>
              <Text selectable style={{ ...typography.label, color: colors.textPrimary }}>
                Chain hash
              </Text>
              <HashPreview value={signed.chain_hash} />
            </View>
          ) : null}
        </Card>
        <Button
          title="Return to logbook record"
          icon={ArrowLeft}
          variant="secondary"
          onPress={() => router.replace(`/entry/${completedDetail.entry.id}`)}
        />
      </Screen>
    );
  }

  if (requestDetail.isLoading) {
    return (
      <Screen>
        <Text selectable style={{ ...typography.body, color: colors.textPrimary }}>
          Loading request
        </Text>
      </Screen>
    );
  }

  if (requestDetail.isError) {
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

  const dateLabel = entry.date_from === entry.date_to ? entry.date_from : `${entry.date_from} to ${entry.date_to}`;

  return (
    <Screen
      preserveChildTouches
      scrollEnabled={!signatureActive}
      footer={
        <Button
          title="Submit remote signature"
          icon={CheckCircle2}
          onPress={submit}
          disabled={!canSign}
          loading={completeRequest.isPending}
        />
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
        <StatRow label="Expires" value={request.expires_at ? request.expires_at.slice(0, 10) : '-'} />
        <StatRow label="Token hint" value={request.token_hint ?? '-'} />
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
          Request fingerprint
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
            label="Certification number"
            value={supervisorCertNumber}
            onChangeText={setSupervisorCertNumber}
            placeholder="SPRAT / IRATA number"
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

      {completeRequest.isError ? (
        <Text selectable style={{ ...typography.body, color: colors.statusErr }}>
          Remote signing failed. Refresh the request and try again.
        </Text>
      ) : null}
    </Screen>
  );
}
