import React from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  certLevelToDigit,
  formatIrataNumber,
  inferSchemeFromCertNumber,
  irataLevelFromNumber,
  irataNumberDigits,
  normalizeSpratNumber,
} from '@/src/domain/cert-number';
import { formatDateRange } from '@/src/domain/date-format';
import { entryKindLabel, parseHazards } from '@/src/domain/logbook/types';
import { getEntryVerificationReadiness } from '@/src/domain/logbook/entry-readiness';
import {
  useEntryDetail,
  useSignEntryLocal,
  useSupervisorContacts,
} from '@/src/domain/logbook/use-logbook';
import type { CertLevel, CertScheme, SignerScheme } from '@/src/domain/profile/types';
import { PrefKeys, readPref } from '@/src/storage/local-prefs';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import {
  Button,
  Card,
  ChipSelect,
  Field,
  IconBtn,
  Pill,
  SealAnim,
  SectionH,
  SigPad,
  StatusPill,
  TopBar,
  type SigPadHandle,
} from '@/src/ui/primitives/v2';
import { IconArrowLeft, IconCheck } from '@/src/ui/icons';
import { haptics } from '@/src/ui/haptics';
import { useUnsavedGuard } from '@/src/ui/use-unsaved-guard';

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

const ATTESTATION_TEXT =
  'I verify this entry matches the work performed and I am authorized to sign it.';

const SCHEME_OPTIONS: Array<{ value: SignerScheme; label: string }> = [
  { value: 'sprat', label: 'SPRAT' },
  { value: 'irata', label: 'IRATA' },
  { value: 'site', label: 'Site' },
];

const IRATA_LEVELS: Array<{ value: CertLevel; label: string }> = [
  { value: 'I', label: 'L1' },
  { value: 'II', label: 'L2' },
  { value: 'III', label: 'L3' },
];

export default function LocalSignScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { id, supervisor: supervisorParam } = useLocalSearchParams<{
    id?: string | string[];
    supervisor?: string | string[];
  }>();
  const entryId = firstParam(id);
  const supervisorIdParam = firstParam(supervisorParam);
  const detail = useEntryDetail(entryId);
  const signEntry = useSignEntryLocal();
  const supervisors = useSupervisorContacts();

  const [supervisorName, setSupervisorName] = React.useState('');
  const [supervisorScheme, setSupervisorScheme] = React.useState<SignerScheme>('sprat');
  const [supervisorCertNumber, setSupervisorCertNumber] = React.useState('');
  const [supervisorIrataLevel, setSupervisorIrataLevel] = React.useState<CertLevel>('II');
  // Captured only when supervisorScheme === 'site' — for a non-rope-access
  // certified signer (safety officer / shift lead / superintendent).
  const [supervisorRole, setSupervisorRole] = React.useState('');
  const [supervisorEmployer, setSupervisorEmployer] = React.useState('');
  const [signaturePath, setSignaturePath] = React.useState('');
  const [signatureActive, setSignatureActive] = React.useState(false);
  const [attestationAccepted, setAttestationAccepted] = React.useState(false);
  const [sealing, setSealing] = React.useState(false);
  const [sealedChainHash, setSealedChainHash] = React.useState<string | null>(null);

  const sigPadRef = React.useRef<SigPadHandle>(null);
  const didPrefillSupervisor = React.useRef(false);

  // Guard against losing a drawn signature + attestation to a stray back-tap or
  // edge-back at the device-handoff moment. Disabled once sealing starts so the
  // success navigation isn't intercepted.
  const signDirty =
    signaturePath.trim().length > 0 ||
    attestationAccepted ||
    supervisorCertNumber.trim().length > 0 ||
    supervisorRole.trim().length > 0 ||
    supervisorEmployer.trim().length > 0;
  useUnsavedGuard(signDirty && !sealing && !sealedChainHash, {
    title: 'Discard this signature?',
    message: 'The drawn signature and details on this screen will be lost.',
    confirmLabel: 'Discard',
  });
  const sealNavTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const sealNavRouteRef = React.useRef<string | null>(null);

  // Cancel any pending auto-navigate when the screen unmounts so a fast user
  // back-press during the seal animation doesn't navigate out from under them.
  React.useEffect(() => {
    return () => {
      if (sealNavTimeoutRef.current) {
        clearTimeout(sealNavTimeoutRef.current);
        sealNavTimeoutRef.current = null;
      }
    };
  }, []);

  function advancePastSeal() {
    if (sealNavTimeoutRef.current) {
      clearTimeout(sealNavTimeoutRef.current);
      sealNavTimeoutRef.current = null;
    }
    const target = sealNavRouteRef.current;
    if (target) router.replace(target as never);
  }

  const entry = detail.data?.entry;
  const readiness = entry ? getEntryVerificationReadiness(entry) : null;
  const isSiteSigner = supervisorScheme === 'site';
  const requiresCertNumber = supervisorScheme === 'irata';
  const isDraft = entry?.status === 'draft';
  const isReady = readiness?.ready === true;

  React.useEffect(() => {
    if (didPrefillSupervisor.current || !supervisorIdParam || !entry) return;
    const supervisor = supervisors.data?.find((item) => item.id === supervisorIdParam);
    if (!supervisor) return;
    didPrefillSupervisor.current = true;
    const inferredScheme = inferSchemeFromCertNumber(supervisor.cert_number) ?? supervisorScheme;
    setSupervisorScheme(inferredScheme);
    setSupervisorName(supervisor.name);
    const level = irataLevelFromNumber(supervisor.cert_number, supervisorIrataLevel);
    setSupervisorIrataLevel(level);
    setSupervisorCertNumber(
      inferredScheme === 'irata'
        ? irataNumberDigits(supervisor.cert_number ?? '')
        : normalizeSpratNumber(supervisor.cert_number ?? ''),
    );
  }, [entry, supervisorIdParam, supervisorIrataLevel, supervisorScheme, supervisors.data]);

  const selectedKnownSupervisor = supervisors.data?.find(
    (s) =>
      s.name === supervisorName &&
      (requiresCertNumber
        ? irataNumberDigits(s.cert_number ?? '') === irataNumberDigits(supervisorCertNumber)
        : normalizeSpratNumber(s.cert_number ?? '') === normalizeSpratNumber(supervisorCertNumber)),
  );

  const signatureReady = signaturePath.trim().length > 0;
  // Both SPRAT and IRATA supervisors must supply a card / member number — an
  // unidentified signer breaks the audit trail. IRATA keeps its strict
  // 5-digit format; SPRAT just has to be non-empty after normalization.
  // SITE signers don't supply a cert; they supply role + employer instead.
  const certNumberReady = isSiteSigner
    ? true
    : requiresCertNumber
      ? irataNumberDigits(supervisorCertNumber).length === 5
      : normalizeSpratNumber(supervisorCertNumber).length >= 2;
  const siteFieldsReady = !isSiteSigner
    || (supervisorRole.trim().length >= 2 && supervisorEmployer.trim().length >= 2);
  const canSign =
    Boolean(entryId) &&
    isDraft &&
    isReady &&
    supervisorName.trim().length > 1 &&
    certNumberReady &&
    siteFieldsReady &&
    signatureReady &&
    attestationAccepted;

  async function submit() {
    if (!canSign || !entryId) return;
    // Optional biometric/passcode confirmation just before sealing into the
    // chain (Security → "Biometric prompt before signing"). If no auth method
    // is enrolled we can't prompt, so we proceed — the app-open lock is the
    // primary guard and signing must never be permanently blockable.
    if (await readPref<boolean>(PrefKeys.biometricForSigning, false)) {
      const level = await LocalAuthentication.getEnrolledLevelAsync();
      if (level !== LocalAuthentication.SecurityLevel.NONE) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Confirm to sign',
          disableDeviceFallback: false,
        });
        if (!result.success) {
          haptics.error();
          return;
        }
      }
    }
    signEntry.mutate(
      {
        entry_id: entryId,
        supervisor_name: supervisorName,
        supervisor_scheme: supervisorScheme,
        supervisor_cert_number: isSiteSigner
          ? ''
          : requiresCertNumber
            ? formatIrataNumber(supervisorIrataLevel, supervisorCertNumber)
            : normalizeSpratNumber(supervisorCertNumber),
        supervisor_role: isSiteSigner ? supervisorRole : null,
        supervisor_employer: isSiteSigner ? supervisorEmployer : null,
        signature_path: signaturePath,
        attestation_accepted: attestationAccepted,
        signer_attestation: ATTESTATION_TEXT,
      },
      {
        onSuccess: (signed) => {
          haptics.success();
          const chainHash = signed.signature?.chain_hash ?? null;
          setSealedChainHash(chainHash ? formatChainShort(chainHash) : null);
          setSealing(true);
          // Set the auto-advance to 3s so the seal animation reads, but let
          // the user tap the seal to skip ahead (advancePastSeal clears the
          // timeout). Both paths route to the same destination.
          if (signed.entry?.id) {
            sealNavRouteRef.current = `/entry/${signed.entry.id}`;
            sealNavTimeoutRef.current = setTimeout(advancePastSeal, 3000);
          }
        },
        onError: () => haptics.error(),
      },
    );
  }

  if (sealing) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue to signed entry"
        accessibilityHint="Skip the seal animation"
        onPress={advancePastSeal}
        style={{
          flex: 1,
          backgroundColor: tokens.bg,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        <SealAnim hash={sealedChainHash} />
        <Text
          style={{
            ...type.monoKicker,
            color: tokens.textFaint,
            position: 'absolute',
            bottom: 24 + insets.bottom,
          }}
        >
          TAP TO CONTINUE
        </Text>
      </Pressable>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: tokens.bg }}
    >
      <TopBar
        title="Seal in chain"
        leading={
          <IconBtn
            icon={IconArrowLeft}
            label="Back"
            size="md"
            onPress={() => router.back()}
          />
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 132,
          gap: 14,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        scrollEnabled={!signatureActive}
      >
        {/* CONTEXT */}
        <Card padding={14}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>SIGNING</Text>
              <Text
                style={{ ...type.heroCardTitle, color: tokens.text, marginTop: 2 }}
                numberOfLines={1}
              >
                {entry?.site || 'Loading entry…'}
              </Text>
              <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 2 }} numberOfLines={1}>
                {entry
                  ? `${[entry.employer, entry.client].filter(Boolean).join(' · ') || 'No employer / client on file'}`
                  : ''}
              </Text>
            </View>
            <StatusPill status="draft" />
          </View>
          {isDraft && readiness && !isReady ? (
            <View
              style={{
                marginTop: 12,
                flexDirection: 'row',
                gap: 8,
                padding: 10,
                borderRadius: 10,
                backgroundColor: tokens.warnSoft,
              }}
            >
              <Text style={{ ...type.cardSub, color: tokens.warn, flex: 1 }}>
                Finish required fields before signing: {readiness.missingFields.join(', ')}.
              </Text>
            </View>
          ) : null}
        </Card>

        {/* WORK RECORD — full field parity with the verifier portal's WORK RECORD
            card. Same fields, same labels, same order, so a supervisor signing in
            person sees exactly what a remote verifier signs against. */}
        {entry ? (
          <View>
            <SectionH
              kicker="WORK RECORD"
              title={formatDateRange(entry.date_from, entry.date_to)}
            />
            <Card padding={14}>
              {(() => {
                const hazardsList = parseHazards(entry.hazards);
                const hasRescue = !!entry.rescue_cover?.trim();
                const hasHazards = hazardsList.length > 0;
                const hasNotes = !!entry.description?.trim();
                const hasBottom = hasRescue || hasHazards || hasNotes;
                return (
                  <>
                    <Row label="Hours" value={entry.work_hours.toFixed(1)} />
                    <Row label="Kind" value={entryKindLabel(entry.entry_kind)} />
                    <Row label="Task" value={entry.work_task || '—'} />
                    <Row label="Access" value={entry.access_method || '—'} />
                    <Row label="Structure" value={entry.structure_type || '—'} />
                    <Row
                      label="Height"
                      value={
                        !entry.max_height || entry.max_height <= 0
                          ? '—'
                          : `${entry.max_height.toFixed(0)} ${entry.height_unit}`
                      }
                      last={!hasBottom}
                    />
                    {hasRescue ? (
                      <WorkRecordBlock label="Rescue cover" body={entry.rescue_cover ?? ''} />
                    ) : null}
                    {hasHazards ? (
                      <WorkRecordBlock label="Hazards" body={hazardsList.join(' · ')} />
                    ) : null}
                    {hasNotes ? (
                      <WorkRecordBlock label="Notes" body={entry.description} />
                    ) : null}
                  </>
                );
              })()}
            </Card>
          </View>
        ) : null}

        {/* SUPERVISOR */}
        <View>
          <SectionH
            kicker="SUPERVISOR"
            title="Who's signing"
            action={
              selectedKnownSupervisor ? <Pill tone="ok" size="sm">Known</Pill> : null
            }
          />
          <View style={{ paddingHorizontal: 0, gap: 12 }}>
            {supervisors.data && supervisors.data.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {supervisors.data.map((s) => {
                  const selected = s.id === selectedKnownSupervisor?.id;
                  return (
                    <Pressable
                      key={s.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        const inferred = inferSchemeFromCertNumber(s.cert_number) ?? supervisorScheme;
                        setSupervisorScheme(inferred);
                        setSupervisorName(s.name);
                        const level = irataLevelFromNumber(s.cert_number, supervisorIrataLevel);
                        setSupervisorIrataLevel(level);
                        setSupervisorCertNumber(
                          inferred === 'irata'
                            ? irataNumberDigits(s.cert_number ?? '')
                            : normalizeSpratNumber(s.cert_number ?? ''),
                        );
                        haptics.selection();
                      }}
                      style={({ pressed }) => [
                        knownChipStyle(tokens, selected),
                        pressed ? { transform: [{ scale: 0.97 }] } : null,
                      ]}
                    >
                      <Text
                        style={{
                          ...type.cardSub,
                          color: selected ? tokens.accentInk : tokens.text,
                          fontFamily: 'Manrope_600SemiBold',
                          fontWeight: '600',
                        }}
                      >
                        {s.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <ChipSelect<SignerScheme>
              value={supervisorScheme}
              options={SCHEME_OPTIONS}
              onChange={(scheme) => {
                setSupervisorScheme(scheme);
                // Switching to 'site' clears the cert number (it's not used);
                // switching to sprat/irata re-normalizes any in-progress cert.
                if (scheme === 'site') {
                  setSupervisorCertNumber('');
                } else {
                  setSupervisorCertNumber(
                    scheme === 'irata'
                      ? formatIrataNumber(supervisorIrataLevel, supervisorCertNumber)
                      : normalizeSpratNumber(supervisorCertNumber),
                  );
                }
              }}
            />

            <Field
              label="Supervisor name"
              value={supervisorName}
              onChangeText={setSupervisorName}
              placeholder="Jordan Lee"
              autoCapitalize="words"
            />
            {isSiteSigner ? (
              // Site signer: capture role + employer instead of cert. The
              // audit needs both to verify signer authority on a
              // non-rope-access-certified path.
              <>
                <Field
                  label="Role"
                  value={supervisorRole}
                  onChangeText={setSupervisorRole}
                  placeholder="Safety officer / Shift lead / Superintendent"
                  autoCapitalize="words"
                  helper="Required — the signer's role at the work site."
                />
                <Field
                  label="Employer"
                  value={supervisorEmployer}
                  onChangeText={setSupervisorEmployer}
                  placeholder="Company name"
                  autoCapitalize="words"
                  helper="Required — the organisation the signer represents."
                />
              </>
            ) : (
              <>
                <Field
                  label={requiresCertNumber ? 'IRATA number' : 'SPRAT number'}
                  value={
                    requiresCertNumber
                      ? irataNumberDigits(supervisorCertNumber)
                      : normalizeSpratNumber(supervisorCertNumber)
                  }
                  onChangeText={(v) => {
                    setSupervisorCertNumber(
                      requiresCertNumber
                        ? formatIrataNumber(supervisorIrataLevel, v)
                        : normalizeSpratNumber(v),
                    );
                  }}
                  placeholder={requiresCertNumber ? '12345' : 'e.g. 1234'}
                  keyboardType="number-pad"
                  helper={
                    requiresCertNumber
                      ? `Required. Saved as ${certLevelToDigit(supervisorIrataLevel)}/12345.`
                      : 'Required — the signer\'s SPRAT card number.'
                  }
                />
                {requiresCertNumber ? (
                  <View style={{ gap: 6 }}>
                    <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>SUPERVISOR LEVEL</Text>
                    <ChipSelect<CertLevel>
                      value={supervisorIrataLevel}
                      options={IRATA_LEVELS}
                      onChange={(lvl) => {
                        setSupervisorIrataLevel(lvl);
                        setSupervisorCertNumber(formatIrataNumber(lvl, supervisorCertNumber));
                      }}
                    />
                  </View>
                ) : null}
              </>
            )}
          </View>
        </View>

        {/* SIGNATURE PAD */}
        <View>
          <SectionH
            kicker="SIGNATURE"
            title="Draw to sign"
            action={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear signature"
                onPress={() => sigPadRef.current?.clear()}
                hitSlop={8}
              >
                <Text
                  style={{
                    ...type.cardSub,
                    color: tokens.accent,
                    fontFamily: 'Manrope_600SemiBold',
                    fontWeight: '600',
                  }}
                >
                  Clear
                </Text>
              </Pressable>
            }
          />
          <SigPad
            ref={sigPadRef}
            value={signaturePath}
            onChange={setSignaturePath}
            onStrokeStart={() => setSignatureActive(true)}
            onStrokeEnd={() => setSignatureActive(false)}
          />
        </View>

        {/* ATTESTATION */}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: attestationAccepted }}
          onPress={() => setAttestationAccepted(!attestationAccepted)}
          style={({ pressed }) => [
            attestationStyle(tokens, attestationAccepted),
            pressed ? { transform: [{ scale: 0.99 }] } : null,
          ]}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              borderWidth: 1.5,
              borderColor: attestationAccepted ? tokens.ok : tokens.line,
              backgroundColor: attestationAccepted ? tokens.ok : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {attestationAccepted ? (
              <IconCheck size={17} color={tokens.bg} fill={tokens.bg} />
            ) : null}
          </View>
          <Text style={{ ...type.cardSub, color: tokens.text, flex: 1, lineHeight: 19 }}>
            {ATTESTATION_TEXT}
          </Text>
        </Pressable>
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 12 + insets.bottom,
          borderTopWidth: 1,
          borderTopColor: tokens.lineSoft,
          backgroundColor: tokens.bg,
        }}
      >
        <Button variant="ghost" onPress={() => router.back()}>
          Cancel
        </Button>
        <Button
          variant="primary"
          full
          onPress={submit}
          disabled={!canSign || signEntry.isPending}
        >
          {signEntry.isPending ? 'Sealing…' : 'Seal in chain'}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

function formatChainShort(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-4)}`;
}

function knownChipStyle(
  tokens: ReturnType<typeof useTheme>['tokens'],
  selected: boolean,
): ViewStyle {
  return {
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: selected ? tokens.accent : tokens.surface2,
    borderWidth: 1,
    borderColor: selected ? tokens.accent : tokens.lineSoft,
  };
}

function attestationStyle(
  tokens: ReturnType<typeof useTheme>['tokens'],
  accepted: boolean,
): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: accepted ? tokens.ok : tokens.lineSoft,
    backgroundColor: accepted ? tokens.okSoft : tokens.surface,
  };
}

function Row({
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
  const { tokens } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 8,
        gap: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: tokens.lineSoft,
      }}
    >
      <Text style={{ ...type.monoKicker, color: tokens.textFaint, width: 92 }}>
        {label.toUpperCase()}
      </Text>
      <Text
        selectable
        style={[
          mono ? type.mono : type.body,
          { color: tokens.text, flex: 1 },
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

// Multi-line block for the long-form fields in the Work Record card
// (rescue cover, hazards, notes). Same kicker treatment as `Row` but the
// body is full-width with no row-length truncation.
function WorkRecordBlock({ label, body }: { label: string; body: string }) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: tokens.lineSoft,
      }}
    >
      <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 4 }}>
        {label.toUpperCase()}
      </Text>
      <Text selectable style={{ ...type.body, color: tokens.text }}>
        {body}
      </Text>
    </View>
  );
}

