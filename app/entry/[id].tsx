import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { getEntryVerificationReadiness } from '@/src/domain/logbook/entry-readiness';
import { useEntryDetail } from '@/src/domain/logbook/use-logbook';
import { Button, Card, Screen, StatRow } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

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

function SignaturePreview({ value }: { value: string }) {
  const { colors, radii, spacing, typography } = useTheme();

  return (
    <View style={{ gap: spacing.xs }}>
      <Text selectable style={{ ...typography.label, color: colors.textPrimary }}>
        Drawn signature
      </Text>
      <View
        style={{
          height: 112,
          borderRadius: radii.sm,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.bgSurface,
          overflow: 'hidden',
        }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 1000 400">
          <Line x1={48} x2={952} y1={324} y2={324} stroke={colors.divider} strokeWidth={3} />
          <Path d={value} fill="none" stroke={colors.textPrimary} strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
        </Svg>
      </View>
    </View>
  );
}

export default function EntryDetailScreen() {
  const { colors, spacing, typography } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const entryId = firstParam(id);
  const detail = useEntryDetail(entryId);
  const entry = detail.data?.entry;
  const signature = detail.data?.signature;
  const remoteRequest = detail.data?.remote_request;
  const readiness = entry ? getEntryVerificationReadiness(entry) : null;

  if (detail.isLoading) {
    return (
      <Screen>
        <Text selectable style={{ ...typography.body, color: colors.textPrimary }}>
          Loading entry
        </Text>
      </Screen>
    );
  }

  if (!entry) {
    return (
      <Screen>
        <Card>
          <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
            Entry not found
          </Text>
          <Button title="Back to records" variant="secondary" onPress={() => router.replace('/records')} />
        </Card>
      </Screen>
    );
  }

  const dateLabel = entry.date_from === entry.date_to ? entry.date_from : `${entry.date_from} to ${entry.date_to}`;

  return (
    <Screen>
      <Card>
        <View style={{ gap: spacing.xs }}>
          <Text selectable style={{ ...typography.caption, color: colors.textSecondary, textTransform: 'uppercase' }}>
            {entry.status}
          </Text>
          <Text selectable style={{ ...typography.title1, color: colors.textPrimary }}>
            {entry.site}
          </Text>
          <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
            {entry.employer} - {entry.client}
          </Text>
        </View>
        <StatRow label="Date" value={dateLabel} />
        <StatRow label="Hours" value={entry.work_hours.toFixed(1)} />
        <StatRow label="Max height" value={entry.max_height === null ? '-' : `${entry.max_height.toFixed(0)} ${entry.height_unit}`} />
        <StatRow label="SPRAT level" value={entry.sprat_level_snapshot ?? '-'} />
        <StatRow label="IRATA level" value={entry.irata_level_snapshot ?? '-'} />
        {entry.amends_entry_id ? <StatRow label="Amends" value={entry.amends_entry_id.slice(0, 18)} /> : null}
      </Card>

      <Card>
        <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
          Work classification
        </Text>
        <StatRow label="Task" value={entry.work_task || '-'} />
        <StatRow label="Access method" value={entry.access_method || '-'} />
        <StatRow label="Structure" value={entry.structure_type || '-'} />
        {readiness && !readiness.ready ? (
          <Text selectable style={{ ...typography.caption, color: colors.statusWarn }}>
            Missing before verification: {readiness.missingFields.join(', ')}
          </Text>
        ) : null}
      </Card>

      <Card>
        <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
          Work performed
        </Text>
        <Text selectable style={{ ...typography.body, color: colors.textPrimary }}>
          {entry.description}
        </Text>
      </Card>

      <Card>
        <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
          Signature
        </Text>
        {signature ? (
          <>
            <StatRow label="Method" value={signature.method} />
            <StatRow label="Supervisor" value={signature.supervisor_name} />
            <StatRow label="Cert" value={signature.supervisor_cert_number} />
            <StatRow label="Signed" value={signature.signed_at.slice(0, 10)} />
            {signature.signature_path ? <SignaturePreview value={signature.signature_path} /> : null}
            <View style={{ gap: spacing.xs }}>
              <Text selectable style={{ ...typography.label, color: colors.textPrimary }}>
                Entry hash
              </Text>
              <HashPreview value={signature.entry_hash} />
            </View>
          </>
        ) : remoteRequest ? (
          <>
            <StatRow label="Request status" value={remoteRequest.status} />
            <StatRow label="Verifier" value={remoteRequest.recipient_name} />
            <StatRow label="Contact" value={remoteRequest.recipient_contact ?? '-'} />
            <StatRow label="Role" value={remoteRequest.verifier_role ?? '-'} />
            <StatRow label="Code" value={remoteRequest.request_code} />
            <View style={{ gap: spacing.xs }}>
              <Text selectable style={{ ...typography.label, color: colors.textPrimary }}>
                Requested entry hash
              </Text>
              <HashPreview value={remoteRequest.entry_hash} />
            </View>
          </>
        ) : (
          <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
            This draft has not been signed yet.
          </Text>
        )}
      </Card>

      {entry.status === 'draft' ? (
        <Button title="Local sign" onPress={() => router.push(`/entry/${entry.id}/sign`)} />
      ) : null}

      {entry.status === 'draft' && !remoteRequest ? (
        <Button
          title="Request remote signature"
          variant="secondary"
          onPress={() => router.push(`/entry/${entry.id}/request-signature`)}
        />
      ) : null}

      {entry.status === 'signed' ? (
        <Button title="Create amendment" variant="secondary" onPress={() => router.push(`/entry/${entry.id}/amend`)} />
      ) : null}
    </Screen>
  );
}
