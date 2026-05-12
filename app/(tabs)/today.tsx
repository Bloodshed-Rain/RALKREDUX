import React from 'react';
import { Pressable, RefreshControl, Text, View } from 'react-native';
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
import { DocBand, Screen, Stamp } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

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

  const [acknowledgedIds, setAcknowledgedIds] = React.useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = React.useState(false);

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
              <Text
                style={{
                  fontFamily: 'Archivo_900Black',
                  fontSize: 64,
                  lineHeight: 60,
                  color: tidewater.ink,
                  fontWeight: '900',
                  letterSpacing: -1,
                }}
              >
                {hoursParts.whole}
              </Text>
              <Text
                style={{
                  fontFamily: 'Archivo_900Black',
                  fontSize: 30,
                  lineHeight: 32,
                  color: tidewater.accent,
                  fontWeight: '900',
                  marginLeft: 4,
                  paddingBottom: 4,
                }}
              >
                .{hoursParts.decimal}
              </Text>
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
              setAcknowledgedIds((s) => {
                const next = new Set(s);
                next.add(id);
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
              <Stamp tone="green" rotation="standard">{`SIGNED ${formatStampDate(today)}`}</Stamp>
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
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
        <Text
          style={{
            fontFamily: 'Archivo_900Black',
            fontSize: 28,
            lineHeight: 30,
            color: tidewater.ink,
            fontWeight: '900',
          }}
        >
          {pct}
        </Text>
        <Text style={{ ...typography.monoMd, color: tidewater.accent, fontWeight: '600', marginLeft: 2 }}>
          %
        </Text>
      </View>
      <View
        style={{
          marginTop: spacing.xs,
          height: 4,
          backgroundColor: tidewater.paper2,
          borderWidth: 1,
          borderColor: tidewater.hair,
        }}
      >
        <View style={{ height: '100%', width: `${pct}%`, backgroundColor: accent }} />
      </View>
      <Text style={{ ...typography.monoSm, color: tidewater.ink3, marginTop: 4, textAlign: 'right' }}>
        {value} / {progress.target} HR
      </Text>
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
            <Pressable
              onLongPress={() => onAcknowledge(advisory.id)}
              delayLongPress={1200}
              style={{
                flex: 1,
                borderWidth: 1.5,
                borderColor: tidewater.ink3,
                paddingVertical: 8,
                paddingHorizontal: spacing.sm,
                alignItems: 'center',
              }}
            >
              <Text style={{ ...typography.displaySm, color: tidewater.ink2, letterSpacing: 1.5 }}>
                HOLD TO ACK
              </Text>
            </Pressable>
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
