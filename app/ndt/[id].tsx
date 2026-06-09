import React from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, Text, View } from 'react-native';
import { formatDate, formatDateOrDash, formatDateRange } from '@/src/domain/date-format';
import { getNdtInspectionReadiness } from '@/src/domain/ndt/ndt-readiness';
import { verifyNdtChainHashFor } from '@/src/domain/ndt/ndt-hash';
import {
  useCreateNdtInspection,
  useDeleteNdtInspection,
  useNdtInspectionDetail,
} from '@/src/domain/ndt/use-ndt';
import type {
  NdtInspection,
  NdtInspectionStatus,
  NdtMethod,
  NdtSignature,
} from '@/src/domain/ndt/types';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import { Button, Card, ChainLink, IconBtn, Pill, SectionH, SigFill, TopBar, type ChainLinkItem } from '@/src/ui/primitives/v2';
import { IconArrowLeft, IconVerified, IconWarn } from '@/src/ui/icons';
import { haptics } from '@/src/ui/haptics';

// ── Taxonomy ────────────────────────────────────────────────────────────────

const METHOD_LABEL: Record<NdtMethod, string> = {
  UT: 'Ultrasonic',
  MT: 'Magnetic Particle',
  PT: 'Penetrant',
  RT: 'Radiographic',
  ET: 'Eddy Current',
  VT: 'Visual',
  LT: 'Leak',
  AE: 'Acoustic Emission',
  IRT: 'Infrared',
  NR: 'Neutron Radiography',
  GW: 'Guided Wave',
};

function methodLabel(method: NdtMethod): string {
  return `${method} · ${METHOD_LABEL[method] ?? method}`;
}

// Verification-state badge. NDT statuses (draft | logged | pending | verified |
// amended) do NOT map onto the rope-access StatusPill enum, so this builds a raw
// v2 Pill directly. NB: NDT only ACCRUES experience — "Self-logged" / "Pending
// verification" deliberately avoid any "qualified / eligible / accepted"
// framing; verification is the Level III's act, not a status the log claims.
const STATUS_BADGE: Record<
  NdtInspectionStatus,
  { label: string; tone: 'chip' | 'accent' | 'ok' | 'warn' }
> = {
  draft: { label: 'Draft', tone: 'chip' },
  logged: { label: 'Self-logged', tone: 'accent' },
  pending: { label: 'Pending verification', tone: 'warn' },
  verified: { label: 'Verified', tone: 'ok' },
  amended: { label: 'Amended', tone: 'chip' },
};

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

function supervisionLabel(value: NdtInspection['supervised']): string {
  return value === 'independent' ? 'Independent' : 'Supervised';
}

// ── Screen ────────────────────────────────────────────────────────────────

export default function NdtInspectionDetailScreen() {
  const { tokens } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const inspectionId = firstParam(id);
  const detail = useNdtInspectionDetail(inspectionId);
  const deleteInspection = useDeleteNdtInspection();
  const createInspection = useCreateNdtInspection();

  const inspection = detail.data?.inspection;
  const signature = detail.data?.signature ?? null;
  const remoteRequest = detail.data?.remote_request ?? null;
  const linkedEntryLabel = detail.data?.linked_entry_label ?? null;

  // Chain validity is async. No NDT equivalent of useEntryChainValid exists yet,
  // so the verify is run inline with local state + a cancellation guard, then the
  // mirror's 3-state pill (false → mismatch, true → verified, undefined → checking)
  // is reused. Never assert "Verified" off signature presence alone.
  const [chainValid, setChainValid] = React.useState<boolean | undefined>(undefined);
  React.useEffect(() => {
    if (!inspection || !signature) {
      setChainValid(undefined);
      return;
    }
    let cancelled = false;
    setChainValid(undefined);
    verifyNdtChainHashFor({ inspection, signature })
      .then((ok) => {
        if (!cancelled) setChainValid(ok);
      })
      .catch(() => {
        if (!cancelled) setChainValid(false);
      });
    return () => {
      cancelled = true;
    };
  }, [inspection, signature]);

  if (detail.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg }}>
        <Stack.Screen options={{ headerShown: false }} />
        <TopBar
          title="NDT record"
          leading={<IconBtn icon={IconArrowLeft} label="Back" size="md" onPress={() => router.replace('/ndt')} />}
        />
        <View style={{ padding: 20 }}>
          <Text style={{ ...type.body, color: tokens.textDim }}>Loading NDT record…</Text>
        </View>
      </View>
    );
  }

  if (detail.isError) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg }}>
        <Stack.Screen options={{ headerShown: false }} />
        <TopBar
          title="NDT record"
          leading={<IconBtn icon={IconArrowLeft} label="Back" size="md" onPress={() => router.replace('/ndt')} />}
        />
        <View style={{ padding: 20, gap: 16 }}>
          <Text style={{ ...type.heroCardTitle, color: tokens.text }}>Couldn&apos;t load this record</Text>
          <Text style={{ ...type.body, color: tokens.textDim }}>
            Something went wrong reading the NDT record. Check your connection and try again.
          </Text>
          <Button variant="primary" onPress={() => detail.refetch()}>
            Retry
          </Button>
        </View>
      </View>
    );
  }

  if (!inspection || !inspectionId) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg }}>
        <Stack.Screen options={{ headerShown: false }} />
        <TopBar
          title="NDT record"
          leading={<IconBtn icon={IconArrowLeft} label="Back" size="md" onPress={() => router.replace('/ndt')} />}
        />
        <View style={{ padding: 20, gap: 16 }}>
          <Text style={{ ...type.heroCardTitle, color: tokens.text }}>Record not found</Text>
          <Button variant="primary" onPress={() => router.replace('/ndt')}>
            Back to NDT log
          </Button>
        </View>
      </View>
    );
  }

  const status = inspection.status;
  const isEditable = status === 'draft' || status === 'logged';
  const isVerified = status === 'verified';
  const badge = STATUS_BADGE[status];
  const readiness = getNdtInspectionReadiness(inspection);
  const isReady = readiness.ready;

  const dateLabel = formatDateRange(inspection.date_from, inspection.date_to);
  const dateKicker = dateLabel.toUpperCase();
  const hoursLabel = `${(inspection.hours ?? 0).toFixed(1)} h`;

  async function confirmDelete() {
    if (!inspectionId) return;
    haptics.warning();
    Alert.alert(
      'Delete this NDT record?',
      'This removes the self-logged record from this device. This cannot be undone.',
      [
        { text: 'Keep record', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteInspection.mutateAsync(inspectionId);
              haptics.success();
              router.replace('/ndt');
            } catch {
              haptics.error();
              Alert.alert('Could not delete', 'This record could not be deleted. It may be pending verification or already sealed.');
            }
          },
        },
      ],
    );
  }

  // Amend = a NEW draft that carries amends_inspection_id back to the verified
  // record (NOT a route, unlike rope-access entries). The service forces the new
  // row's status to draft, so it isn't passed. All editable fields carry over.
  async function amendInspection() {
    if (!inspection) return;
    try {
      const created = await createInspection.mutateAsync({
        date_from: inspection.date_from,
        date_to: inspection.date_to,
        method: inspection.method,
        technique: inspection.technique,
        ndt_level_snapshot: inspection.ndt_level_snapshot,
        supervised: inspection.supervised,
        hours: inspection.hours,
        site: inspection.site,
        client: inspection.client,
        employer: inspection.employer,
        procedure_ref: inspection.procedure_ref,
        component: inspection.component,
        ndt_scheme: inspection.ndt_scheme,
        description: inspection.description,
        linked_entry_id: inspection.linked_entry_id,
        amends_inspection_id: inspection.id,
      });
      haptics.success();
      router.replace(`/ndt/${created.id}/edit` as never);
    } catch {
      haptics.error();
      Alert.alert('Could not start amendment', 'A new draft amendment could not be created. Please try again.');
    }
  }

  const chainLinks: ChainLinkItem[] = [];
  if (signature?.chain_hash) {
    if (signature.previous_chain_hash) {
      chainLinks.push({ hash: signature.previous_chain_hash, label: 'Previous link', dim: true });
    }
    chainLinks.push({
      hash: signature.chain_hash,
      label: `${inspection.site} · sealed ${formatDate(signature.signed_at)}`,
      head: true,
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <TopBar
        title={`NDT ${shortRef(inspection.id)}`}
        leading={<IconBtn icon={IconArrowLeft} label="Back" size="md" onPress={() => router.back()} />}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 24, gap: 14 }} showsVerticalScrollIndicator={false}>
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
                <Text style={{ ...type.heroCardTitle, color: tokens.text }} numberOfLines={2} selectable>
                  {inspection.site || 'Untitled NDT record'}
                </Text>
                <Text style={{ ...type.cardSub, color: tokens.textDim }} numberOfLines={2} selectable>
                  {methodLabel(inspection.method)}
                </Text>
              </View>
              <View style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <Pill tone={badge.tone} size="md">
                  {badge.label}
                </Pill>
                <Pill tone="chip" size="sm">
                  {supervisionLabel(inspection.supervised)}
                </Pill>
              </View>
            </View>

            <NdtLineage inspection={inspection} />

            <View style={{ height: 1, backgroundColor: tokens.lineSoft, marginVertical: 16 }} />

            <View style={{ flexDirection: 'row', gap: 14 }}>
              <DetailStat label="Hours" value={hoursLabel} />
              <DetailStat label="Level held" value={inspection.ndt_level_snapshot ?? '—'} />
              <DetailStat label="Technique" value={inspection.technique || '—'} />
            </View>

            {isEditable && !isReady ? (
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
                <Pill tone="warn" size="sm">{`${readiness.missingFields.length} missing`}</Pill>
              </View>
            ) : null}
            {chainValid === false && signature ? (
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
                <Pill tone="danger" size="sm" icon={IconWarn}>
                  Chain mismatch
                </Pill>
              </View>
            ) : null}
          </Card>

          {/* DETAILS */}
          <Card padding={16}>
            <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 8 }}>INSPECTION DETAILS</Text>
            <DetailRow label="Method" value={methodLabel(inspection.method)} />
            <DetailRow label="Technique" value={inspection.technique || '—'} />
            <DetailRow label="Dates" value={dateLabel} />
            <DetailRow label="Hours" value={hoursLabel} />
            <DetailRow label="Mode" value={supervisionLabel(inspection.supervised)} />
            <DetailRow label="Level held" value={inspection.ndt_level_snapshot ?? '—'} />
            <DetailRow label="Site / job" value={inspection.site || '—'} />
            <DetailRow label="Employer" value={inspection.employer || '—'} />
            <DetailRow label="Client" value={inspection.client || '—'} />
            <DetailRow label="Procedure" value={inspection.procedure_ref || '—'} />
            <DetailRow label="Component" value={inspection.component || '—'} />
            <DetailRow label="Scheme" value={inspection.ndt_scheme || '—'} />
          </Card>

          {/* DESCRIPTION */}
          {inspection.description ? (
            <Card padding={16}>
              <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 8 }}>DESCRIPTION</Text>
              <Text style={{ ...type.body, color: tokens.text }} selectable>
                {inspection.description}
              </Text>
            </Card>
          ) : null}

          {/* LINKED ROPE-ACCESS ENTRY — explicit boundary: a rope-access
              supervisor signature attests to access work, never to NDT hours. */}
          {inspection.linked_entry_id ? (
            <Card padding={16}>
              <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 8 }}>
                LINKED ROPE-ACCESS ENTRY
              </Text>
              <Text style={{ ...type.cardTitle, color: tokens.text }} selectable>
                {linkedEntryLabel ?? shortRef(inspection.linked_entry_id)}
              </Text>
              <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 6 }}>
                This rope-access signature does not cover NDT hours.
              </Text>
            </Card>
          ) : null}

          {/* VERIFICATION */}
          <VerificationBlock signature={signature} chainValid={chainValid} status={status} />

          {/* REMOTE REQUEST (read-only) — surfaced only while pending. No
              share/sync/cancel machinery here; that lives on the request-
              verification screen. */}
          {remoteRequest && status === 'pending' ? (
            <Card padding={16}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>VERIFICATION REQUEST</Text>
                <Pill tone="warn" size="sm">{remoteRequest.status}</Pill>
              </View>
              <DetailRow label="Verifier" value={remoteRequest.recipient_name || '—'} />
              <DetailRow
                label="Contact"
                value={
                  [remoteRequest.verifier_role, remoteRequest.verifier_company].filter(Boolean).join(' · ') ||
                  remoteRequest.recipient_contact ||
                  '—'
                }
              />
              <DetailRow label="Expires" value={formatDateOrDash(remoteRequest.expires_at)} />
              <DetailRow label="Code" value={remoteRequest.request_code} mono />
              <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 10 }}>
                Sent to a Level III for verification. This record is read-only until they complete or it expires.
              </Text>
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

          {/* ACTIONS */}
          {isEditable ? (
            <View style={{ gap: 8, marginTop: 4 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button variant="primary" grow onPress={() => router.push(`/ndt/${inspectionId}/edit` as never)}>
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  grow
                  disabled={!isReady}
                  onPress={() => router.push(`/ndt/${inspectionId}/sign` as never)}
                >
                  Sign in-app
                </Button>
              </View>
              <Button
                variant="outline"
                full
                disabled={!isReady}
                onPress={() => router.push(`/ndt/${inspectionId}/request-verification` as never)}
              >
                Request verification
              </Button>
              <Button variant="ghost" full disabled={deleteInspection.isPending} onPress={confirmDelete}>
                {deleteInspection.isPending ? 'Deleting…' : 'Delete record'}
              </Button>
            </View>
          ) : isVerified ? (
            <View style={{ gap: 8, marginTop: 4 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button variant="primary" grow disabled={createInspection.isPending} onPress={amendInspection}>
                  {createInspection.isPending ? 'Starting…' : 'Amend'}
                </Button>
                {/* Export is a stub: app/export.tsx has no NDT awareness and
                    takes no inspection param, so routing there would mislead.
                    Wired to a placeholder until the NDT export screen exists. */}
                <Button
                  variant="secondary"
                  grow
                  onPress={() =>
                    Alert.alert('Export', 'NDT record export is coming soon.')
                  }
                >
                  Export
                </Button>
              </View>
            </View>
          ) : (
            <View style={{ gap: 8, marginTop: 4 }}>
              <Text style={{ ...type.cardSub, color: tokens.textDim }}>
                {status === 'amended'
                  ? 'This record has been superseded by an amendment and is read-only.'
                  : 'This record is read-only while a verification request is in flight.'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

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
      <Text style={{ ...type.monoSm, color: tokens.textFaint, width: 96 }}>{label.toUpperCase()}</Text>
      <Text style={{ ...(mono ? type.mono : type.cardSub), color: tokens.text, flex: 1 }} numberOfLines={2} selectable>
        {value}
      </Text>
    </View>
  );
}

// Verification block. When a Level III signature is present, surface verifier
// identity + the chain-verified indicator (3-state, driven by the async hash
// check). Otherwise frame the record as a self-maintained log pending
// verification — never as "qualified / eligible / accepted".
function VerificationBlock({
  signature,
  chainValid,
  status,
}: {
  signature: NdtSignature | null;
  chainValid: boolean | undefined;
  status: NdtInspectionStatus;
}) {
  const { tokens } = useTheme();

  if (signature) {
    const statusPill =
      chainValid === false ? (
        <Pill tone="danger" size="sm" icon={IconWarn}>
          Chain mismatch
        </Pill>
      ) : chainValid === true ? (
        <Pill tone="ok" size="sm" icon={IconVerified}>
          Chain verified
        </Pill>
      ) : (
        <Pill tone="chip" size="sm">
          Checking…
        </Pill>
      );

    const levelSchemeLine = [
      signature.verifier_level ? `Level ${signature.verifier_level}` : null,
      signature.verifier_scheme,
    ]
      .filter(Boolean)
      .join(' · ');

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
          <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>LEVEL III VERIFICATION</Text>
          {statusPill}
        </View>
        <SigFill name={signature.verifier_name} />
        <View style={{ marginTop: 12 }}>
          <Text style={{ ...type.cardTitle, color: tokens.text }} numberOfLines={1}>
            {signature.verifier_name}
          </Text>
          <Text style={{ ...type.mono, color: tokens.textDim, marginTop: 2 }} numberOfLines={1}>
            Cert {signature.verifier_cert_number}
          </Text>
          {levelSchemeLine ? (
            <Text style={{ ...type.mono, color: tokens.textDim, marginTop: 2 }} numberOfLines={1}>
              {levelSchemeLine}
            </Text>
          ) : null}
          {signature.verifier_employer ? (
            <Text style={{ ...type.mono, color: tokens.textDim, marginTop: 2 }} numberOfLines={1}>
              {signature.verifier_employer}
            </Text>
          ) : null}
        </View>
        <View style={{ height: 1, backgroundColor: tokens.lineSoft, marginVertical: 12 }} />
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <DetailStat label="Verified at" value={formatDate(signature.signed_at)} />
          <DetailStat label="Method" value={signature.method === 'local' ? 'In person' : 'Remote'} />
        </View>
      </Card>
    );
  }

  // Unverified — frame as a self-maintained log pending the Level III.
  return (
    <Card padding={16}>
      <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 8 }}>VERIFICATION</Text>
      <Text style={{ ...type.body, color: tokens.textDim }}>
        {status === 'pending'
          ? 'A verification request is in flight. Once a Level III completes it, their attestation seals this record into the NDT chain.'
          : 'This is a self-maintained NDT experience log. It accrues hours pending an NDT Level III’s verification — once verified, the record is sealed into the chain and can no longer be edited.'}
      </Text>
    </Card>
  );
}

// Bidirectional amendment lineage chips for the hero card. An amendment shows
// "Amends …" pointing back to the source record; both tap through so an auditor
// can walk the chain. (Forward "Amended by …" needs a reverse lookup the detail
// query doesn't provide, so only the back-pointer is rendered.)
function NdtLineage({ inspection }: { inspection: NdtInspection }) {
  if (!inspection.amends_inspection_id) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
      <Pill tone="chip" size="sm">{`Amends ${shortRef(inspection.amends_inspection_id)}`}</Pill>
    </View>
  );
}

// Audit-friendly short reference: strip the createId prefix and surface the
// first 8 chars of the id portion. Mirrors entry/[id].tsx shortEntryRef.
function shortRef(id: string): string {
  const parts = id.split('_');
  const tail = parts.length > 1 ? parts.slice(1).join('_') : id;
  return tail.slice(0, 8).toUpperCase();
}
