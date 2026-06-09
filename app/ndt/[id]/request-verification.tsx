import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
  type TextStyle,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDateOrDash } from '@/src/domain/date-format';
import { getNdtInspectionReadiness } from '@/src/domain/ndt/ndt-readiness';
import { buildNdtSigningUrl } from '@/src/domain/ndt/ndt-service';
import {
  useCancelNdtRemoteRequest,
  useCreateNdtRemoteRequest,
  useMarkNdtLogged,
  useNdtInspectionDetail,
} from '@/src/domain/ndt/use-ndt';
import type { NdtRemoteSignatureRequest } from '@/src/domain/ndt/types';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import { Button, Card, Field, IconBtn, Pill, SectionH, TopBar } from '@/src/ui/primitives/v2';
import { IconArrowLeft, IconExport, IconWarn } from '@/src/ui/icons';
import { haptics } from '@/src/ui/haptics';

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

export default function NdtRequestVerificationScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const inspectionId = firstParam(id);
  const detail = useNdtInspectionDetail(inspectionId);
  const markLogged = useMarkNdtLogged();
  const createRequest = useCreateNdtRemoteRequest();
  const cancelRequest = useCancelNdtRemoteRequest();

  const [recipientName, setRecipientName] = React.useState('');
  const [recipientContact, setRecipientContact] = React.useState('');
  const [verifierRole, setVerifierRole] = React.useState('');
  const [verifierCompany, setVerifierCompany] = React.useState('');
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  const inspection = detail.data?.inspection;
  // A pending request flips the screen from "form" mode into "link" mode. The
  // create mutation invalidates ndtInspectionDetail, so after a successful
  // create this query refetches, remote_request populates, and the screen
  // swaps modes on its own — no navigation on create (only cancel navigates).
  const remoteRequest = detail.data?.remote_request ?? null;
  const readiness = inspection ? getNdtInspectionReadiness(inspection) : null;

  const submitting = markLogged.isPending || createRequest.isPending;
  const hasVerifierName = recipientName.trim().length > 1;

  // Requestable from draft (we log it first) or logged. Pending/verified/amended
  // can't open a new request.
  const requestableStatus = inspection?.status === 'draft' || inspection?.status === 'logged';
  const canCreate =
    Boolean(inspectionId) &&
    requestableStatus === true &&
    readiness?.ready === true &&
    !remoteRequest &&
    hasVerifierName;

  const blockingMessage = inspection
    ? !requestableStatus
      ? inspection.status === 'pending'
        ? 'A verification request is already in flight for this record.'
        : 'This record is sealed and can no longer be sent for verification.'
      : readiness && !readiness.ready
        ? `Finish the record first: add ${readiness.missingFields.join(', ')}.`
        : null
    : null;

  async function submit() {
    if (!canCreate || !inspectionId || !inspection) return;
    try {
      // The service only accepts a request once the record is `logged`
      // (it throws `ndt_not_requestable` from draft). A draft that's already
      // ready is logged first; markLogged re-checks readiness and throws
      // `ndt_incomplete` if not — but canCreate already gates that.
      if (inspection.status === 'draft') {
        await markLogged.mutateAsync(inspectionId);
      }
      await createRequest.mutateAsync({
        inspection_id: inspectionId,
        recipient_name: recipientName.trim(),
        recipient_contact: recipientContact.trim() || null,
        verifier_role: verifierRole.trim() || null,
        verifier_company: verifierCompany.trim() || null,
      });
      haptics.success();
      // Stay on the screen — the refetched detail now carries remote_request,
      // which renders the link + share affordance below.
    } catch (err) {
      haptics.error();
      Alert.alert(
        'Could not create request',
        (err instanceof Error ? err.message : 'The verification request was not created.') +
          '\n\nYour verifier details are still on this screen — please try again.',
      );
    }
  }

  // Local-only deep link: there is no hosted NDT verifier endpoint yet, so the
  // bare `ralb://ndt-verify/<code>?token=...` is the canonical link. Passing an
  // origin would point at a route that doesn't exist. The link embeds the
  // signing token by design — that's the ONLY place the token surfaces; never
  // render or log the bare token separately.
  async function shareVerifierLink(request: NdtRemoteSignatureRequest) {
    const link = buildNdtSigningUrl(request);
    const title = 'NDT experience-log verification request';
    const message = [
      `Please review and verify this self-maintained NDT experience log entry${
        inspection?.site ? ` for ${inspection.site}` : ''
      }.`,
      `Request code: ${request.request_code}`,
      `Expires: ${request.expires_at ? formatDateOrDash(request.expires_at) : 'not set'}`,
    ].join('\n');
    await Share.share(
      Platform.OS === 'ios'
        ? { title, message, url: link }
        : { title, message: `${message}\nVerification link: ${link}` },
      Platform.OS === 'ios' ? { subject: title } : undefined,
    );
  }

  function confirmCancel(request: NdtRemoteSignatureRequest) {
    if (!inspectionId) return;
    haptics.warning();
    Alert.alert(
      'Cancel this request?',
      "The pending request will be marked cancelled on this device and the record returns to self-logged. If you've already shared the verification link, tell the verifier not to complete it.",
      [
        { text: 'Keep request', style: 'cancel' },
        {
          text: 'Cancel request',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelRequest.mutateAsync(inspectionId);
              haptics.success();
              router.replace(`/ndt/${inspectionId}` as never);
            } catch {
              haptics.error();
              Alert.alert(
                'Could not cancel',
                'The request could not be cancelled. Please try again.',
              );
            }
          },
        },
      ],
    );
  }

  const heroKickerStyle: TextStyle = { ...type.monoKicker, color: tokens.textFaint };
  const heroTitleStyle: TextStyle = {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 26,
    letterSpacing: -0.7,
    lineHeight: 30,
    color: tokens.text,
    marginTop: 4,
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: tokens.bg }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <TopBar
        title="Request verification"
        leading={
          <IconBtn icon={IconArrowLeft} label="Back" size="md" onPress={() => router.back()} />
        }
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
          <Card padding={18}>
            <Text style={heroKickerStyle}>VERIFICATION REQUEST</Text>
            <Text style={heroTitleStyle} numberOfLines={2}>
              {inspection?.site || 'Loading record'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
              <Pill tone="chip">{inspection ? `${inspection.hours.toFixed(1)} h` : '— h'}</Pill>
              <Pill tone={readiness?.ready ? 'ok' : 'warn'}>
                {readiness?.ready
                  ? 'Record ready'
                  : `${readiness?.missingFields.length ?? 0} missing`}
              </Pill>
              {remoteRequest ? <Pill tone="warn">Request pending</Pill> : null}
            </View>
            <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 12 }}>
              Send this self-maintained NDT experience log to an NDT Level III and ask them to
              verify it. Verification is their act — it does not assert any qualification, eligibility,
              or scheme acceptance.
            </Text>
            {blockingMessage ? (
              <View
                style={{
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: tokens.warnSoft,
                  flexDirection: 'row',
                  gap: 10,
                  alignItems: 'flex-start',
                }}
              >
                <IconWarn size={21} color={tokens.warn} fill={tokens.warn} />
                <Text style={{ ...type.cardSub, color: tokens.text, flex: 1 }}>
                  {blockingMessage}
                </Text>
              </View>
            ) : null}
          </Card>
        </View>

        {remoteRequest ? (
          // ── LINK MODE ──────────────────────────────────────────────────────
          <>
            <SectionH kicker="01 SHARE" title="Send the verification link" />
            <View style={{ paddingHorizontal: 20, gap: 12 }}>
              <Card padding={16}>
                <DetailRow label="Verifier" value={remoteRequest.recipient_name || '—'} />
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
                <DetailRow label="Expires" value={formatDateOrDash(remoteRequest.expires_at)} />
                <DetailRow label="Code" value={remoteRequest.request_code} mono />
                <View style={{ marginTop: 12, gap: 6 }}>
                  <Text style={{ ...type.monoSm, color: tokens.textFaint }}>VERIFICATION LINK</Text>
                  <View
                    style={{
                      backgroundColor: tokens.surface,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: tokens.lineSoft,
                      padding: 12,
                    }}
                  >
                    <Text style={{ ...type.mono, color: tokens.text }} selectable>
                      {buildNdtSigningUrl(remoteRequest)}
                    </Text>
                  </View>
                </View>
                <View style={{ marginTop: 14 }}>
                  <Button
                    variant="primary"
                    full
                    icon={IconExport}
                    onPress={() => shareVerifierLink(remoteRequest)}
                  >
                    Share verification link
                  </Button>
                </View>
              </Card>

              <Text style={{ ...type.cardSub, color: tokens.textDim, paddingHorizontal: 4 }}>
                The link opens the verifier completion screen on the recipient&apos;s device. Once
                the Level III completes it, sync the record back from the NDT record screen — the
                attestation seals it into the chain.
              </Text>

              <Button
                variant="ghost"
                full
                disabled={cancelRequest.isPending}
                onPress={() => confirmCancel(remoteRequest)}
              >
                {cancelRequest.isPending ? 'Cancelling…' : 'Cancel request'}
              </Button>
            </View>
          </>
        ) : (
          // ── FORM MODE ──────────────────────────────────────────────────────
          <>
            <SectionH kicker="01 VERIFIER" title="Who's verifying?" />
            <View style={{ paddingHorizontal: 20, gap: 12 }}>
              <Field
                label="Verifier name"
                value={recipientName}
                onChangeText={setRecipientName}
                placeholder="Jordan Lee"
                autoCapitalize="words"
                helper="Their NDT Level III who will verify this log."
              />
              <Field
                label="Contact"
                value={recipientContact}
                onChangeText={setRecipientContact}
                placeholder="Optional email or phone"
                keyboardType="email-address"
                autoCapitalize="none"
                helper="Optional."
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => setDetailsOpen((v) => !v)}
                style={({ pressed }) => ({
                  backgroundColor: tokens.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: tokens.lineSoft,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ ...type.cardTitle, color: tokens.text }}>
                  {detailsOpen ? 'Hide role + company' : 'Add role + company'}
                </Text>
                <Text style={{ ...type.monoSm, color: tokens.textDim }}>
                  {detailsOpen ? '−' : '+'}
                </Text>
              </Pressable>
              {detailsOpen ? (
                <>
                  <Field
                    label="Role"
                    value={verifierRole}
                    onChangeText={setVerifierRole}
                    placeholder="NDT Level III"
                  />
                  <Field
                    label="Company"
                    value={verifierCompany}
                    onChangeText={setVerifierCompany}
                    placeholder="Optional"
                  />
                </>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>

      {remoteRequest ? null : (
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
          <Button
            variant="primary"
            size="lg"
            full
            onPress={submit}
            disabled={!canCreate || submitting}
          >
            {submitting
              ? 'Creating request…'
              : canCreate
                ? 'Create verification request'
                : blockingMessage
                  ? 'Finish record first'
                  : 'Add verifier name'}
          </Button>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

// Local DetailRow — mirrors app/ndt/[id].tsx's row so the link-mode card reads
// identically to the read-only request card on the detail screen.
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
        style={{ ...(mono ? type.mono : type.cardSub), color: tokens.text, flex: 1 }}
        numberOfLines={2}
        selectable
      >
        {value}
      </Text>
    </View>
  );
}
