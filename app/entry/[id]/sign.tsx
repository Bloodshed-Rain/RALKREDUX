import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { PenLine } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import {
  certLevelToDigit,
  formatIrataNumber,
  inferSchemeFromCertNumber,
  irataLevelFromNumber,
  irataNumberDigits,
  normalizeSpratNumber,
} from '@/src/domain/cert-number';
import { getEntryVerificationReadiness } from '@/src/domain/logbook/entry-readiness';
import { useEntryDetail, useSignEntryLocal, useSupervisorContacts } from '@/src/domain/logbook/use-logbook';
import type { CertLevel, CertScheme } from '@/src/domain/profile/types';
import { AnimatedStamp, CheckboxRow, Chip, DocActionButton, DocBand, Field, Screen, SectionH, SignaturePad } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

const ATTESTATION_TEXT = 'I verify this entry matches the work performed and I am authorized to sign it.';

export default function LocalSignScreen() {
  const { spacing, typography, touchTarget, tidewater, hairlines } = useTheme();
  const { id, supervisorId } = useLocalSearchParams<{
    id?: string | string[];
    supervisorId?: string | string[];
  }>();
  const entryId = firstParam(id);
  const supervisorIdParam = firstParam(supervisorId);
  const detail = useEntryDetail(entryId);
  const signEntry = useSignEntryLocal();
  const supervisors = useSupervisorContacts();
  const [supervisorName, setSupervisorName] = React.useState('');
  const [supervisorScheme, setSupervisorScheme] = React.useState<CertScheme>('sprat');
  const [supervisorCertNumber, setSupervisorCertNumber] = React.useState('');
  const [supervisorIrataLevel, setSupervisorIrataLevel] = React.useState<CertLevel>('II');
  const [signaturePath, setSignaturePath] = React.useState('');
  const [signatureActive, setSignatureActive] = React.useState(false);
  const [attestationAccepted, setAttestationAccepted] = React.useState(false);
  const didPrefillSupervisor = React.useRef(false);

  const entry = detail.data?.entry;
  const readiness = entry ? getEntryVerificationReadiness(entry) : null;
  const requiresCertNumber = supervisorScheme === 'irata';

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
    (supervisor) =>
      supervisor.name === supervisorName &&
      (requiresCertNumber
        ? irataNumberDigits(supervisor.cert_number ?? '') === irataNumberDigits(supervisorCertNumber)
        : normalizeSpratNumber(supervisor.cert_number ?? '') === normalizeSpratNumber(supervisorCertNumber)),
  );
  const signatureReady = signaturePath.trim().length > 0 && attestationAccepted;
  const canSign =
    Boolean(entryId) &&
    entry?.status === 'draft' &&
    readiness?.ready === true &&
    supervisorName.trim().length > 1 &&
    (!requiresCertNumber || irataNumberDigits(supervisorCertNumber).length === 5) &&
    signatureReady;
  function submit() {
    if (!canSign || !entryId) return;
    signEntry.mutate(
      {
        entry_id: entryId,
        supervisor_name: supervisorName,
        supervisor_scheme: supervisorScheme,
        supervisor_cert_number: requiresCertNumber
          ? formatIrataNumber(supervisorIrataLevel, supervisorCertNumber)
          : normalizeSpratNumber(supervisorCertNumber),
        signature_path: signaturePath,
        attestation_accepted: attestationAccepted,
        signer_attestation: ATTESTATION_TEXT,
      },
      { onSuccess: (signed) => router.replace(`/entry/${signed.entry.id}`) },
    );
  }

  return (
    <Screen
      padded={false}
      weave
      preserveChildTouches
      scrollEnabled={!signatureActive}
      footer={
        <DocActionButton
          title={canSign ? 'SIGN ENTRY' : 'FINISH SIGN-OFF'}
          icon={PenLine}
          onPress={submit}
          disabled={!canSign}
          loading={signEntry.isPending}
        />
      }
    >
      <DocBand
        variant="top"
        formId="CH.5 - LOCAL SIGN"
        rev={entry?.status === 'draft' ? 'DRAFT ENTRY' : 'LOCKED ENTRY'}
        effective="ENTRY-HASH v2"
        rightLabel={canSign ? 'READY' : 'HOLD'}
      />

      <View style={{ paddingHorizontal: spacing.base, gap: spacing.lg }}>
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
                ENTRY READY CHECK
              </Text>
              <Text style={{ ...typography.displayMd, color: tidewater.ink }} numberOfLines={2}>
                {entry?.site || 'Loading entry'}
              </Text>
            </View>
            <AnimatedStamp tone={readiness?.ready ? 'green' : 'yellow'} rotation="light">
              {readiness?.ready ? 'READY' : 'PENDING'}
            </AnimatedStamp>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, padding: spacing.md }}>
            <Chip tone="ink">{entry?.site || 'LOADING'}</Chip>
            <Chip tone="mute">{entry ? `${entry.work_hours.toFixed(1)} HR` : '0.0 HR'}</Chip>
            <Chip tone={readiness?.ready ? 'green' : 'yellow'}>
              {readiness?.ready ? 'READY TO SIGN' : `${readiness?.missingFields.length ?? 0} MISSING`}
            </Chip>
          </View>
          {entry?.status === 'draft' && readiness && !readiness.ready ? (
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: tidewater.hairFaint,
                backgroundColor: tidewater.yellowSoft,
                padding: spacing.md,
              }}
            >
              <Text selectable style={{ ...typography.displaySm, color: tidewater.ink, letterSpacing: 1.2 }}>
                FINISH THE ENTRY FIRST
              </Text>
              <Text selectable style={{ ...typography.monoSm, color: tidewater.ink2, marginTop: 4 }}>
                Add {readiness.missingFields.join(', ')}
              </Text>
            </View>
          ) : null}
        </View>

        <View>
          <SectionH n="15" right={selectedKnownSupervisor ? 'KNOWN' : 'MANUAL'}>
            Supervisor
          </SectionH>
          {supervisors.data?.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm }}>
              {supervisors.data.map((supervisor) => {
                const selected = supervisor.id === selectedKnownSupervisor?.id;

                return (
                  <Pressable
                    key={supervisor.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      const inferredScheme =
                        inferSchemeFromCertNumber(supervisor.cert_number) ?? supervisorScheme;
                      setSupervisorScheme(inferredScheme);
                      setSupervisorName(supervisor.name);
                      const level = irataLevelFromNumber(supervisor.cert_number, supervisorIrataLevel);
                      setSupervisorIrataLevel(level);
                      setSupervisorCertNumber(
                        inferredScheme === 'irata'
                          ? irataNumberDigits(supervisor.cert_number ?? '')
                          : normalizeSpratNumber(supervisor.cert_number ?? ''),
                      );
                    }}
                    style={({ pressed }) => ({
                      minHeight: touchTarget.min,
                      justifyContent: 'center',
                      borderWidth: 1.5,
                      borderColor: selected ? tidewater.accent : tidewater.hair,
                      backgroundColor: selected ? tidewater.accentSoft : tidewater.white,
                      opacity: pressed ? 0.82 : 1,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 6,
                    })}
                  >
                    <Text
                      selectable={false}
                      style={{
                        ...typography.monoSm,
                        color: selected ? tidewater.accent : tidewater.ink2,
                        fontFamily: 'IBMPlexMono_600SemiBold',
                        fontWeight: '600',
                      }}
                    >
                      {supervisor.name.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          <View style={{ gap: spacing.md }}>
            <Field
              label="Supervisor name"
              value={supervisorName}
              onChangeText={setSupervisorName}
              placeholder="Jordan Lee"
              invalid={supervisorName.trim().length <= 1}
            />
            <View style={{ gap: spacing.xs }}>
              <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.5 }}>
                SUPERVISOR'S SCHEME
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {(['sprat', 'irata'] as const).map((scheme) => (
                  <LevelChip
                    key={scheme}
                    label={scheme.toUpperCase()}
                    selected={scheme === supervisorScheme}
                    onPress={() => {
                      setSupervisorScheme(scheme);
                      // Re-format the stored cert number for the new scheme so
                      // toggling doesn't strand IRATA digits in SPRAT context.
                      setSupervisorCertNumber(
                        scheme === 'irata'
                          ? formatIrataNumber(supervisorIrataLevel, supervisorCertNumber)
                          : normalizeSpratNumber(supervisorCertNumber),
                      );
                    }}
                  />
                ))}
              </View>
            </View>
            <Field
              label={requiresCertNumber ? 'IRATA number' : 'SPRAT number'}
              value={requiresCertNumber ? irataNumberDigits(supervisorCertNumber) : normalizeSpratNumber(supervisorCertNumber)}
              onChangeText={(value) => {
                setSupervisorCertNumber(requiresCertNumber ? formatIrataNumber(supervisorIrataLevel, value) : normalizeSpratNumber(value));
              }}
              placeholder={requiresCertNumber ? '12345' : 'Optional'}
              keyboardType="number-pad"
              maxLength={requiresCertNumber ? 5 : 12}
              invalid={requiresCertNumber && irataNumberDigits(supervisorCertNumber).length !== 5}
              hint={requiresCertNumber
                ? `Required for IRATA supervisors. Saved as ${certLevelToDigit(supervisorIrataLevel)}/12345.`
                : 'Optional for SPRAT supervisors. Add it if the signer has a SPRAT card number.'}
            />
            {requiresCertNumber ? (
              <View style={{ gap: spacing.xs }}>
                <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.5 }}>
                  SUPERVISOR'S LEVEL
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {(['I', 'II', 'III'] as const).map((level) => (
                    <LevelChip
                      key={level}
                      label={certLevelToDigit(level)}
                      selected={level === supervisorIrataLevel}
                      onPress={() => {
                        setSupervisorIrataLevel(level);
                        setSupervisorCertNumber(formatIrataNumber(level, supervisorCertNumber));
                      }}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        </View>

        <View>
          <SectionH n="16" right={signatureReady ? 'READY' : 'REQUIRED'}>
            Signature and attestation
          </SectionH>
          <View style={{ gap: spacing.md }}>
            <SignaturePad
              label="Draw signature"
              value={signaturePath}
              onChange={setSignaturePath}
              height={240}
              onStrokeStart={() => setSignatureActive(true)}
              onStrokeEnd={() => setSignatureActive(false)}
            />
            <View
              style={{
                borderWidth: 1.5,
                borderColor: signatureReady ? tidewater.green : tidewater.hairSoft,
                backgroundColor: signatureReady ? tidewater.greenSoft : tidewater.white,
                padding: spacing.sm,
              }}
            >
              <CheckboxRow
                checked={attestationAccepted}
                label={ATTESTATION_TEXT}
                onChange={setAttestationAccepted}
              />
            </View>
          </View>
        </View>

        {entry?.status && entry.status !== 'draft' ? (
          <Text selectable style={{ ...typography.body, color: tidewater.ink2 }}>
            Signed and amended records are locked.
          </Text>
        ) : null}
      </View>

      <DocBand
        variant="footer"
        text={canSign ? 'SIGNATURE WILL LOCK THIS DRAFT INTO THE LOCAL HASH CHAIN' : 'LOCAL SIGNATURE HOLD - COMPLETE REQUIRED FIELDS'}
        page={entryId ? `ENTRY ${entryId.slice(-6).toUpperCase()}` : 'ENTRY ------'}
      />
    </Screen>
  );
}

function LevelChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { spacing, typography, touchTarget, tidewater } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: touchTarget.min,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: selected ? tidewater.accent : tidewater.hair,
        backgroundColor: selected ? tidewater.accent : tidewater.white,
        opacity: pressed ? 0.82 : 1,
        paddingHorizontal: spacing.md,
      })}
    >
      <Text selectable={false} style={{ ...typography.displaySm, color: selected ? tidewater.paper : tidewater.ink2 }}>
        Level {label}
      </Text>
    </Pressable>
  );
}

