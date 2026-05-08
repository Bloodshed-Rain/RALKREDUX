import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { getEntryVerificationReadiness } from '@/src/domain/logbook/entry-readiness';
import { useCreateRemoteSignatureRequest, useEntryDetail } from '@/src/domain/logbook/use-logbook';
import { Button, Card, Field, Screen } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

export default function RemoteSignatureRequestScreen() {
  const { colors, typography } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const entryId = firstParam(id);
  const detail = useEntryDetail(entryId);
  const createRequest = useCreateRemoteSignatureRequest();
  const [recipientName, setRecipientName] = React.useState('');
  const [recipientContact, setRecipientContact] = React.useState('');
  const [verifierRole, setVerifierRole] = React.useState('');
  const [verifierCompany, setVerifierCompany] = React.useState('');
  const entry = detail.data?.entry;
  const readiness = entry ? getEntryVerificationReadiness(entry) : null;

  const canCreate =
    Boolean(entryId) &&
    entry?.status === 'draft' &&
    readiness?.ready === true &&
    !detail.data?.remote_request &&
    recipientName.trim().length > 1 &&
    recipientContact.trim().length > 3;

  function submit() {
    if (!canCreate || !entryId) return;
    createRequest.mutate(
      {
        entry_id: entryId,
        recipient_name: recipientName,
        recipient_contact: recipientContact,
        verifier_role: verifierRole || null,
        verifier_company: verifierCompany || null,
      },
      { onSuccess: (updated) => router.replace(`/entry/${updated.entry.id}`) },
    );
  }

  return (
    <Screen>
      <Card>
        <Text selectable style={{ ...typography.title2, color: colors.textPrimary }}>
          Remote supervisor request
        </Text>
        <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
          {entry ? `${entry.site} - ${entry.work_hours.toFixed(1)} hours` : 'Loading entry'}
        </Text>
        <Field label="Verifier name" value={recipientName} onChangeText={setRecipientName} placeholder="Jordan Lee" />
        <Field
          label="Verifier contact"
          value={recipientContact}
          onChangeText={setRecipientContact}
          placeholder="Email or phone"
          keyboardType="email-address"
          autoCapitalize="none"
        />
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

      {entry?.status === 'draft' && readiness && !readiness.ready ? (
        <Text selectable style={{ ...typography.body, color: colors.statusWarn }}>
          Complete before requesting verification: {readiness.missingFields.join(', ')}.
        </Text>
      ) : null}

      <Button
        title="Create request"
        onPress={submit}
        disabled={!canCreate}
        loading={createRequest.isPending}
      />
    </Screen>
  );
}
