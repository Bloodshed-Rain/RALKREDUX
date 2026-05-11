import React from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import * as Print from 'expo-print';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import {
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Camera,
  Clock3,
  Eye,
  FileJson,
  FileText,
  HardHat,
  Hash,
  Image,
  MapPin,
  PenLine,
  Plus,
  RefreshCw,
  Ruler,
  Send,
  Share2,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Image as NativeImage, Platform, Share, Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { syncHostedRemoteSigningRequest } from '@/src/cloud/supabase/remote-signing';
import {
  useAutoSyncHostedRemoteSignature,
  useImportHostedRemoteSignatureCompletion,
} from '@/src/cloud/supabase/use-remote-signing-sync';
import { formatDate, formatDateOrDash, formatDateRange } from '@/src/domain/date-format';
import { useGearItems } from '@/src/domain/gear/use-gear';
import { getEntryVerificationReadiness } from '@/src/domain/logbook/entry-readiness';
import { buildEntryExportFileName, buildEntryPdfHtml } from '@/src/domain/logbook/export';
import { buildRemoteSigningToken, buildRemoteSigningUrl } from '@/src/domain/logbook/logbook-service';
import {
  useAddEntryAttachment,
  useAttachGearToEntry,
  useEntryDetail,
  useExportEntryPacket,
  useRemoveGearFromEntry,
} from '@/src/domain/logbook/use-logbook';
import { Button, Card, Screen, StatRow } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

function webVerifierOrigin(): string | null {
  if (Platform.OS === 'web') {
    const origin = (globalThis as { location?: { origin?: string } }).location?.origin;
    return origin && origin !== 'null' ? origin : null;
  }

  return null;
}

function buildVerifierLink(request: Parameters<typeof buildRemoteSigningToken>[0]): string {
  const token = buildRemoteSigningToken(request);
  if (Platform.OS === 'web') {
    return buildRemoteSigningUrl(request, { origin: webVerifierOrigin() });
  }

  return Linking.createURL(`/verify/${request.request_code}`, {
    queryParams: { token },
  });
}

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusTone(status: string): 'ok' | 'warn' | 'info' {
  if (status === 'signed') return 'ok';
  if (status === 'amended') return 'info';
  return 'warn';
}

function Pill({
  label,
  icon: Icon,
  tone = 'info',
}: {
  label: string;
  icon?: LucideIcon;
  tone?: 'ok' | 'warn' | 'err' | 'info' | 'neutral';
}) {
  const { colors, radii, spacing, typography } = useTheme();
  const toneColor = tone === 'ok'
    ? colors.statusOk
    : tone === 'warn'
      ? colors.statusWarn
      : tone === 'err'
        ? colors.statusErr
        : tone === 'neutral'
          ? colors.textSecondary
          : colors.statusInfo;
  const toneBg = tone === 'ok'
    ? colors.statusOkTint
    : tone === 'warn'
      ? colors.statusWarnTint
      : tone === 'err'
        ? colors.statusErrTint
        : tone === 'neutral'
          ? colors.bgMuted
          : colors.statusInfoTint;

  return (
    <View
      style={{
        minHeight: 30,
        alignSelf: 'flex-start',
        borderRadius: radii.pill,
        backgroundColor: toneBg,
        paddingHorizontal: spacing.sm,
        alignItems: 'center',
        flexDirection: 'row',
        gap: spacing.xs,
      }}
    >
      {Icon ? <Icon size={14} color={toneColor} strokeWidth={2.2} /> : null}
      <Text selectable={false} style={{ ...typography.caption, color: toneColor }}>
        {label}
      </Text>
    </View>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  const { colors, radii, spacing, typography } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        minWidth: 118,
        borderRadius: radii.sm,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bgSurface,
        padding: spacing.md,
        gap: spacing.sm,
      }}
    >
      <Icon size={18} color={colors.textSecondary} strokeWidth={2.1} />
      <View style={{ gap: spacing.xs }}>
        <Text selectable style={{ ...typography.label, color: colors.textPrimary }} numberOfLines={2}>
          {value}
        </Text>
        <Text selectable={false} style={{ ...typography.caption, color: colors.textSecondary }}>
          {label}
        </Text>
      </View>
    </View>
  );
}

function SectionHeader({
  title,
  count,
  icon: Icon,
}: {
  title: string;
  count?: number;
  icon: LucideIcon;
}) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Icon size={18} color={colors.textSecondary} strokeWidth={2.1} />
        <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
          {title}
        </Text>
      </View>
      {typeof count === 'number' ? <Pill label={String(count)} tone="neutral" /> : null}
    </View>
  );
}

function CompactRow({
  title,
  meta,
  trailing,
}: {
  title: string;
  meta?: string | null;
  trailing?: React.ReactNode;
}) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text selectable style={{ ...typography.bodyMed, color: colors.textPrimary }} numberOfLines={2}>
          {title}
        </Text>
        {meta ? (
          <Text selectable style={{ ...typography.caption, color: colors.textSecondary }} numberOfLines={2}>
            {meta}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
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
  const isImageSignature = value.startsWith('data:image/');

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
        {isImageSignature ? (
          <NativeImage source={{ uri: value }} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
        ) : (
          <Svg width="100%" height="100%" viewBox="0 0 1000 400">
            <Line x1={48} x2={952} y1={324} y2={324} stroke={colors.divider} strokeWidth={3} />
            <Path d={value} fill="none" stroke={colors.textPrimary} strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
          </Svg>
        )}
      </View>
    </View>
  );
}

export default function EntryDetailScreen() {
  const { colors, spacing, typography } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const entryId = firstParam(id);
  const detail = useEntryDetail(entryId);
  const exportEntry = useExportEntryPacket();
  const gearItems = useGearItems();
  const attachGear = useAttachGearToEntry();
  const removeGear = useRemoveGearFromEntry();
  const addAttachment = useAddEntryAttachment();
  const importHostedCompletion = useImportHostedRemoteSignatureCompletion();
  useAutoSyncHostedRemoteSignature(detail.data);
  const [isPdfPending, setIsPdfPending] = React.useState(false);
  const [isHostedSharePending, setIsHostedSharePending] = React.useState(false);
  const [hostedImportFailed, setHostedImportFailed] = React.useState(false);
  const [pdfFailed, setPdfFailed] = React.useState(false);
  const entry = detail.data?.entry;
  const signature = detail.data?.signature;
  const remoteRequest = detail.data?.remote_request;
  const gearUsage = detail.data?.gear_usage ?? [];
  const attachments = detail.data?.attachments ?? [];
  const assignedGearIds = new Set(gearUsage.map(({ gear }) => gear.id));
  const attachableGear = (gearItems.data ?? [])
    .filter(({ item, status }) => !assignedGearIds.has(item.id) && status !== 'retired')
    .slice(0, 6);
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

  const dateLabel = formatDateRange(entry.date_from, entry.date_to);

  async function shareEntryPacket() {
    if (!entryId) return;
    const packet = await exportEntry.mutateAsync(entryId);
    await Share.share({
      title: 'RALB entry audit packet',
      message: JSON.stringify(packet, null, 2),
    });
  }

  async function shareEntryPdf() {
    if (!entryId) return;
    setIsPdfPending(true);
    setPdfFailed(false);
    try {
      const packet = await exportEntry.mutateAsync(entryId);
      const { uri } = await Print.printToFileAsync({ html: buildEntryPdfHtml(packet) });
      const fileName = buildEntryExportFileName(packet, 'pdf');
      const namedUri = FileSystem.cacheDirectory ? `${FileSystem.cacheDirectory}${fileName}` : uri;

      if (namedUri !== uri) {
        await FileSystem.deleteAsync(namedUri, { idempotent: true });
        await FileSystem.copyAsync({ from: uri, to: namedUri });
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(namedUri, {
          dialogTitle: 'Share RALB entry PDF',
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
        });
      } else {
        await Share.share({
          title: 'RALB entry PDF',
          message: namedUri,
        });
      }
    } catch {
      setPdfFailed(true);
    } finally {
      setIsPdfPending(false);
    }
  }

  async function shareVerifierRequest() {
    if (!remoteRequest || !entry || !detail.data) return;
    setIsHostedSharePending(true);
    let verifierLink = buildVerifierLink(remoteRequest);
    try {
      const hosted = await syncHostedRemoteSigningRequest(detail.data);
      if (hosted.ok) {
        verifierLink = hosted.verifierUrl;
      }
    } catch {
      verifierLink = buildVerifierLink(remoteRequest);
    } finally {
      setIsHostedSharePending(false);
    }
    const title = 'RALB remote signature request';
    const message = [
      `Please review and sign this RALB work entry for ${entry.site}.`,
      `Request code: ${remoteRequest.request_code}`,
      `Expires: ${remoteRequest.expires_at ? formatDate(remoteRequest.expires_at) : 'not set'}`,
    ].join('\n');

    await Share.share(
      Platform.OS === 'ios'
        ? { title, message, url: verifierLink }
        : { title, message: `${message}\nVerifier link: ${verifierLink}` },
      Platform.OS === 'ios' ? { subject: title } : undefined,
    );
  }

  async function syncHostedCompletion() {
    if (!remoteRequest) return;
    setHostedImportFailed(false);
    try {
      const result = await importHostedCompletion.mutateAsync(remoteRequest);
      if (!result.imported && result.reason === 'import_failed') {
        setHostedImportFailed(true);
      }
    } catch {
      setHostedImportFailed(true);
    }
  }

  async function addPhotoEvidence() {
    if (!entryId || entry?.status !== 'draft') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
    });
    if (result.canceled || !result.assets.length) return;
    const asset = result.assets[0];
    addAttachment.mutate({
      entry_id: entryId,
      label: asset.fileName || 'Evidence photo',
      uri: asset.uri,
      mime_type: asset.mimeType ?? 'image/jpeg',
    });
  }

  const footer = (
    <View style={{ gap: spacing.sm }}>
      {entry.status === 'draft' && !remoteRequest ? (
        <View style={{ gap: spacing.sm }}>
          {readiness && !readiness.ready ? (
            <RequirementList title="Before signing or requesting" items={readiness.missingFields} />
          ) : null}
          <Button
            title={readiness?.ready ? 'Edit draft' : 'Finish draft'}
            icon={PenLine}
            onPress={() => router.push(`/entry/${entry.id}/edit`)}
          />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button
              title="Sign"
              icon={PenLine}
              variant="secondary"
              onPress={() => router.push(`/entry/${entry.id}/sign`)}
              disabled={!readiness?.ready}
              style={{ flex: 1 }}
            />
            <Button
              title="Request"
              icon={Send}
              variant="secondary"
              onPress={() => router.push(`/entry/${entry.id}/request-signature`)}
              disabled={!readiness?.ready}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      ) : null}

      {remoteRequest ? (
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button
              title={isHostedSharePending ? 'Syncing' : 'Share'}
              icon={Share2}
              onPress={shareVerifierRequest}
              disabled={isHostedSharePending || importHostedCompletion.isPending}
              style={{ flex: 1 }}
            />
            <Button
              title={importHostedCompletion.isPending ? 'Syncing' : 'Sync'}
              icon={RefreshCw}
              variant="secondary"
              onPress={syncHostedCompletion}
              disabled={isHostedSharePending || importHostedCompletion.isPending}
              style={{ flex: 1 }}
            />
            <Button
              title="Preview"
              icon={Eye}
              variant="secondary"
              onPress={() => router.push(`/verify/${remoteRequest.request_code}?token=${encodeURIComponent(buildRemoteSigningToken(remoteRequest))}`)}
              disabled={isHostedSharePending || importHostedCompletion.isPending}
              style={{ flex: 1 }}
            />
          </View>
          {hostedImportFailed ? (
            <Text selectable style={{ ...typography.caption, color: colors.statusErr }}>
              Hosted signature sync failed. Check the connection and try again.
            </Text>
          ) : null}
        </View>
      ) : null}

      {entry.status === 'signed' || entry.status === 'amended' ? (
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button
              title={isPdfPending ? 'PDF' : 'PDF'}
              icon={FileText}
              onPress={shareEntryPdf}
              disabled={exportEntry.isPending || isPdfPending}
              loading={isPdfPending}
              style={{ flex: 1 }}
            />
            <Button
              title="Audit packet"
              icon={FileJson}
              onPress={shareEntryPacket}
              variant="secondary"
              disabled={exportEntry.isPending || isPdfPending}
              style={{ flex: 1 }}
            />
          </View>
          {entry.status === 'signed' ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                title="Records"
                icon={BookOpen}
                variant="secondary"
                onPress={() => router.replace('/records')}
                style={{ flex: 1 }}
              />
              <Button
                title="Amend"
                icon={PenLine}
                variant="ghost"
                onPress={() => router.push(`/entry/${entry.id}/amend`)}
                style={{ flex: 1 }}
              />
            </View>
          ) : (
            <Button
              title="Records"
              icon={BookOpen}
              variant="secondary"
              onPress={() => router.replace('/records')}
            />
          )}
        </View>
      ) : null}
    </View>
  );
  const maxHeightLabel = !entry.max_height || entry.max_height <= 0
    ? '-'
    : `${entry.max_height.toFixed(0)} ${entry.height_unit}`;
  const employerClient = [entry.employer, entry.client].filter(Boolean).join(' - ') || 'No employer/client';

  return (
    <Screen footer={footer}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md }}>
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Pill label={statusLabel(entry.status)} icon={ShieldCheck} tone={statusTone(entry.status)} />
            <Text selectable style={{ ...typography.title1, color: colors.textPrimary }}>
              {entry.site}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <BriefcaseBusiness size={15} color={colors.textSecondary} strokeWidth={2.1} />
              <Text selectable style={{ ...typography.body, color: colors.textSecondary, flex: 1 }} numberOfLines={2}>
                {employerClient}
              </Text>
            </View>
          </View>
          <MapPin size={28} color={colors.accentPrimary} strokeWidth={2.1} />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <MiniStat label="Date" value={dateLabel} icon={CalendarDays} />
          <MiniStat label="Hours" value={entry.work_hours.toFixed(1)} icon={Clock3} />
          <MiniStat label="Height" value={maxHeightLabel} icon={Ruler} />
        </View>
      </Card>

      <Card>
        <SectionHeader title="Work" icon={Building2} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {entry.work_task ? <Pill label={entry.work_task} icon={BriefcaseBusiness} tone="neutral" /> : null}
          {entry.access_method ? <Pill label={entry.access_method} icon={ShieldCheck} tone="neutral" /> : null}
          {entry.structure_type ? <Pill label={entry.structure_type} icon={Building2} tone="neutral" /> : null}
          {entry.sprat_level_snapshot ? <Pill label={`SPRAT ${entry.sprat_level_snapshot}`} tone="info" /> : null}
          {entry.irata_level_snapshot ? <Pill label={`IRATA ${entry.irata_level_snapshot}`} tone="info" /> : null}
        </View>
        {entry.description ? (
          <Text selectable style={{ ...typography.body, color: colors.textPrimary }}>
            {entry.description}
          </Text>
        ) : null}
        {readiness && !readiness.ready ? (
          <Pill label={`Needs ${readiness.missingFields.length} fields`} icon={BadgeCheck} tone="warn" />
        ) : null}
        {entry.amends_entry_id ? <StatRow label="Amends" value={entry.amends_entry_id.slice(0, 18)} /> : null}
      </Card>

      <Card>
        <SectionHeader title="Gear" count={gearUsage.length} icon={HardHat} />
        {gearUsage.length ? (
          gearUsage.map(({ gear, usage }) => (
            <CompactRow
              key={gear.id}
              title={gear.name}
              meta={[gear.category, gear.serial_number, usage.role].filter(Boolean).join(' - ')}
              trailing={entry.status === 'draft' ? (
                <Button
                  title="Remove"
                  icon={Trash2}
                  variant="ghost"
                  onPress={() => removeGear.mutate({ entry_id: entry.id, gear_id: gear.id })}
                  disabled={removeGear.isPending}
                />
              ) : null}
            />
          ))
        ) : (
          <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
            None
          </Text>
        )}
        {entry.status === 'draft' && attachableGear.length ? (
          <View style={{ gap: spacing.sm }}>
            <Text selectable style={{ ...typography.label, color: colors.textPrimary }}>
              Attach active gear
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {attachableGear.map(({ item }) => (
                <Button
                  key={item.id}
                  title={item.name}
                  icon={Plus}
                  variant="secondary"
                  onPress={() => attachGear.mutate({ entry_id: entry.id, gear_id: item.id, role: item.category })}
                  disabled={attachGear.isPending}
                  style={{ minWidth: 132 }}
                />
              ))}
            </View>
          </View>
        ) : null}
      </Card>

      <Card>
        <SectionHeader title="Evidence" count={attachments.length} icon={Image} />
        {attachments.length ? (
          attachments.map((attachment) => (
            <CompactRow
              key={attachment.id}
              title={attachment.label}
              meta={attachment.mime_type ?? attachment.uri}
            />
          ))
        ) : (
          <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
            None
          </Text>
        )}
        {entry.status === 'draft' ? (
          <Button
            title={addAttachment.isPending ? 'Attaching' : 'Attach from photos'}
            icon={Camera}
            variant="secondary"
            onPress={addPhotoEvidence}
            disabled={addAttachment.isPending}
          />
        ) : null}
      </Card>

      <Card>
        <SectionHeader title="Verification" icon={Hash} />
        {signature ? (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <Pill label={signature.method} icon={BadgeCheck} tone="ok" />
              <Pill label={formatDate(signature.signed_at)} icon={CalendarDays} tone="neutral" />
            </View>
            <CompactRow
              title={signature.supervisor_name}
              meta={signature.supervisor_cert_number}
              trailing={<UserRound size={20} color={colors.textSecondary} strokeWidth={2.1} />}
            />
            {signature.signature_path ? <SignaturePreview value={signature.signature_path} /> : null}
            <View style={{ gap: spacing.xs }}>
              <Text selectable style={{ ...typography.label, color: colors.textPrimary }}>
                Entry hash
              </Text>
              <HashPreview value={signature.entry_hash} />
            </View>
            {signature.chain_hash ? (
              <View style={{ gap: spacing.xs }}>
                <Text selectable style={{ ...typography.label, color: colors.textPrimary }}>
                  Chain hash
                </Text>
                <HashPreview value={signature.chain_hash} />
              </View>
            ) : null}
          </>
        ) : remoteRequest ? (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <Pill label={statusLabel(remoteRequest.status)} icon={Send} tone="warn" />
              <Pill label={remoteRequest.request_code} tone="neutral" />
            </View>
            <CompactRow
              title={remoteRequest.recipient_name}
              meta={[remoteRequest.verifier_role, remoteRequest.verifier_company].filter(Boolean).join(' - ') || remoteRequest.recipient_contact}
              trailing={<UserRound size={20} color={colors.textSecondary} strokeWidth={2.1} />}
            />
            <StatRow label="Expires" value={formatDateOrDash(remoteRequest.expires_at)} />
            <View style={{ gap: spacing.xs }}>
              <Text selectable style={{ ...typography.label, color: colors.textPrimary }}>
                Requested entry hash
              </Text>
              <HashPreview value={remoteRequest.entry_hash} />
            </View>
          </>
        ) : (
          <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
            Unsigned
          </Text>
        )}
      </Card>

      {exportEntry.isError || pdfFailed ? (
        <Text selectable style={{ ...typography.caption, color: colors.statusErr }}>
          Entry export failed.
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
          <BadgeCheck size={14} color={colors.statusWarn} strokeWidth={2.2} />
          <Text selectable={false} style={{ ...typography.caption, color: colors.statusWarn, flex: 1 }}>
            Add {item}
          </Text>
        </View>
      ))}
    </View>
  );
}
