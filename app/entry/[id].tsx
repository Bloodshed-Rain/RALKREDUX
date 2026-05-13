import React from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import * as Print from 'expo-print';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import {
  BookOpen,
  Camera,
  Eye,
  FileJson,
  FileText,
  PenLine,
  Plus,
  RefreshCw,
  Send,
  Share2,
  Trash2,
} from 'lucide-react-native';
import { Alert, Image as NativeImage, Platform, Pressable, Share, Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { syncHostedRemoteSigningRequest } from '@/src/cloud/supabase/remote-signing';
import {
  useAutoSyncHostedRemoteSignature,
  useImportHostedRemoteSignatureCompletion,
} from '@/src/cloud/supabase/use-remote-signing-sync';
import { formatDate, formatDateOrDash, formatDateRange } from '@/src/domain/date-format';
import { useGearItems } from '@/src/domain/gear/use-gear';
import { ENTRY_HASH_VERSION } from '@/src/domain/logbook/entry-hash';
import { getEntryVerificationReadiness } from '@/src/domain/logbook/entry-readiness';
import { deriveEntryStamps, type StampKind } from '@/src/domain/logbook/entry-stamps';
import { buildEntryExportFileName, buildEntryPdfHtml } from '@/src/domain/logbook/export';
import { buildRemoteSigningToken, buildRemoteSigningUrl } from '@/src/domain/logbook/logbook-service';
import {
  useAddEntryAttachment,
  useAttachGearToEntry,
  useEntryChainValid,
  useEntryDetail,
  useExportEntryPacket,
  useRemoveGearFromEntry,
} from '@/src/domain/logbook/use-logbook';
import {
  AnimatedStamp,
  Chip,
  DocActionButton,
  DocBand,
  Screen,
  SectionH,
  SignatureFill,
  Stamp,
} from '@/src/ui/primitives';
import type { StampTone } from '@/src/ui/primitives';
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

const STAMP_TONE: Record<StampKind, StampTone> = {
  DRAFT: 'yellow',
  PENDING: 'yellow',
  AMENDED: 'ink',
  CHAIN_OK: 'green',
  SYNCED: 'ink',
};

const STAMP_LABEL: Record<StampKind, string> = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  AMENDED: 'AMENDED',
  CHAIN_OK: 'CHAIN OK',
  SYNCED: 'SYNCED',
};

const LEAD_STAMP_PRIORITY: StampKind[] = ['AMENDED', 'DRAFT', 'CHAIN_OK', 'PENDING', 'SYNCED'];

function pickLeadStamp(stamps: StampKind[]): StampKind | null {
  for (const kind of LEAD_STAMP_PRIORITY) {
    if (stamps.includes(kind)) return kind;
  }
  return null;
}

function truncateChainHash(value: string): string {
  if (value.length <= 14) return value.toUpperCase();
  return `${value.slice(0, 8)}…${value.slice(-4)}`.toUpperCase();
}

export default function EntryDetailScreen() {
  const { spacing, typography, tidewater, hairlines } = useTheme();
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
  const chainValid = useEntryChainValid(entry, signature);
  const stamps = entry
    ? deriveEntryStamps({
        entry,
        signature: signature ?? null,
        remote_request: remoteRequest ?? null,
        chain_valid: chainValid.data ?? false,
      })
    : [];
  const leadStamp = pickLeadStamp(stamps);
  const supportingStamps = leadStamp ? stamps.filter((s) => s !== leadStamp) : stamps;
  const isSignedWithoutChainOk =
    Boolean(signature) && chainValid.data === false && stamps.indexOf('CHAIN_OK') === -1;
  const hashDrift =
    signature && signature.hash_version !== ENTRY_HASH_VERSION
      ? { signed: signature.hash_version, running: ENTRY_HASH_VERSION }
      : null;
  const chainHashLabel = signature?.chain_hash
    ? `CHAIN ${truncateChainHash(signature.chain_hash)}`
    : 'CHAIN PENDING';

  if (detail.isLoading) {
    return (
      <Screen>
        <Text selectable style={{ ...typography.body, color: tidewater.ink }}>
          Loading entry
        </Text>
      </Screen>
    );
  }

  if (!entry) {
    return (
      <Screen padded={false} weave>
        <DocBand variant="top" formId="CH.7 - ENTRY RECORD" rev="MISSING" rightLabel="404" />
        <View style={{ padding: spacing.base, gap: spacing.md }}>
          <Text selectable style={{ ...typography.displayMd, color: tidewater.ink }}>
            Entry not found
          </Text>
          <DocActionButton
            title="BACK TO RECORDS"
            icon={BookOpen}
            variant="secondary"
            onPress={() => router.replace('/records')}
          />
        </View>
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

  const isDraft = entry.status === 'draft';
  const isReady = readiness?.ready === true;
  const maxHeightLabel = !entry.max_height || entry.max_height <= 0
    ? '—'
    : `${entry.max_height.toFixed(0)} ${entry.height_unit}`;
  const employerClient = [entry.employer, entry.client].filter(Boolean).join(' · ') || 'No employer / client';

  const footer = (
    <View style={{ gap: spacing.sm }}>
      {isDraft && !remoteRequest ? (
        <View style={{ gap: spacing.sm }}>
          <DocActionButton
            title={isReady ? 'EDIT DRAFT' : 'FINISH DRAFT'}
            icon={PenLine}
            onPress={() => router.push(`/entry/${entry.id}/edit`)}
          />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <DocActionButton
              title="SIGN"
              icon={PenLine}
              variant="secondary"
              onPress={() => router.push(`/entry/${entry.id}/sign`)}
              disabled={!isReady}
              style={{ flex: 1 }}
            />
            <DocActionButton
              title="REQUEST"
              icon={Send}
              variant="secondary"
              onPress={() => router.push(`/entry/${entry.id}/request-signature`)}
              disabled={!isReady}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      ) : null}

      {remoteRequest ? (
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <DocActionButton
              title={isHostedSharePending ? 'SYNCING' : 'SHARE'}
              icon={Share2}
              onPress={shareVerifierRequest}
              disabled={isHostedSharePending || importHostedCompletion.isPending}
              style={{ flex: 1 }}
            />
            <DocActionButton
              title={importHostedCompletion.isPending ? 'SYNCING' : 'SYNC'}
              icon={RefreshCw}
              variant="secondary"
              onPress={syncHostedCompletion}
              disabled={isHostedSharePending || importHostedCompletion.isPending}
              style={{ flex: 1 }}
            />
            <DocActionButton
              title="PREVIEW"
              icon={Eye}
              variant="secondary"
              onPress={() =>
                router.push(
                  `/verify/${remoteRequest.request_code}?token=${encodeURIComponent(buildRemoteSigningToken(remoteRequest))}`,
                )
              }
              disabled={isHostedSharePending || importHostedCompletion.isPending}
              style={{ flex: 1 }}
            />
          </View>
          {hostedImportFailed ? (
            <Text selectable style={{ ...typography.monoSm, color: tidewater.red }}>
              Hosted signature sync failed. Check the connection and try again.
            </Text>
          ) : null}
        </View>
      ) : null}

      {entry.status === 'signed' || entry.status === 'amended' ? (
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <DocActionButton
              title="PDF"
              icon={FileText}
              onPress={shareEntryPdf}
              disabled={exportEntry.isPending || isPdfPending}
              loading={isPdfPending}
              style={{ flex: 1 }}
            />
            <DocActionButton
              title="AUDIT PACKET"
              icon={FileJson}
              onPress={shareEntryPacket}
              variant="secondary"
              disabled={exportEntry.isPending || isPdfPending}
              style={{ flex: 1 }}
            />
          </View>
          {entry.status === 'signed' ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <DocActionButton
                title="RECORDS"
                icon={BookOpen}
                variant="secondary"
                onPress={() => router.replace('/records')}
                style={{ flex: 1 }}
              />
              <DocActionButton
                title="AMEND"
                icon={PenLine}
                variant="ghost"
                onPress={() => router.push(`/entry/${entry.id}/amend`)}
                style={{ flex: 1 }}
              />
            </View>
          ) : (
            <DocActionButton
              title="RECORDS"
              icon={BookOpen}
              variant="secondary"
              onPress={() => router.replace('/records')}
            />
          )}
        </View>
      ) : null}
    </View>
  );

  return (
    <Screen padded={false} weave footer={footer}>
      <DocBand
        variant="top"
        formId="CH.7 - ENTRY RECORD"
        rev={entry.status === 'draft' ? 'DRAFT' : entry.status === 'amended' ? 'AMENDED' : 'LOCKED'}
        effective={`ENTRY-HASH v${ENTRY_HASH_VERSION}`}
        rightLabel={isDraft ? (isReady ? 'READY' : 'PENDING') : 'SEALED'}
      />

      <View style={{ paddingHorizontal: spacing.base, gap: spacing.lg, paddingTop: spacing.base }}>
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
                LOGGED ENTRY
              </Text>
              <Text selectable style={{ ...typography.displayMd, color: tidewater.ink }} numberOfLines={2}>
                {entry.site}
              </Text>
              <Text selectable style={{ ...typography.monoSm, color: tidewater.ink2 }} numberOfLines={2}>
                {employerClient}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              {leadStamp ? (
                <AnimatedStamp
                  tone={STAMP_TONE[leadStamp]}
                  rotation="light"
                  slamKey={`entry:${entry.id}:${leadStamp}`}
                >
                  {STAMP_LABEL[leadStamp]}
                </AnimatedStamp>
              ) : isSignedWithoutChainOk ? (
                <AnimatedStamp tone="red" rotation="light" slamKey={`entry:${entry.id}:UNVERIFIED`}>
                  UNVERIFIED
                </AnimatedStamp>
              ) : null}
              {supportingStamps.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' }}>
                  {supportingStamps.map((kind) => (
                    <Stamp key={kind} tone={STAMP_TONE[kind]} rotation="heavy">
                      {STAMP_LABEL[kind]}
                    </Stamp>
                  ))}
                </View>
              ) : null}
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, padding: spacing.md }}>
            <Chip tone="ink">{dateLabel.toUpperCase()}</Chip>
            <Chip tone="mute">{`${entry.work_hours.toFixed(1)} HR`}</Chip>
            <Chip tone="mute">{`HEIGHT ${maxHeightLabel}`}</Chip>
            {isDraft && readiness && !isReady ? (
              <Chip tone="yellow">{`${readiness.missingFields.length} MISSING`}</Chip>
            ) : null}
            {isDraft && isReady ? <Chip tone="green">READY</Chip> : null}
            {hashDrift ? (
              <Chip tone="yellow">{`SIGNED UNDER v${hashDrift.signed} · RUNNING v${hashDrift.running}`}</Chip>
            ) : null}
          </View>
        </View>

        {/* Work */}
        <View>
          <SectionH n="01" right={entry.amends_entry_id ? 'AMENDMENT' : undefined}>
            Work
          </SectionH>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm }}>
            {entry.work_task ? <Chip tone="ink">{entry.work_task.toUpperCase()}</Chip> : null}
            {entry.access_method ? <Chip tone="mute">{entry.access_method.toUpperCase()}</Chip> : null}
            {entry.structure_type ? <Chip tone="mute">{entry.structure_type.toUpperCase()}</Chip> : null}
            {entry.sprat_level_snapshot ? <Chip tone="green">{`SPRAT ${entry.sprat_level_snapshot}`}</Chip> : null}
            {entry.irata_level_snapshot ? <Chip tone="green">{`IRATA ${entry.irata_level_snapshot}`}</Chip> : null}
          </View>
          {entry.description ? (
            <View
              style={{
                borderWidth: 1.5,
                borderColor: tidewater.hairSoft,
                backgroundColor: tidewater.white,
                padding: spacing.sm,
              }}
            >
              <Text selectable style={{ ...typography.body, color: tidewater.ink }}>
                {entry.description}
              </Text>
            </View>
          ) : null}
          {entry.amends_entry_id ? (
            <DocRow label="AMENDS" value={entry.amends_entry_id.slice(0, 18)} />
          ) : null}
        </View>

        {/* Gear */}
        <View>
          <SectionH n="02" right={`${gearUsage.length} ITEM${gearUsage.length === 1 ? '' : 'S'}`}>
            Gear
          </SectionH>
          {gearUsage.length ? (
            <View style={{ borderWidth: 1.5, borderColor: tidewater.hairSoft, backgroundColor: tidewater.white }}>
              {gearUsage.map(({ gear, usage }, index) => (
                <View
                  key={gear.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs + 2,
                    borderBottomWidth: index < gearUsage.length - 1 ? 1 : 0,
                    borderBottomColor: tidewater.hairFaint,
                    gap: spacing.sm,
                  }}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text selectable style={{ ...typography.bodyMed, color: tidewater.ink }} numberOfLines={1}>
                      {gear.name}
                    </Text>
                    <Text selectable style={{ ...typography.monoSm, color: tidewater.ink3 }} numberOfLines={1}>
                      {[gear.category, gear.serial_number, usage.role].filter(Boolean).join(' · ') || '—'}
                    </Text>
                  </View>
                  {isDraft ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        Alert.alert(
                          'Detach gear?',
                          `Remove ${gear.name} from this draft entry. You can re-attach it before signing.`,
                          [
                            { text: 'Keep attached', style: 'cancel' },
                            {
                              text: 'Detach',
                              style: 'destructive',
                              onPress: () =>
                                removeGear.mutate({ entry_id: entry.id, gear_id: gear.id }),
                            },
                          ],
                        );
                      }}
                      disabled={removeGear.isPending}
                      style={({ pressed }) => ({
                        padding: spacing.xs,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Trash2 size={18} color={tidewater.ink3} strokeWidth={2.2} />
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <EmptyLine>No gear attached</EmptyLine>
          )}
          {isDraft && attachableGear.length ? (
            <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
              <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.5 }}>
                ATTACH ACTIVE GEAR
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                {attachableGear.map(({ item }) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    onPress={() => attachGear.mutate({ entry_id: entry.id, gear_id: item.id, role: item.category })}
                    disabled={attachGear.isPending}
                    style={({ pressed }) => ({
                      borderWidth: 1.5,
                      borderColor: tidewater.hair,
                      backgroundColor: tidewater.white,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 6,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.xs,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Plus size={14} color={tidewater.ink} strokeWidth={2.2} />
                    <Text style={{ ...typography.displaySm, color: tidewater.ink, letterSpacing: 1.2 }}>
                      {item.name.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        {/* Evidence */}
        <View>
          <SectionH n="03" right={`${attachments.length} FILE${attachments.length === 1 ? '' : 'S'}`}>
            Evidence
          </SectionH>
          {attachments.length ? (
            <View style={{ borderWidth: 1.5, borderColor: tidewater.hairSoft, backgroundColor: tidewater.white }}>
              {attachments.map((attachment, index) => (
                <View
                  key={attachment.id}
                  style={{
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs + 2,
                    borderBottomWidth: index < attachments.length - 1 ? 1 : 0,
                    borderBottomColor: tidewater.hairFaint,
                    gap: 2,
                  }}
                >
                  <Text selectable style={{ ...typography.bodyMed, color: tidewater.ink }} numberOfLines={1}>
                    {attachment.label}
                  </Text>
                  <Text selectable style={{ ...typography.monoSm, color: tidewater.ink3 }} numberOfLines={1}>
                    {attachment.mime_type ?? attachment.uri}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <EmptyLine>No attachments</EmptyLine>
          )}
          {isDraft ? (
            <View style={{ marginTop: spacing.sm }}>
              <DocActionButton
                title={addAttachment.isPending ? 'ATTACHING' : 'ATTACH FROM PHOTOS'}
                icon={Camera}
                variant="secondary"
                onPress={addPhotoEvidence}
                disabled={addAttachment.isPending}
              />
            </View>
          ) : null}
        </View>

        {/* Verification */}
        <View>
          <SectionH
            n="04"
            right={signature ? 'SIGNED' : remoteRequest ? 'PENDING' : 'UNSIGNED'}
          >
            Verification
          </SectionH>
          {signature ? (
            <View
              style={{
                borderWidth: 1.5,
                borderColor: tidewater.hair,
                backgroundColor: tidewater.white,
              }}
            >
              <View
                style={{
                  padding: spacing.sm,
                  borderBottomWidth: 1,
                  borderBottomColor: tidewater.hairFaint,
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: spacing.xs,
                }}
              >
                <Chip tone="green" solid>
                  {signature.method.toUpperCase()}
                </Chip>
                <Chip tone="mute">{formatDate(signature.signed_at).toUpperCase()}</Chip>
              </View>
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
                <SignatureFill name={signature.supervisor_name} fontSize={22} />
              </View>
              {signature.supervisor_cert_number ? (
                <DocRow label="CERT" value={signature.supervisor_cert_number} />
              ) : null}
              {signature.signature_path ? (
                <View style={{ padding: spacing.sm, gap: spacing.xs }}>
                  <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.5 }}>
                    DRAWN SIGNATURE
                  </Text>
                  <SignatureFrame value={signature.signature_path} />
                </View>
              ) : null}
              <DocRow label="ENTRY HASH" value={truncateHash(signature.entry_hash)} mono />
              {signature.chain_hash ? (
                <DocRow label="CHAIN HASH" value={truncateHash(signature.chain_hash)} mono last />
              ) : null}
            </View>
          ) : remoteRequest ? (
            <View
              style={{
                borderWidth: 1.5,
                borderColor: tidewater.hair,
                backgroundColor: tidewater.white,
              }}
            >
              <View
                style={{
                  padding: spacing.sm,
                  borderBottomWidth: 1,
                  borderBottomColor: tidewater.hairFaint,
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: spacing.xs,
                }}
              >
                <Chip tone="yellow">{remoteRequest.status.toUpperCase()}</Chip>
                <Chip tone="ink">{remoteRequest.request_code}</Chip>
              </View>
              <DocRow label="VERIFIER" value={remoteRequest.recipient_name} />
              <DocRow
                label="CONTACT"
                value={
                  [remoteRequest.verifier_role, remoteRequest.verifier_company].filter(Boolean).join(' · ') ||
                  remoteRequest.recipient_contact ||
                  '—'
                }
              />
              <DocRow label="EXPIRES" value={formatDateOrDash(remoteRequest.expires_at)} />
              <DocRow label="ENTRY HASH" value={truncateHash(remoteRequest.entry_hash)} mono last />
            </View>
          ) : (
            <EmptyLine>Unsigned — sign locally or request a remote signature</EmptyLine>
          )}
        </View>

        {exportEntry.isError || pdfFailed ? (
          <Text selectable style={{ ...typography.monoSm, color: tidewater.red }}>
            Entry export failed.
          </Text>
        ) : null}
      </View>

      <DocBand
        variant="footer"
        text={
          isDraft
            ? isReady
              ? 'DRAFT READY - SIGN LOCALLY OR REQUEST REMOTE SIGNATURE'
              : 'DRAFT - COMPLETE REQUIRED FIELDS BEFORE SIGNING'
            : entry.status === 'amended'
              ? 'AMENDED RECORD - SEALED IN HASH CHAIN'
              : 'SIGNED RECORD - SEALED IN HASH CHAIN'
        }
        page={chainHashLabel}
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

function EmptyLine({ children }: { children: string }) {
  const { spacing, typography, tidewater } = useTheme();

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: tidewater.hairSoft,
        borderStyle: 'dashed',
        padding: spacing.md,
      }}
    >
      <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.2 }}>
        {children.toUpperCase()}
      </Text>
    </View>
  );
}

function SignatureFrame({ value }: { value: string }) {
  const { tidewater } = useTheme();
  const isImageSignature = value.startsWith('data:image/');

  return (
    <View
      style={{
        height: 112,
        borderWidth: 1.5,
        borderColor: tidewater.hair,
        backgroundColor: tidewater.white,
        overflow: 'hidden',
      }}
    >
      {isImageSignature ? (
        <NativeImage source={{ uri: value }} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
      ) : (
        <Svg width="100%" height="100%" viewBox="0 0 1000 400">
          <Line x1={48} x2={952} y1={324} y2={324} stroke={tidewater.hairSoft} strokeWidth={3} />
          <Path
            d={value}
            fill="none"
            stroke={tidewater.ink}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
          />
        </Svg>
      )}
    </View>
  );
}

