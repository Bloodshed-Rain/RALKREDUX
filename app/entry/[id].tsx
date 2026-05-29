import React from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { captureOrPickPhoto } from '@/src/ui/photo-picker';
import * as Linking from 'expo-linking';
import * as Print from 'expo-print';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { Alert, Image as NativeImage, Platform, Pressable, ScrollView, Share, Text, View, type ViewStyle, type TextStyle } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import {
  cancelHostedRemoteSigningRequest,
  syncHostedRemoteSigningRequest,
} from '@/src/cloud/supabase/remote-signing';
import {
  useAutoSyncHostedRemoteSignature,
  useImportHostedRemoteSignatureCompletion,
} from '@/src/cloud/supabase/use-remote-signing-sync';
import { formatDate, formatDateOrDash, formatDateRange } from '@/src/domain/date-format';
import { useGearItems } from '@/src/domain/gear/use-gear';
import { getEntryVerificationReadiness } from '@/src/domain/logbook/entry-readiness';
import { buildEntryExportFileName, buildEntryPdfHtml } from '@/src/domain/logbook/export';
import { buildRemoteSigningToken, buildRemoteSigningUrl } from '@/src/domain/logbook/logbook-service';
import { entryKindLabel, parseHazards, type LogbookEntry } from '@/src/domain/logbook/types';
import {
  useAddEntryAttachment,
  useAmendmentsOf,
  useAttachGearToEntry,
  useCancelRemoteSignatureRequest,
  useEntryChainValid,
  useEntryDetail,
  useExportEntryPacket,
  useRemoveGearFromEntry,
} from '@/src/domain/logbook/use-logbook';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import {
  Button,
  Card,
  ChainLink,
  IconBtn,
  Pill,
  SectionH,
  SigFill,
  StatusPill,
  TopBar,
  type ChainLinkItem,
} from '@/src/ui/primitives/v2';
import {
  GEAR_ICON,
  IconArrowLeft,
  IconCamera,
  IconExport,
  IconSync,
  IconVerified,
  IconWarn,
} from '@/src/ui/icons';
import { haptics } from '@/src/ui/haptics';

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
  return Linking.createURL(`/verify/${request.request_code}`, { queryParams: { token } });
}

export default function EntryDetailScreen() {
  const { tokens } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const entryId = firstParam(id);
  const detail = useEntryDetail(entryId);
  const amendments = useAmendmentsOf(entryId);
  const exportEntry = useExportEntryPacket();
  const gearItems = useGearItems();
  const attachGear = useAttachGearToEntry();
  const removeGear = useRemoveGearFromEntry();
  const addAttachment = useAddEntryAttachment();
  const cancelRemoteRequest = useCancelRemoteSignatureRequest();
  const importHostedCompletion = useImportHostedRemoteSignatureCompletion();
  useAutoSyncHostedRemoteSignature(detail.data);

  const [pdfPending, setPdfPending] = React.useState(false);
  const [hostedSharePending, setHostedSharePending] = React.useState(false);
  const [hostedImportFailed, setHostedImportFailed] = React.useState(false);
  const [hostedCancelFailed, setHostedCancelFailed] = React.useState(false);
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

  if (detail.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg, padding: 20 }}>
        <Text style={{ ...type.body, color: tokens.textDim }}>Loading entry…</Text>
      </View>
    );
  }

  if (!entry || !entryId) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg }}>
        <TopBar
          title="Entry"
          leading={
            <IconBtn
              icon={IconArrowLeft}
              label="Back"
              size="md"
              onPress={() => router.replace('/records')}
            />
          }
        />
        <View style={{ padding: 20, gap: 16 }}>
          <Text style={{ ...type.heroCardTitle, color: tokens.text }}>Entry not found</Text>
          <Button variant="primary" onPress={() => router.replace('/records')}>
            Back to records
          </Button>
        </View>
      </View>
    );
  }

  const isDraft = entry.status === 'draft';
  const isReady = readiness?.ready === true;
  const statusKey: 'draft' | 'signed' | 'amended' | 'pending' =
    entry.status === 'amended'
      ? 'amended'
      : entry.status === 'signed'
        ? 'signed'
        : entry.pending_signature_id
          ? 'pending'
          : 'draft';
  const dateLabel = formatDateRange(entry.date_from, entry.date_to);
  const dateKicker = dateLabel.toUpperCase();
  const maxHeightLabel =
    !entry.max_height || entry.max_height <= 0
      ? '—'
      : `${entry.max_height.toFixed(0)} ${entry.height_unit}`;

  async function shareEntryPacket() {
    if (!entryId) return;
    try {
      const packet = await exportEntry.mutateAsync(entryId);
      await Share.share({
        title: 'RALB entry audit packet',
        message: JSON.stringify(packet, null, 2),
      });
    } catch (err) {
      // A failed packet build (e.g. an evicted offline photo) previously threw
      // an unhandled rejection with no feedback — surface it instead.
      Alert.alert(
        'Could not build audit packet',
        err instanceof Error ? err.message : 'The audit packet could not be created. Please try again.',
      );
    }
  }

  async function shareEntryPdf() {
    if (!entryId) return;
    setPdfPending(true);
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
        await Share.share({ title: 'RALB entry PDF', message: namedUri });
      }
    } catch {
      setPdfFailed(true);
    } finally {
      setPdfPending(false);
    }
  }

  async function shareVerifierRequest() {
    if (!remoteRequest || !entry || !detail.data) return;
    setHostedSharePending(true);
    let verifierLink = buildVerifierLink(remoteRequest);
    try {
      const hosted = await syncHostedRemoteSigningRequest(detail.data);
      if (hosted.ok) verifierLink = hosted.verifierUrl;
    } catch {
      verifierLink = buildVerifierLink(remoteRequest);
    } finally {
      setHostedSharePending(false);
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
      if (!result.imported && result.reason === 'import_failed') setHostedImportFailed(true);
    } catch {
      setHostedImportFailed(true);
    }
  }

  async function addPhotoEvidence() {
    if (!entryId || !entry || entry.status !== 'draft') return;
    const photo = await captureOrPickPhoto();
    if (!photo) return;
    addAttachment.mutate({
      entry_id: entryId,
      label: photo.fileName || 'Evidence photo',
      uri: photo.uri,
      mime_type: photo.mimeType ?? 'image/jpeg',
    });
  }

  const chainLinks: ChainLinkItem[] = [];
  if (signature?.chain_hash) {
    if (signature.previous_chain_hash) {
      chainLinks.push({
        hash: signature.previous_chain_hash,
        label: 'Previous link',
        dim: true,
      });
    }
    chainLinks.push({
      hash: signature.chain_hash,
      label: `${entry.site} · sealed ${formatDate(signature.signed_at)}`,
      head: true,
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <TopBar
        title={`Entry ${shortEntryRef(entry.id)}`}
        leading={
          <IconBtn
            icon={IconArrowLeft}
            label="Back"
            size="md"
            onPress={() => router.back()}
          />
        }
        trailing={
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <IconBtn
              icon={IconExport}
              label="Export PDF"
              size="md"
              onPress={shareEntryPdf}
              disabled={pdfPending || exportEntry.isPending}
            />
          </View>
        }
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, gap: 14 }}>
          {/* HERO */}
          <Card padding={18}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>{dateKicker}</Text>
                <Text
                  style={{ ...type.heroCardTitle, color: tokens.text }}
                  numberOfLines={2}
                  selectable
                >
                  {entry.site || 'Untitled entry'}
                </Text>
                <Text
                  style={{ ...type.cardSub, color: tokens.textDim }}
                  numberOfLines={2}
                  selectable
                >
                  {[entry.client, entry.work_task].filter(Boolean).join(' · ') || '—'}
                </Text>
              </View>
              <View style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <StatusPill status={statusKey} size="md" />
                <Pill tone={entry.entry_kind === 'work' ? 'chip' : 'accent'} size="sm">
                  {entryKindLabel(entry.entry_kind)}
                </Pill>
              </View>
            </View>

            <EntryLineage entry={entry} amendments={amendments.data ?? []} />

            <View style={{ height: 1, backgroundColor: tokens.lineSoft, marginVertical: 16 }} />

            <View style={{ flexDirection: 'row', gap: 14 }}>
              <DetailStat label="Hours" value={entry.work_hours.toFixed(1)} />
              <DetailStat label="Height" value={maxHeightLabel} />
              <DetailStat label="Access" value={entry.access_method || '—'} />
            </View>

            {isDraft && readiness && !isReady ? (
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
                <Pill tone="warn" size="sm">
                  {`${readiness.missingFields.length} missing`}
                </Pill>
              </View>
            ) : null}
            {chainValid.data === false && signature ? (
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
                <Pill tone="danger" size="sm">Chain mismatch</Pill>
              </View>
            ) : null}
          </Card>

          {/* WORK */}
          {entry.description ? (
            <Card padding={16}>
              <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 8 }}>
                WORK DESCRIPTION
              </Text>
              <Text style={{ ...type.body, color: tokens.text }} selectable>
                {entry.description}
              </Text>
            </Card>
          ) : null}

          {/* SAFETY — surfaces v3 rescue cover + hazards together so an
              auditor opening the entry sees both at a glance. Card only
              renders when at least one of the two is recorded. */}
          {(() => {
            const hazardsList = parseHazards(entry.hazards);
            const rescue = entry.rescue_cover?.trim() ?? '';
            if (!rescue && hazardsList.length === 0) return null;
            return (
              <Card padding={16}>
                <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 8 }}>
                  SAFETY CONTEXT
                </Text>
                {rescue ? (
                  <View style={{ marginBottom: hazardsList.length > 0 ? 10 : 0 }}>
                    <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 2 }}>
                      RESCUE COVER
                    </Text>
                    <Text selectable style={{ ...type.body, color: tokens.text }}>
                      {rescue}
                    </Text>
                  </View>
                ) : null}
                {hazardsList.length > 0 ? (
                  <View>
                    <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 6 }}>
                      HAZARDS
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {hazardsList.map((h) => (
                        <Pill key={h} tone="warn" size="sm">
                          {h}
                        </Pill>
                      ))}
                    </View>
                  </View>
                ) : null}
              </Card>
            );
          })()}

          {/* GEAR */}
          {gearUsage.length > 0 || (isDraft && attachableGear.length > 0) ? (
            <Card padding={16}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>GEAR USED</Text>
                <Text style={{ ...type.monoSm, color: tokens.textDim }}>
                  {`${gearUsage.length} ${gearUsage.length === 1 ? 'item' : 'items'}`}
                </Text>
              </View>
              {gearUsage.length ? (
                <View style={{ gap: 8 }}>
                  {gearUsage.map(({ gear, usage }) => {
                    const Icon = GEAR_ICON[gear.category];
                    return (
                      <View
                        key={gear.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            backgroundColor: tokens.surface2,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Icon size={21} color={tokens.text} fill={tokens.accent} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{ ...type.cardTitle, color: tokens.text }}
                            numberOfLines={1}
                          >
                            {gear.name}
                          </Text>
                          <Text style={{ ...type.monoSm, color: tokens.textDim }} numberOfLines={1}>
                            {[gear.manufacturer, gear.serial_number, usage.role]
                              .filter(Boolean)
                              .join(' · ') || gear.category}
                          </Text>
                        </View>
                        {isDraft ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Detach ${gear.name}`}
                            onPress={() => {
                              haptics.warning();
                              Alert.alert(
                                'Detach gear?',
                                `Remove ${gear.name} from this draft entry.`,
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
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            style={({ pressed }) => ({
                              padding: 6,
                              opacity: pressed ? 0.6 : 1,
                            })}
                          >
                            <Text style={{ ...type.monoSm, color: tokens.textDim }}>Detach</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ) : null}
              {isDraft && attachableGear.length ? (
                <View style={{ marginTop: 12, gap: 6 }}>
                  <Text style={{ ...type.monoSm, color: tokens.textFaint }}>ATTACH ACTIVE GEAR</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {attachableGear.map(({ item }) => (
                      <Pressable
                        key={item.id}
                        accessibilityRole="button"
                        onPress={() => {
                          haptics.selection();
                          attachGear.mutate({
                            entry_id: entry.id,
                            gear_id: item.id,
                            role: item.category,
                          });
                        }}
                        disabled={attachGear.isPending}
                        style={({ pressed }) => ({
                          paddingVertical: 6,
                          paddingHorizontal: 11,
                          borderRadius: 999,
                          backgroundColor: tokens.surface2,
                          borderWidth: 1,
                          borderColor: tokens.lineSoft,
                          opacity: pressed ? 0.7 : 1,
                        })}
                      >
                        <Text style={{ ...type.cardSub, color: tokens.text }}>+ {item.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
            </Card>
          ) : null}

          {/* EVIDENCE */}
          {attachments.length > 0 || isDraft ? (
            <Card padding={16}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>EVIDENCE</Text>
                <Text style={{ ...type.monoSm, color: tokens.textDim }}>
                  {`${attachments.length} ${attachments.length === 1 ? 'file' : 'files'}`}
                </Text>
              </View>
              {attachments.length ? (
                <View style={{ gap: 6 }}>
                  {attachments.map((att) => (
                    <View
                      key={att.id}
                      style={{
                        flexDirection: 'row',
                        gap: 12,
                        alignItems: 'center',
                      }}
                    >
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          backgroundColor: tokens.surface2,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <IconCamera size={21} color={tokens.text} fill={tokens.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ ...type.cardTitle, color: tokens.text }} numberOfLines={1}>
                          {att.label}
                        </Text>
                        <Text style={{ ...type.monoSm, color: tokens.textDim }} numberOfLines={1}>
                          {att.mime_type ?? att.uri}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={{ ...type.cardSub, color: tokens.textDim }}>
                  No photos attached yet.
                </Text>
              )}
              {isDraft ? (
                <View style={{ marginTop: 12 }}>
                  <Button
                    variant="outline"
                    onPress={addPhotoEvidence}
                    disabled={addAttachment.isPending}
                    icon={IconCamera}
                  >
                    {addAttachment.isPending ? 'Attaching…' : 'Attach from photos'}
                  </Button>
                </View>
              ) : null}
            </Card>
          ) : null}

          {/* SIGNATURE BLOCK */}
          <SignatureBlock
            isDraft={isDraft}
            isReady={isReady}
            entryId={entry.id}
            signature={signature ?? null}
            chainValid={chainValid.data}
          />

          {/* REMOTE REQUEST */}
          {remoteRequest ? (
            <Card padding={16}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>REMOTE REQUEST</Text>
                <Pill tone="warn" size="sm">{remoteRequest.status}</Pill>
              </View>
              <DetailRow label="Verifier" value={remoteRequest.recipient_name} />
              <DetailRow
                label="Contact"
                value={
                  [remoteRequest.verifier_role, remoteRequest.verifier_company]
                    .filter(Boolean)
                    .join(' · ') ||
                  remoteRequest.recipient_contact ||
                  '—'
                }
              />
              <DetailRow
                label="Expires"
                value={formatDateOrDash(remoteRequest.expires_at)}
              />
              <DetailRow
                label="Code"
                value={remoteRequest.request_code}
                mono
              />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <Button
                  variant="primary"
                  icon={IconExport}
                  onPress={shareVerifierRequest}
                  disabled={hostedSharePending || importHostedCompletion.isPending}
                >
                  {hostedSharePending ? 'Syncing…' : 'Share link'}
                </Button>
                <Button
                  variant="secondary"
                  icon={IconSync}
                  onPress={syncHostedCompletion}
                  disabled={hostedSharePending || importHostedCompletion.isPending}
                >
                  {importHostedCompletion.isPending ? 'Syncing…' : 'Sync'}
                </Button>
                <Button
                  variant="ghost"
                  onPress={() =>
                    router.push(
                      `/verify/${remoteRequest.request_code}?token=${encodeURIComponent(buildRemoteSigningToken(remoteRequest))}` as never,
                    )
                  }
                  disabled={hostedSharePending || importHostedCompletion.isPending}
                >
                  Preview
                </Button>
              </View>
              {remoteRequest.status === 'pending' ? (
                <View style={{ marginTop: 8 }}>
                  <Button
                    variant="ghost"
                    onPress={() => {
                      haptics.warning();
                      Alert.alert(
                        'Cancel this request?',
                        "The pending request will be marked cancelled on this device. If you've already shared the verifier link, the link will still appear pending until you tell them not to sign.",
                        [
                          { text: 'Keep request', style: 'cancel' },
                          {
                            text: 'Cancel locally',
                            style: 'destructive',
                            onPress: async () => {
                              setHostedCancelFailed(false);
                              try {
                                await cancelRemoteRequest.mutateAsync(entry.id);
                                haptics.success();
                              } catch {
                                haptics.error();
                                return;
                              }
                              const result = await cancelHostedRemoteSigningRequest(remoteRequest);
                              if (!result.ok && result.reason === 'cancel_failed') {
                                setHostedCancelFailed(true);
                              }
                            },
                          },
                        ],
                      );
                    }}
                    disabled={
                      cancelRemoteRequest.isPending ||
                      hostedSharePending ||
                      importHostedCompletion.isPending
                    }
                  >
                    {cancelRemoteRequest.isPending ? 'Cancelling…' : 'Cancel request'}
                  </Button>
                </View>
              ) : null}
              {hostedImportFailed ? (
                <Text style={{ ...type.cardSub, color: tokens.danger, marginTop: 8 }}>
                  Hosted signature sync failed. Check the connection and try again.
                </Text>
              ) : null}
              {hostedCancelFailed ? (
                <Text style={{ ...type.cardSub, color: tokens.danger, marginTop: 8 }}>
                  Couldn't reach hosted. The request is cancelled on this device; the verifier link may still appear pending.
                </Text>
              ) : null}
            </Card>
          ) : null}

          {/* CHAIN LADDER */}
          {chainLinks.length > 0 ? (
            <>
              <SectionH kicker="CHAIN" title="Chain links" />
              <View style={{ paddingHorizontal: 4 }}>
                <ChainLink links={chainLinks} />
              </View>
            </>
          ) : null}

          {/* FOOTER ACTIONS */}
          <FooterActions
            entryId={entry.id}
            entryStatus={entry.status}
            hasRemoteRequest={!!remoteRequest}
            isReady={isReady}
            pdfPending={pdfPending}
            exportPending={exportEntry.isPending}
            onSharePdf={shareEntryPdf}
            onShareJson={shareEntryPacket}
          />

          {pdfFailed ? (
            <Text style={{ ...type.cardSub, color: tokens.danger }}>
              Entry export failed.
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────

function DetailStat({ label, value }: { label: string; value: string }) {
  const { tokens } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ ...type.detailStat, color: tokens.text }} numberOfLines={1}>
        {value}
      </Text>
      <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 2 }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 12,
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: tokens.lineSoft,
      }}
    >
      <Text style={{ ...type.monoSm, color: tokens.textFaint, width: 96 }}>
        {label.toUpperCase()}
      </Text>
      <Text
        style={{
          ...(mono ? type.mono : type.cardSub),
          color: tokens.text,
          flex: 1,
        }}
        numberOfLines={2}
        selectable
      >
        {value}
      </Text>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────

function SignatureBlock({
  isDraft,
  isReady,
  entryId,
  signature,
  chainValid,
}: {
  isDraft: boolean;
  isReady: boolean;
  entryId: string;
  signature: NonNullable<ReturnType<typeof useEntryDetail>['data']>['signature'] | null;
  chainValid?: boolean;
}) {
  const { tokens } = useTheme();
  if (signature) {
    // Only assert "Verified" when the chain-hash check has actually passed.
    // chainValid === false → the entry was altered after signing (or its hash
    // version is out of range): show a danger pill, never the green tick.
    // undefined → the async check is still running.
    const statusPill =
      chainValid === false ? (
        <Pill tone="danger" size="sm" icon={IconWarn}>
          Chain mismatch
        </Pill>
      ) : chainValid === true ? (
        <Pill tone="ok" size="sm" icon={IconVerified}>
          Verified
        </Pill>
      ) : (
        <Pill tone="chip" size="sm">
          Checking…
        </Pill>
      );
    return (
      <Card padding={16}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>SIGNATURE</Text>
          {statusPill}
        </View>
        <SigFill name={signature.supervisor_name} />
        <View style={{ marginTop: 12 }}>
          <Text style={{ ...type.cardTitle, color: tokens.text }} numberOfLines={1}>
            {signature.supervisor_name}
          </Text>
          {signature.supervisor_scheme === 'site' ? (
            <>
              <Text style={{ ...type.mono, color: tokens.textDim, marginTop: 2 }} numberOfLines={1}>
                Site-authorised{signature.supervisor_role ? ` · ${signature.supervisor_role}` : ''}
              </Text>
              {signature.supervisor_employer ? (
                <Text style={{ ...type.mono, color: tokens.textDim, marginTop: 2 }} numberOfLines={1}>
                  {signature.supervisor_employer}
                </Text>
              ) : null}
            </>
          ) : signature.supervisor_cert_number ? (
            <Text style={{ ...type.mono, color: tokens.textDim, marginTop: 2 }} numberOfLines={1}>
              {signature.supervisor_scheme ? `${signature.supervisor_scheme.toUpperCase()} ` : ''}Cert {signature.supervisor_cert_number}
            </Text>
          ) : null}
        </View>
        <View style={{ height: 1, backgroundColor: tokens.lineSoft, marginVertical: 12 }} />
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <DetailStat label="Signed at" value={formatDate(signature.signed_at)} />
          <DetailStat label="Method" value={signature.method === 'local' ? 'In person' : 'Remote'} />
        </View>
        {signature.signature_path ? (
          <View style={{ marginTop: 12 }}>
            <Text style={{ ...type.monoSm, color: tokens.textFaint, marginBottom: 6 }}>
              DRAWN SIGNATURE
            </Text>
            <SignatureFrame value={signature.signature_path} />
          </View>
        ) : null}
      </Card>
    );
  }

  // Unsigned
  return (
    <Card padding={16}>
      <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 8 }}>
        SIGNATURE
      </Text>
      <Text style={{ ...type.body, color: tokens.textDim, marginBottom: 12 }}>
        This entry is unsigned. Once sealed, the signature locks the entry into the chain — it
        cannot be edited afterward. Amendments are new entries that point back to this one.
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button
          variant="primary"
          full
          disabled={isDraft && !isReady}
          onPress={() => router.push(`/entry/${entryId}/sign` as never)}
        >
          Sign now
        </Button>
        <Button
          variant="outline"
          full
          disabled={isDraft && !isReady}
          onPress={() => router.push(`/entry/${entryId}/request-signature` as never)}
        >
          Request remote
        </Button>
      </View>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────

function FooterActions({
  entryId,
  entryStatus,
  hasRemoteRequest,
  isReady,
  pdfPending,
  exportPending,
  onSharePdf,
  onShareJson,
}: {
  entryId: string;
  entryStatus: 'draft' | 'signed' | 'amended';
  hasRemoteRequest: boolean;
  isReady: boolean;
  pdfPending: boolean;
  exportPending: boolean;
  onSharePdf: () => void;
  onShareJson: () => void;
}) {
  const isDraft = entryStatus === 'draft';
  const isSigned = entryStatus === 'signed' || entryStatus === 'amended';

  if (isDraft && !hasRemoteRequest) {
    return (
      <View style={{ gap: 8, marginTop: 4 }}>
        <Button
          variant="primary"
          full
          onPress={() => router.push(`/entry/${entryId}/edit` as never)}
        >
          {isReady ? 'Edit draft' : 'Finish draft'}
        </Button>
      </View>
    );
  }

  if (isSigned) {
    return (
      <View style={{ gap: 8, marginTop: 4 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            variant="primary"
            full
            onPress={onSharePdf}
            disabled={pdfPending || exportPending}
          >
            {pdfPending ? 'Building PDF…' : 'Share PDF'}
          </Button>
          <Button
            variant="secondary"
            full
            onPress={onShareJson}
            disabled={pdfPending || exportPending}
          >
            Audit packet
          </Button>
        </View>
        {entryStatus === 'signed' ? (
          <Button
            variant="ghost"
            full
            onPress={() => router.push(`/entry/${entryId}/amend` as never)}
          >
            Amend entry
          </Button>
        ) : null}
      </View>
    );
  }

  return null;
}

// ──────────────────────────────────────────────────────────────────────────

function SignatureFrame({ value }: { value: string }) {
  const { tokens } = useTheme();
  const isImage = value.startsWith('data:image/');
  const frameStyle: ViewStyle = {
    height: 112,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.lineSoft,
    backgroundColor: tokens.surface2,
    overflow: 'hidden',
  };
  return (
    <View style={frameStyle}>
      {isImage ? (
        <NativeImage
          source={{ uri: value }}
          resizeMode="contain"
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <Svg width="100%" height="100%" viewBox="0 0 1000 400">
          <Line x1={48} x2={952} y1={324} y2={324} stroke={tokens.lineSoft} strokeWidth={3} />
          <Path
            d={value}
            fill="none"
            stroke={tokens.text}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
          />
        </Svg>
      )}
    </View>
  );
}


// Bidirectional amendment lineage chips for the entry hero card. An amendment
// renders "Amends ..." pointing back to its source; a source entry whose
// amendments have been drafted renders "Amended by ..." pointing forward to
// the latest one (with a (+N) suffix when more than one exists). Either chip
// taps through to the linked entry so the auditor can walk the chain.
function EntryLineage({
  entry,
  amendments,
}: {
  entry: LogbookEntry;
  amendments: LogbookEntry[];
}) {
  if (!entry.amends_entry_id && amendments.length === 0) return null;

  const latestAmendment = amendments[amendments.length - 1] ?? null;
  const extraAmendments = Math.max(0, amendments.length - 1);

  return (
    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
      {entry.amends_entry_id ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open source entry"
          onPress={() => router.push(`/entry/${entry.amends_entry_id}` as never)}
          hitSlop={6}
        >
          <Pill tone="chip" size="sm">
            {`Amends ${shortEntryRef(entry.amends_entry_id)}`}
          </Pill>
        </Pressable>
      ) : null}
      {latestAmendment ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open latest amendment"
          onPress={() => router.push(`/entry/${latestAmendment.id}` as never)}
          hitSlop={6}
        >
          <Pill tone="accent" size="sm">
            {extraAmendments > 0
              ? `Amended by ${latestAmendment.date_to.slice(0, 10)} · ${shortEntryRef(latestAmendment.id)} (+${extraAmendments})`
              : `Amended by ${latestAmendment.date_to.slice(0, 10)} · ${shortEntryRef(latestAmendment.id)}`}
          </Pill>
        </Pressable>
      ) : null}
    </View>
  );
}

// Audit-friendly short entry reference: strip the createId prefix and surface
// the first 8 chars of the UUID portion. Pairs with the entry date in
// audit-context labels (e.g. "Amended by 2026-05-10 · A1B2C3D4").
function shortEntryRef(id: string): string {
  const parts = id.split('_');
  const uuid = parts.length > 1 ? parts.slice(1).join('_') : id;
  return uuid.slice(0, 8).toUpperCase();
}
