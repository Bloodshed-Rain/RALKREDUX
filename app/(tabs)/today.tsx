import React from 'react';
import { Animated, Easing, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, ShieldAlert } from 'lucide-react-native';
import {
  useCareerStats,
  useChainHead,
  useDashboardSummary,
  useEntries,
} from '@/src/domain/logbook/use-logbook';
import { useGearItems } from '@/src/domain/gear/use-gear';
import { useProfile } from '@/src/domain/profile/use-profile';
import {
  applyCertRatio,
  buildActions,
  buildAdvisories,
  certTarget,
  computeDayOf365,
  distinctOpDaysLast30,
  isSignedToday,
  signedHoursLast30Days,
  splitDecimal,
  type ActionItem,
  type AdvisoryItem,
  type AdvisoryTone,
  type CertProgress,
} from '@/src/domain/logbook/today-derivations';
import { AnimatedCounter, AnimatedStamp, DocBand, LoadGauge, Screen } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';
import {
  acknowledgedIdSet,
  pruneAcks,
  withAck,
  type AdvisoryAckMap,
} from '@/src/storage/advisory-acks';
import { PrefKeys, readPref, writePref } from '@/src/storage/local-prefs';

function formatEffective(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}.${month}.${day}`;
}

function formatStampDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}·${month}·${year}`;
}

function pluralize(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

export default function TodayScreen() {
  const queryClient = useQueryClient();
  const profile = useProfile();
  const summary = useDashboardSummary();
  const career = useCareerStats();
  const chainHead = useChainHead();
  const entries = useEntries();
  const gear = useGearItems();
  const { tidewater, typography, spacing, hairlines } = useTheme();

  // Persisted across launches; expired entries (>24h) are pruned on load so a
  // still-unresolved advisory re-surfaces rather than staying silently hidden.
  const [ackMap, setAckMap] = React.useState<AdvisoryAckMap>({});
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    readPref<AdvisoryAckMap>(PrefKeys.advisoryAcks, {}).then((stored) => {
      if (cancelled) return;
      const pruned = pruneAcks(stored, new Date());
      setAckMap(pruned);
      // Write the pruned map back so stale entries don't accumulate on disk.
      if (Object.keys(pruned).length !== Object.keys(stored).length) {
        writePref(PrefKeys.advisoryAcks, pruned);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['chainHead'] });
      queryClient.invalidateQueries({ queryKey: ['gearItems'] });
    }, [queryClient]),
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['entries'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] }),
      queryClient.invalidateQueries({ queryKey: ['careerStats'] }),
      queryClient.invalidateQueries({ queryKey: ['chainHead'] }),
      queryClient.invalidateQueries({ queryKey: ['gearItems'] }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  if (!profile.data) return null;

  const profileData = profile.data;
  const today = new Date();
  const dayOf365 = computeDayOf365(profileData.created_at, today);
  const signedHours = career.data?.signedHours ?? 0;
  const hoursParts = splitDecimal(signedHours);
  const entriesData = entries.data ?? [];
  const gearData = gear.data ?? [];

  const last30Hours = signedHoursLast30Days(entriesData, today);
  const opDays30 = distinctOpDaysLast30(entriesData, today);
  const avgPerDay = opDays30 > 0 ? last30Hours / opDays30 : 0;

  const spratProgress = profileData.sprat_level ? applyCertRatio(certTarget('sprat', profileData.sprat_level)!, signedHours) : null;
  const irataProgress = profileData.irata_level ? applyCertRatio(certTarget('irata', profileData.irata_level)!, signedHours) : null;

  const allAdvisories = buildAdvisories({
    gear: gearData,
    expiringCerts: summary.data?.expiringCerts ?? [],
    today,
  });
  const acknowledgedIds = acknowledgedIdSet(ackMap, today);
  const visibleAdvisories = allAdvisories.filter((adv) => !acknowledgedIds.has(adv.id));
  const headAdvisory = visibleAdvisories[0] ?? null;
  const advisoriesBehind = Math.max(0, visibleAdvisories.length - 1);

  const actions = buildActions({
    summary: summary.data,
    overdueGearItems: summary.data?.overdueGearItems ?? 0,
    dueSoonGearItems: summary.data?.dueSoonGearItems ?? 0,
  });
  const visibleActions = actions.slice(0, 3);
  const ghostRungCount = actions.length === 1 ? 2 : 0;
  const moreActionCount = Math.max(0, actions.length - 3);

  const signedTodayCount = entriesData.filter((entry) => isSignedToday(entry, today)).length;
  const deltaArrow = last30Hours > 0 ? '▲' : '■';
  const deltaTone = last30Hours > 0 ? tidewater.green : tidewater.ink3;

  return (
    <Screen
      padded={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tidewater.ink} />}
    >
      <DocBand
        variant="top"
        formId="CH.1 · BRIEFING"
        rev={`DAY ${String(dayOf365).padStart(3, '0')} / 365`}
        effective={`EFF ${formatEffective(today)}`}
        rightLabel="—"
      />

      <View style={{ paddingHorizontal: spacing.base, gap: spacing.lg }}>
        {/* Hours hero */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            borderBottomWidth: 1.5,
            borderBottomColor: tidewater.hair,
            paddingBottom: spacing.sm,
          }}
        >
          <View>
            <Text
              style={{
                ...typography.monoSm,
                color: tidewater.ink3,
                letterSpacing: 1.8,
              }}
            >
              CUMULATIVE ROPE HR
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 }}>
              <AnimatedCounter
                cacheKey="today-hours-whole"
                text={String(hoursParts.whole)}
                fontFamily="Archivo_900Black"
                fontSize={64}
                fontWeight="900"
                letterSpacing={-1}
                color={tidewater.ink}
                height={64}
                width={44}
              />
              <View style={{ marginLeft: 4, paddingBottom: 4 }}>
                <AnimatedCounter
                  cacheKey="today-hours-decimal"
                  text={`.${hoursParts.decimal}`}
                  fontFamily="Archivo_900Black"
                  fontSize={30}
                  fontWeight="900"
                  color={tidewater.accent}
                  height={32}
                  width={22}
                />
              </View>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ ...typography.monoMd, color: deltaTone, fontWeight: '600' }}>
              {deltaArrow} +{last30Hours.toFixed(1)} / 30d
            </Text>
            <Text style={{ ...typography.monoSm, color: tidewater.ink3, marginTop: 2 }}>
              avg {avgPerDay.toFixed(1)} hr/op-day
            </Text>
          </View>
        </View>

        {/* Cert progress */}
        <CertSection sprat={spratProgress} irata={irataProgress} />

        {/* Advisory */}
        {headAdvisory ? (
          <AdvisoryCard
            advisory={headAdvisory}
            behindCount={advisoriesBehind}
            onAcknowledge={(id) =>
              setAckMap((s) => {
                const next = withAck(s, id, new Date());
                writePref(PrefKeys.advisoryAcks, next);
                return next;
              })
            }
          />
        ) : (
          <View
            style={{
              borderWidth: hairlines.soft.width,
              borderColor: hairlines.soft.color,
              padding: spacing.md,
            }}
          >
            <Text style={{ ...typography.displaySm, color: tidewater.ink3, letterSpacing: 1.5 }}>
              ALL CLEAR · LEDGER QUIET
            </Text>
            <Text style={{ ...typography.monoSm, color: tidewater.ink3, marginTop: 4 }}>
              No advisories. Chain intact.
            </Text>
          </View>
        )}

        {/* Today's actions ladder */}
        <View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              borderBottomWidth: 1.5,
              borderBottomColor: tidewater.hair,
              paddingBottom: spacing.xs,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
              <Text style={{ ...typography.monoSm, color: tidewater.ink3 }}>§ 03</Text>
              <Text style={{ ...typography.displaySm, color: tidewater.ink, letterSpacing: 1.2 }}>
                TODAY'S ACTIONS
              </Text>
            </View>
            {moreActionCount > 0 ? (
              <Text style={{ ...typography.monoSm, color: tidewater.ink3 }}>
                +{moreActionCount} more
              </Text>
            ) : null}
          </View>
          <View style={{ marginTop: spacing.xs }}>
            {visibleActions.map((action, index) => (
              <ActionRow key={action.id} action={action} index={index} />
            ))}
            {Array.from({ length: ghostRungCount }).map((_, i) => (
              <GhostRow
                key={`ghost-${i}`}
                index={visibleActions.length + i}
                label={i === 0 ? 'Pending requests will appear here' : 'Gear checks will appear here'}
              />
            ))}
          </View>
        </View>

        {/* Signed today */}
        {signedTodayCount > 0 ? (
          <View
            style={{
              borderWidth: 1.5,
              borderColor: tidewater.green,
              backgroundColor: tidewater.greenSoft,
              padding: spacing.md,
              position: 'relative',
            }}
          >
            <View style={{ position: 'absolute', top: -16, right: spacing.md }}>
              <AnimatedStamp tone="green" rotation="standard">{`SIGNED ${formatStampDate(today)}`}</AnimatedStamp>
            </View>
            <Text style={{ ...typography.displaySm, color: tidewater.green, letterSpacing: 1.2 }}>
              ✓ {signedTodayCount} RECORD{signedTodayCount > 1 ? 'S' : ''} SIGNED TODAY
            </Text>
            <Text style={{ ...typography.monoSm, color: tidewater.ink2, marginTop: 4 }}>
              Hash chain extended - local ledger updated
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ marginTop: spacing.lg }}>
        <DocBand
          variant="footer"
          page={`REV 2 · ENTRY-HASH v2`}
          text={
            chainHead.data
              ? `LEDGER HEAD · ${chainHead.data.slice(0, 12)}…`
              : 'LEDGER HEAD · — · AWAITING FIRST SIGNATURE'
          }
        />
      </View>
    </Screen>
  );
}

function CertSection({ sprat, irata }: { sprat: CertProgress | null; irata: CertProgress | null }) {
  const { tidewater, typography, spacing, hairlines } = useTheme();

  if (!sprat && !irata) {
    return (
      <View
        style={{
          borderWidth: hairlines.standard.width,
          borderColor: hairlines.standard.color,
          padding: spacing.md,
        }}
      >
        <Text style={{ ...typography.displaySm, color: tidewater.ink, letterSpacing: 1.2 }}>
          CERTIFICATION NOT SET
        </Text>
        <Text style={{ ...typography.monoSm, color: tidewater.ink3, marginTop: 4 }}>
          Set scheme in Profile §17 to track progression.
        </Text>
      </View>
    );
  }

  const single = !sprat || !irata;
  return (
    <View style={{ flexDirection: single ? 'column' : 'row', gap: spacing.sm }}>
      {sprat ? <CertDial progress={sprat} /> : null}
      {irata ? <CertDial progress={irata} /> : null}
    </View>
  );
}

function CertDial({ progress }: { progress: CertProgress }) {
  const { tidewater, typography, spacing, hairlines } = useTheme();
  const pct = Math.round(progress.ratio * 100);
  const accent = progress.scheme === 'sprat' ? tidewater.ink2 : tidewater.green;
  const value = Math.round(progress.target * progress.ratio);

  return (
    <View
      style={{
        flex: 1,
        borderWidth: hairlines.standard.width,
        borderColor: hairlines.standard.color,
        padding: spacing.sm,
        gap: spacing.xs,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={{ ...typography.monoSm, color: tidewater.ink3, fontWeight: '600' }}>
          {progress.schemeLabel}
        </Text>
        <Text style={{ ...typography.monoSm, color: accent, fontWeight: '600' }}>
          {progress.targetLabel}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <LoadGauge value={progress.ratio} size={92} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <AnimatedCounter
              cacheKey={`today-cert-pct-${progress.scheme}`}
              text={String(pct)}
              fontFamily="Archivo_900Black"
              fontSize={32}
              fontWeight="900"
              color={tidewater.ink}
              height={34}
              width={23}
            />
            <Text style={{ ...typography.monoMd, color: tidewater.accent, fontWeight: '600', marginLeft: 2 }}>
              %
            </Text>
          </View>
          <Text style={{ ...typography.monoSm, color: tidewater.ink3, letterSpacing: 1.2 }}>
            {value} / {progress.target} HR
          </Text>
        </View>
      </View>
    </View>
  );
}

function AdvisoryCard({
  advisory,
  behindCount,
  onAcknowledge,
}: {
  advisory: AdvisoryItem;
  behindCount: number;
  onAcknowledge: (id: string) => void;
}) {
  const { tidewater, typography, spacing } = useTheme();
  const toneMap: Record<AdvisoryTone, { band: string; bandText: string; body: string; border: string }> = {
    red: { band: tidewater.red, bandText: tidewater.paper, body: tidewater.redSoft, border: tidewater.red },
    yellow: { band: tidewater.yellow, bandText: tidewater.ink, body: tidewater.yellowSoft, border: tidewater.yellowDeep },
    ink: { band: tidewater.ink, bandText: tidewater.paper, body: tidewater.paper2, border: tidewater.ink },
  };
  const tones = toneMap[advisory.tone];

  return (
    <View style={{ borderWidth: 1.5, borderColor: tones.border }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: tones.band,
          paddingHorizontal: spacing.md,
          paddingVertical: 6,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <ShieldAlert color={tones.bandText} size={14} strokeWidth={2.4} />
          <Text style={{ ...typography.displaySm, color: tones.bandText, letterSpacing: 1.5 }}>
            ADVISORY · {advisory.code}
          </Text>
        </View>
        <Text style={{ ...typography.monoSm, color: tones.bandText, fontWeight: '600' }}>
          {advisory.priority}
        </Text>
      </View>
      <View style={{ backgroundColor: tones.body, padding: spacing.md, gap: spacing.xs }}>
        <Text style={{ ...typography.displayMd, color: tidewater.ink }}>{advisory.title}</Text>
        <Text style={{ ...typography.monoSm, color: tidewater.ink2 }}>{advisory.detail}</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
          <Pressable
            onPress={() => router.push(advisory.inspectRoute as never)}
            style={{
              flex: 1,
              borderWidth: 1.5,
              borderColor: tidewater.ink,
              paddingVertical: 8,
              paddingHorizontal: spacing.sm,
              alignItems: 'center',
              backgroundColor: tidewater.white,
            }}
          >
            <Text style={{ ...typography.displaySm, color: tidewater.ink, letterSpacing: 1.5 }}>
              INSPECT →
            </Text>
          </Pressable>
          {advisory.dismissible ? (
            <HoldToAckButton onComplete={() => onAcknowledge(advisory.id)} />
          ) : null}
        </View>
        {behindCount > 0 ? (
          <Text style={{ ...typography.monoSm, color: tidewater.ink3, marginTop: spacing.xs }}>
            +{behindCount} more advisor{behindCount === 1 ? 'y' : 'ies'} in queue
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function HoldToAckButton({ onComplete }: { onComplete: () => void }) {
  const { tidewater, typography, spacing } = useTheme();
  const progress = React.useRef(new Animated.Value(0)).current;
  const completedRef = React.useRef(false);
  const animationRef = React.useRef<Animated.CompositeAnimation | null>(null);
  const [pressing, setPressing] = React.useState(false);

  function start() {
    completedRef.current = false;
    setPressing(true);
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 1200,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animationRef.current = anim;
    anim.start(({ finished }) => {
      if (finished) {
        completedRef.current = true;
        onComplete();
      }
    });
  }

  function cancel() {
    setPressing(false);
    animationRef.current?.stop();
    animationRef.current = null;
    if (!completedRef.current) {
      Animated.timing(progress, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }

  const fillWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Pressable
      onPressIn={start}
      onPressOut={cancel}
      style={{
        flex: 1,
        minHeight: 40,
        borderWidth: 1.5,
        borderColor: tidewater.ink,
        paddingVertical: 8,
        paddingHorizontal: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: tidewater.white,
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { width: fillWidth, backgroundColor: tidewater.accent },
        ]}
      />
      <Text style={{ ...typography.displaySm, color: pressing ? tidewater.paper : tidewater.ink, letterSpacing: 1.5 }}>
        {pressing ? 'HOLD…' : 'HOLD TO ACK'}
      </Text>
    </Pressable>
  );
}

function ActionRow({ action, index }: { action: ActionItem; index: number }) {
  const { tidewater, typography, spacing, hairlines } = useTheme();
  return (
    <Pressable
      onPress={() => router.push(action.route as never)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        borderBottomWidth: hairlines.faint.width,
        borderBottomColor: hairlines.faint.color,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderWidth: 1.5,
          borderColor: tidewater.ink,
          backgroundColor: action.emphasis ? tidewater.accent : tidewater.paper2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: 'Archivo_900Black',
            fontSize: 16,
            color: action.emphasis ? tidewater.paper : tidewater.ink2,
            fontWeight: '900',
          }}
        >
          {index + 1}
        </Text>
      </View>
      <Text style={{ flex: 1, ...typography.displayMd, color: tidewater.ink }}>
        {action.label}
      </Text>
      <Text style={{ ...typography.monoSm, color: tidewater.ink3 }}>§ {action.section}</Text>
      <ArrowRight color={tidewater.ink2} size={18} strokeWidth={1.8} />
    </Pressable>
  );
}

function GhostRow({ index, label }: { index: number; label: string }) {
  const { tidewater, typography, spacing, hairlines } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        borderBottomWidth: hairlines.faint.width,
        borderBottomColor: hairlines.faint.color,
        opacity: 0.4,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderWidth: 1.5,
          borderColor: tidewater.ink3,
          backgroundColor: tidewater.paper2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: 'Archivo_900Black',
            fontSize: 16,
            color: tidewater.ink3,
            fontWeight: '900',
          }}
        >
          {index + 1}
        </Text>
      </View>
      <Text style={{ flex: 1, ...typography.body, color: tidewater.ink3, fontStyle: 'italic' }}>
        {label}
      </Text>
    </View>
  );
}
