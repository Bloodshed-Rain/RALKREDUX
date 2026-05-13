import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { CheckCircle2, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react-native';
import { certLevelToDigit, formatIrataNumber, irataNumberDigits, normalizeSpratNumber } from '@/src/domain/cert-number';
import { useCreateProfile } from '@/src/domain/profile/use-profile';
import type { CertLevel, CertScheme } from '@/src/domain/profile/types';
import {
  AnimatedStamp,
  Chip,
  DateField,
  DocActionButton,
  DocBand,
  Field,
  Screen,
  SectionH,
} from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

const schemes: CertScheme[] = ['sprat', 'irata'];
const levels: CertLevel[] = ['I', 'II', 'III'];

export default function SetupScreen() {
  const { spacing, typography, touchTarget, tidewater, hairlines } = useTheme();
  const createProfile = useCreateProfile();
  const [fullName, setFullName] = React.useState('');
  const [scheme, setScheme] = React.useState<CertScheme>('sprat');
  const [level, setLevel] = React.useState<CertLevel>('II');
  const [certId, setCertId] = React.useState('');
  const [expiresOn, setExpiresOn] = React.useState('');
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  const canContinue = fullName.trim().length > 1;
  const hasCertDetails = certId.trim().length > 0 || expiresOn.trim().length > 0;
  const certNumberInputValue = scheme === 'irata' ? irataNumberDigits(certId) : normalizeSpratNumber(certId);
  const certNumberValid = scheme === 'sprat' || certNumberInputValue.length === 5 || certNumberInputValue.length === 0;

  function submit() {
    if (!canContinue) return;
    const spratNumber = normalizeSpratNumber(certId);
    const irataNumber = formatIrataNumber(level, certId);
    createProfile.mutate(
      {
        full_name: fullName,
        primary_scheme: scheme,
        sprat_id: scheme === 'sprat' ? spratNumber || null : null,
        sprat_level: scheme === 'sprat' ? level : null,
        sprat_expires_on: scheme === 'sprat' ? expiresOn || null : null,
        irata_id: scheme === 'irata' ? irataNumber || null : null,
        irata_level: scheme === 'irata' ? level : null,
        irata_expires_on: scheme === 'irata' ? expiresOn || null : null,
      },
      { onSuccess: () => router.replace('/today') },
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: 'Set up' }} />
      <Screen
        padded={false}
        safeTop
        footer={
          <DocActionButton
            title={canContinue ? 'CREATE LOGBOOK' : 'ADD YOUR NAME'}
            icon={ShieldCheck}
            onPress={submit}
            disabled={!canContinue}
            loading={createProfile.isPending}
          />
        }
      >
        <DocBand
          variant="top"
          formId="CH.0 - LOGBOOK SETUP"
          rev="FIRST RUN"
          effective="ENTRY-HASH v2"
          rightLabel={canContinue ? 'READY' : 'PENDING'}
        />

        <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.base, gap: spacing.lg }}>
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
                  LOGBOOK SETUP
                </Text>
                <Text selectable style={{ ...typography.displayMd, color: tidewater.ink }} numberOfLines={2}>
                  {fullName.trim() || 'Your logbook'}
                </Text>
                <Text style={{ ...typography.monoSm, color: tidewater.ink2 }}>
                  WELCOME · OFFLINE-FIRST ROPE ACCESS LEDGER
                </Text>
              </View>
              <AnimatedStamp tone={canContinue ? 'green' : 'yellow'} rotation="light">
                {canContinue ? 'READY' : 'PENDING'}
              </AnimatedStamp>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, padding: spacing.md }}>
              <Chip tone="ink">{`${scheme.toUpperCase()} ${level}`}</Chip>
              <Chip tone="mute">{expiresOn.trim() ? `EXPIRES ${expiresOn}` : 'EXPIRY LATER'}</Chip>
              {hasCertDetails ? <Chip tone="green">CERT DETAILS ADDED</Chip> : null}
            </View>
          </View>

          {/* § 01 Identity */}
          <View>
            <SectionH n="01" right={canContinue ? 'OK' : 'REQUIRED'}>
              Identity
            </SectionH>
            <Field
              label="Full name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Alex Morgan"
              invalid={!canContinue && fullName.length > 0}
            />
          </View>

          {/* § 02 Certification */}
          <View>
            <SectionH n="02" right={scheme.toUpperCase()}>
              Certification
            </SectionH>
            <View style={{ gap: spacing.md }}>
              <View style={{ gap: spacing.xs }}>
                <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.5 }}>
                  PRIMARY SCHEME
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {schemes.map((item) => (
                    <SegmentButton
                      key={item}
                      label={item.toUpperCase()}
                      selected={item === scheme}
                      onPress={() => {
                        if (item !== scheme) {
                          setCertId('');
                        } else {
                          setCertId(
                            item === 'irata' ? formatIrataNumber(level, certId) : normalizeSpratNumber(certId),
                          );
                        }
                        setScheme(item);
                      }}
                    />
                  ))}
                </View>
              </View>

              <View style={{ gap: spacing.xs }}>
                <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.5 }}>
                  LEVEL
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {levels.map((item) => (
                    <SegmentButton
                      key={item}
                      label={`LEVEL ${item}`}
                      selected={item === level}
                      onPress={() => {
                        setLevel(item);
                        if (scheme === 'irata') {
                          setCertId(formatIrataNumber(item, certId));
                        }
                      }}
                    />
                  ))}
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => setDetailsOpen((current) => !current)}
                style={({ pressed }) => ({
                  minHeight: touchTarget.min,
                  borderWidth: 1.5,
                  borderColor: hasCertDetails ? tidewater.green : tidewater.hair,
                  backgroundColor: hasCertDetails ? tidewater.greenSoft : tidewater.white,
                  opacity: pressed ? 0.82 : 1,
                  paddingHorizontal: spacing.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: spacing.sm,
                })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
                  <CheckCircle2
                    size={18}
                    color={hasCertDetails ? tidewater.green : tidewater.ink3}
                    strokeWidth={2.2}
                  />
                  <Text style={{ ...typography.displaySm, color: tidewater.ink, letterSpacing: 1.2 }}>
                    {hasCertDetails ? 'CERT DETAILS ADDED' : 'CERT DETAILS (OPTIONAL)'}
                  </Text>
                </View>
                {detailsOpen ? (
                  <ChevronUp size={18} color={tidewater.ink2} strokeWidth={2.2} />
                ) : (
                  <ChevronDown size={18} color={tidewater.ink2} strokeWidth={2.2} />
                )}
              </Pressable>

              {detailsOpen ? (
                <View style={{ gap: spacing.md }}>
                  <Field
                    label={scheme === 'irata' ? `IRATA number (${certLevelToDigit(level)}/12345)` : 'SPRAT number'}
                    value={certNumberInputValue}
                    onChangeText={(value) => {
                      setCertId(scheme === 'irata' ? formatIrataNumber(level, value) : normalizeSpratNumber(value));
                    }}
                    placeholder={scheme === 'irata' ? '12345' : 'Optional'}
                    keyboardType="number-pad"
                    maxLength={scheme === 'irata' ? 5 : 12}
                    invalid={!certNumberValid}
                    hint={
                      scheme === 'irata'
                        ? `Required digits saved as ${certLevelToDigit(level)}/12345.`
                        : 'Optional for SPRAT.'
                    }
                        />
                  <DateField
                    label="Expires on"
                    value={expiresOn}
                    onChange={setExpiresOn}
                    placeholder="Expiry later"
                    optional
                  />
                </View>
              ) : null}
            </View>
          </View>

          {/* § 03 What this builds */}
          <View>
            <SectionH n="03">What this builds</SectionH>
            <View
              style={{
                borderWidth: 1.5,
                borderColor: tidewater.hair,
                backgroundColor: tidewater.white,
                padding: spacing.md,
                gap: spacing.xs,
              }}
            >
              <BulletLine>Local-first SQLite ledger on your device.</BulletLine>
              <BulletLine>Audit-grade signed entries with hash chain.</BulletLine>
              <BulletLine>Local + remote signing flows for supervisors.</BulletLine>
              <BulletLine>Gear inventory and inspection schedule.</BulletLine>
            </View>
          </View>
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <DocBand
            variant="footer"
            text={
              canContinue
                ? 'PROFILE WILL SEED THE LOCAL LEDGER - HASH-CHAIN STARTS AT GENESIS'
                : 'SETUP HOLD - ADD YOUR NAME BEFORE CREATING THE LOGBOOK'
            }
            page="FIRST RUN"
          />
        </View>
      </Screen>
    </>
  );
}

function SegmentButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { spacing, typography, touchTarget, tidewater } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: touchTarget.min,
        borderWidth: 1.5,
        borderColor: selected ? tidewater.accent : tidewater.hair,
        backgroundColor: selected ? tidewater.accent : tidewater.white,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
        opacity: pressed ? 0.82 : 1,
      })}
    >
      <Text
        selectable={false}
        style={{
          ...typography.displaySm,
          color: selected ? tidewater.paper : tidewater.ink2,
          letterSpacing: 1.5,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function BulletLine({ children }: { children: string }) {
  const { spacing, typography, tidewater } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
      <Text style={{ ...typography.monoSm, color: tidewater.ink3 }}>·</Text>
      <Text style={{ ...typography.body, color: tidewater.ink, flex: 1 }}>{children}</Text>
    </View>
  );
}

