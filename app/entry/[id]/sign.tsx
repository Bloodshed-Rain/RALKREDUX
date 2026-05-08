import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { getEntryVerificationReadiness } from '@/src/domain/logbook/entry-readiness';
import { useEntryDetail, useSignEntryLocal } from '@/src/domain/logbook/use-logbook';
import { Button, Card, CheckboxRow, Field, Screen, SignaturePad } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

const ATTESTATION_TEXT = 'I verify this entry matches the work performed and I am authorized to sign it.';

export default function LocalSignScreen() {
  const { colors, typography } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const entryId = firstParam(id);
  const detail = useEntryDetail(entryId);
  const signEntry = useSignEntryLocal();
  const [supervisorName, setSupervisorName] = React.useState('');
  const [supervisorCertNumber, setSupervisorCertNumber] = React.useState('');
  const [signaturePath, setSignaturePath] = React.useState('');
  const [attestationAccepted, setAttestationAccepted] = React.useState(false);

  const entry = detail.data?.entry;
  const readiness = entry ? getEntryVerificationReadiness(entry) : null;
  const canSign =
    Boolean(entryId) &&
    entry?.status === 'draft' &&
    readiness?.ready === true &&
    supervisorName.trim().length > 1 &&
    supervisorCertNumber.trim().length > 1 &&
    signaturePath.trim().length > 0 &&
    attestationAccepted;

  function submit() {
    if (!canSign || !entryId) return;
    signEntry.mutate(
      {
        entry_id: entryId,
        supervisor_name: supervisorName,
        supervisor_cert_number: supervisorCertNumber,
        signature_path: signaturePath,
        attestation_accepted: attestationAccepted,
        signer_attestation: ATTESTATION_TEXT,
      },
      { onSuccess: (signed) => router.replace(`/entry/${signed.entry.id}`) },
    );
  }

  return (
    <Screen>
      <Card>
        <Text selectable style={{ ...typography.title2, color: colors.textPrimary }}>
          Local supervisor sign-off
        </Text>
        <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
          {entry ? `${entry.site} - ${entry.work_hours.toFixed(1)} hours` : 'Loading entry'}
        </Text>
        <Field label="Supervisor name" value={supervisorName} onChangeText={setSupervisorName} placeholder="Jordan Lee" />
        <Field
          label="Certification number"
          value={supervisorCertNumber}
          onChangeText={setSupervisorCertNumber}
          placeholder="SPRAT / IRATA number"
        />
        <SignaturePad label="Supervisor signature" value={signaturePath} onChange={setSignaturePath} />
        <CheckboxRow
          checked={attestationAccepted}
          label={ATTESTATION_TEXT}
          onChange={setAttestationAccepted}
        />
      </Card>

      {entry?.status && entry.status !== 'draft' ? (
        <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
          Signed and amended records are locked.
        </Text>
      ) : null}

      {entry?.status === 'draft' && readiness && !readiness.ready ? (
        <Text selectable style={{ ...typography.body, color: colors.statusWarn }}>
          Complete before signing: {readiness.missingFields.join(', ')}.
        </Text>
      ) : null}

      <Button title="Sign entry" onPress={submit} disabled={!canSign} loading={signEntry.isPending} />
    </Screen>
  );
}
