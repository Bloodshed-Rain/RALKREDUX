import React from 'react';
import { Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCareerStats,
  useChainHead,
  useDashboardSummary,
  useEntries,
} from '@/src/domain/logbook/use-logbook';
import { useProfile } from '@/src/domain/profile/use-profile';
import type { LogbookEntry } from '@/src/domain/logbook/types';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import {
  AnimatedNumber,
  Card,
  EntryRow,
  HashGlyph,
  IconBtn,
  Pill,
  PullToRefresh,
  SectionH,
  SyncChip,
  TopBar,
} from '@/src/ui/primitives/v2';
import {
  IconBell,
  IconBolt,
  IconBrand,
  IconChain,
  IconDraft,
  IconGear,
  IconSign,
  IconWarn,
  type IconProps,
} from '@/src/ui/icons';
import { haptics } from '@/src/ui/haptics';

const MS_PER_DAY = 86_400_000;

function greetingFor(date: Date, firstName: string | null | undefined): string {
  const hour = date.getHours();
  const slot = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return firstName ? `${slot}, ${firstName}.` : `${slot}.`;
}

function firstNameOf(fullName: string | undefined | null): string | null {
  if (!fullName) return null;
  const trimmed = fullName.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0];
}

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function parseDateTo(iso: string): number {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).getTime();
  }
  return Date.parse(iso);
}

function signedHoursInLastDays(entries: LogbookEntry[], today: Date, days: number): number {
  const cutoff = startOfLocalDay(today) - days * MS_PER_DAY;
  return entries
    .filter((e) => e.status === 'signed' || e.status === 'amended')
    .filter((e) => {
      const ts = parseDateTo(e.date_to);
      return Number.isFinite(ts) && ts >= cutoff;
    })
    .reduce((sum, e) => sum + (Number.isFinite(e.work_hours) ? e.work_hours : 0), 0);
}

function rowStatus(entry: LogbookEntry): 'draft' | 'signed' | 'amended' | 'pending' {
  if (entry.status === 'amended') return 'amended';
  if (entry.status === 'signed') return 'signed';
  if (entry.pending_signature_id) return 'pending';
  return 'draft';
}

export default function TodayScreen() {
  const queryClient = useQueryClient();
  const profile = useProfile();
  const summary = useDashboardSummary();
  const career = useCareerStats();
  const chainHead = useChainHead();
  const entries = useEntries();
  const { tokens } = useTheme();

  useFocusEffect(
    React.useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['chainHead'] });
      queryClient.invalidateQueries({ queryKey: ['gearItems'] });
    }, [queryClient]),
  );

  if (!profile.data) return null;

  const today = new Date();
  const profileData = profile.data;
  const firstName = firstNameOf(profileData.full_name);
  const entriesList = entries.data ?? [];

  const careerHours = career.data?.signedHours ?? 0;
  const careerEntries = career.data?.signedEntries ?? 0;
  const weekHours = signedHoursInLastDays(entriesList, today, 7);
  const monthHours = signedHoursInLastDays(entriesList, today, 30);

  const summaryData = summary.data;
  const openDrafts = summaryData?.draftEntries ?? 0;
  const awaitingSignature = summaryData?.pendingSignatureRequests ?? 0;
  const overdueGear = summaryData?.overdueGearItems ?? 0;
  const dueSoonGear = summaryData?.dueSoonGearItems ?? 0;

  const chainShort = chainHead.data
    ? `${chainHead.data.slice(0, 8)}…${chainHead.data.slice(-4)}`
    : null;

  const lastSignedEntry = entriesList.find((e) => e.status === 'signed' || e.status === 'amended');
  const lastEntryAny = entriesList[0];

  const recentEntries = entriesList.slice(0, 5);

  const onRefresh = React.useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['entries'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] }),
      queryClient.invalidateQueries({ queryKey: ['careerStats'] }),
      queryClient.invalidateQueries({ queryKey: ['chainHead'] }),
      queryClient.invalidateQueries({ queryKey: ['gearItems'] }),
    ]);
  }, [queryClient]);

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <PullToRefresh
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 132 }}
      >
        <TopBar
          title={greetingFor(today, firstName)}
          subtitle={`${weekHours.toFixed(1)}h this week · ${careerEntries} career entries`}
          large
          leading={<IconBtn icon={IconBrand} label="RALB" size="sm" />}
          trailing={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SyncChip
                state={awaitingSignature > 0 ? 'queued' : 'synced'}
                count={awaitingSignature}
              />
              <IconBtn icon={IconBell} label="Notifications" size="sm" />
            </View>
          }
        />

        <View style={{ paddingHorizontal: 20, gap: 14 }}>
          <CareerHero
            hours={careerHours}
            weekHours={weekHours}
            monthHours={monthHours}
            totalEntries={careerEntries}
          />
          <QuickLogCard
            hasLastEntry={!!lastEntryAny}
            lastEntrySite={lastEntryAny?.site ?? null}
            lastEntryTask={lastEntryAny?.work_task ?? null}
            onSameAsLast={() => {
              haptics.selection();
              // Wizard reads ?seed=last and pre-fills site/employer/client/
              // task/access/structure/height/kind/rescue/hazards from the
              // most recent entry. Date, hours, and description stay blank.
              router.push('/entry/new?seed=last' as never);
            }}
            onRequestSignature={() => {
              haptics.selection();
              // Pending-signature filter ensures the tech lands on the slice
              // of entries that are actually awaiting a verifier.
              router.push('/records?filter=pending' as never);
            }}
            onPhotoLog={() => {
              haptics.selection();
              // Same seed as "Same as last" so the photo capture lands on a
              // pre-contexted draft — saves the tech from re-entering site
              // before tapping shutter.
              router.push('/entry/new?seed=last' as never);
            }}
          />
          <ChainHeadCard
            chainShort={chainShort}
            lastSignedEntry={lastSignedEntry ?? null}
            onPress={() => {
              if (lastSignedEntry) {
                haptics.selection();
                router.push(`/entry/${lastSignedEntry.id}` as never);
              }
            }}
          />
        </View>

        <SectionH kicker="ON YOUR PLATE" title="Open work" />
        <View style={{ paddingHorizontal: 20 }}>
          <ActionTileGrid
            openDrafts={openDrafts}
            awaitingSignature={awaitingSignature}
            overdueGear={overdueGear}
            dueSoonGear={dueSoonGear}
          />
        </View>

        <SectionH
          kicker="RECENT"
          title="Last 5 entries"
          action={
            recentEntries.length === 5 ? (
              <Pressable onPress={() => router.push('/records')}>
                <Text
                  style={{
                    ...type.cardSub,
                    color: tokens.accent,
                    fontFamily: 'Manrope_600SemiBold',
                    fontWeight: '600',
                  }}
                >
                  See all
                </Text>
              </Pressable>
            ) : null
          }
        />
        <View style={{ paddingHorizontal: 20, gap: 8 }}>
          {!entries.data ? null : recentEntries.length === 0 ? (
            <Card>
              <Text style={{ ...type.cardTitle, color: tokens.text }}>No entries yet</Text>
              <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 4 }}>
                Tap the center "+" to log your first job.
              </Text>
            </Card>
          ) : (
            recentEntries.map((entry) => (
              <EntryRow
                key={entry.id}
                status={rowStatus(entry)}
                date={entry.date_to}
                site={entry.site}
                task={entry.work_task}
                hours={entry.work_hours}
                chainHash={chainHead.data}
                onPress={() => router.push(`/entry/${entry.id}` as never)}
              />
            ))
          )}
        </View>
      </PullToRefresh>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────

function CareerHero({
  hours,
  weekHours,
  monthHours,
  totalEntries,
}: {
  hours: number;
  weekHours: number;
  monthHours: number;
  totalEntries: number;
}) {
  const { tokens } = useTheme();
  return (
    <Card padding={18}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ ...type.monoKickerLg, color: tokens.textFaint }}>CAREER HOURS</Text>
        <Pill tone="accent" size="sm" icon={IconBolt}>
          Live
        </Pill>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 8, gap: 6 }}>
        <AnimatedNumber
          value={hours}
          format={(v) => formatWithCommas(Math.round(v))}
          style={{
            ...type.heroNumber,
            color: tokens.text,
          }}
        />
        <Text
          style={{
            ...type.monoMd,
            color: tokens.textDim,
            paddingBottom: 14,
          }}
        >
          hrs
        </Text>
      </View>
      <View
        style={{
          marginTop: 14,
          flexDirection: 'row',
          gap: 12,
          paddingTop: 14,
          borderTopWidth: 1,
          borderTopColor: tokens.lineSoft,
        }}
      >
        <MiniStat label="This week" value={weekHours.toFixed(1)} />
        <MiniStat label="This month" value={monthHours.toFixed(1)} />
        <MiniStat label="Entries" value={String(totalEntries)} />
      </View>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  const { tokens } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ ...type.detailStat, color: tokens.text }}>{value}</Text>
      <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────

function QuickLogCard({
  hasLastEntry,
  lastEntrySite,
  lastEntryTask,
  onSameAsLast,
  onRequestSignature,
  onPhotoLog,
}: {
  hasLastEntry: boolean;
  lastEntrySite: string | null;
  lastEntryTask: string | null;
  onSameAsLast: () => void;
  onRequestSignature: () => void;
  onPhotoLog: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <Card padding={16}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: tokens.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconBolt size={20} color={tokens.accent} fill={tokens.accent} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>QUICK LOG</Text>
          <Text style={{ ...type.cardTitle, color: tokens.text }} numberOfLines={1}>
            {hasLastEntry && lastEntrySite ? `Duplicate · ${lastEntrySite}` : 'No prior entry yet'}
          </Text>
          {hasLastEntry && lastEntryTask ? (
            <Text style={{ ...type.cardSub, color: tokens.textDim }} numberOfLines={1}>
              {lastEntryTask}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
        <QuickChip label="Same as last" onPress={onSameAsLast} disabled={!hasLastEntry} />
        <QuickChip label="Request signature" onPress={onRequestSignature} />
        <QuickChip label="Photo log" onPress={onPhotoLog} />
      </View>
    </Card>
  );
}

function QuickChip({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          paddingVertical: 6,
          paddingHorizontal: 11,
          borderRadius: 999,
          backgroundColor: tokens.surface2,
          borderWidth: 1,
          borderColor: tokens.lineSoft,
          opacity: disabled ? 0.45 : 1,
        },
        pressed && !disabled ? { transform: [{ scale: 0.97 }] } : null,
      ]}
    >
      <Text
        style={{
          fontFamily: 'Manrope_600SemiBold',
          fontWeight: '600',
          fontSize: 12,
          lineHeight: 16,
          color: tokens.text,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ──────────────────────────────────────────────────────────────────────────

function ChainHeadCard({
  chainShort,
  lastSignedEntry,
  onPress,
}: {
  chainShort: string | null;
  lastSignedEntry: LogbookEntry | null;
  onPress: () => void;
}) {
  const { tokens } = useTheme();
  const subText = lastSignedEntry
    ? `Last sealed · ${lastSignedEntry.date_to} · ${lastSignedEntry.site}`
    : 'No signed entries yet';

  return (
    <Card padding={14} interactive onPress={lastSignedEntry ? onPress : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: tokens.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconChain size={20} color={tokens.accent} fill={tokens.accent} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>CHAIN HEAD</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ ...type.monoMd, color: tokens.text }} numberOfLines={1}>
              {chainShort ?? '— — —'}
            </Text>
            {chainShort ? <HashGlyph hash={chainShort.replace(/[…]/g, '')} size={20} /> : null}
          </View>
          <Text style={{ ...type.cardSub, color: tokens.textDim }} numberOfLines={1}>
            {subText}
          </Text>
        </View>
      </View>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────

interface ActionTileSpec {
  count: number;
  label: string;
  hint: string;
  icon: React.ComponentType<IconProps>;
  tone: 'ok' | 'warn' | 'danger';
  route: string;
}

function ActionTileGrid({
  openDrafts,
  awaitingSignature,
  overdueGear,
  dueSoonGear,
}: {
  openDrafts: number;
  awaitingSignature: number;
  overdueGear: number;
  dueSoonGear: number;
}) {
  const tiles: ActionTileSpec[] = [
    {
      count: openDrafts,
      label: 'Open drafts',
      hint: openDrafts === 1 ? '1 to finish' : `${openDrafts} to finish`,
      icon: IconDraft,
      tone: 'warn',
      route: '/records?filter=drafts',
    },
    {
      count: awaitingSignature,
      label: 'Awaiting signature',
      hint: awaitingSignature === 1 ? '1 pending' : `${awaitingSignature} pending`,
      icon: IconSign,
      tone: 'ok',
      route: '/records?filter=pending',
    },
    {
      count: overdueGear,
      label: 'Gear overdue',
      hint: overdueGear === 1 ? '1 past due' : `${overdueGear} past due`,
      icon: IconWarn,
      tone: 'danger',
      route: '/gear',
    },
    {
      count: dueSoonGear,
      label: 'Gear due soon',
      hint: dueSoonGear === 1 ? '1 within 14d' : `${dueSoonGear} within 14d`,
      icon: IconGear,
      tone: 'warn',
      route: '/gear',
    },
  ];

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {tiles.map((t) => (
        <ActionTile key={t.label} spec={t} />
      ))}
    </View>
  );
}

function ActionTile({ spec }: { spec: ActionTileSpec }) {
  const { tokens } = useTheme();
  const toneMap = {
    ok: { bg: tokens.okSoft, fg: tokens.ok },
    warn: { bg: tokens.warnSoft, fg: tokens.warn },
    danger: { bg: tokens.dangerSoft, fg: tokens.danger },
  };
  const palette = toneMap[spec.tone];
  const empty = spec.count === 0;

  const tileStyle: ViewStyle = {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: tokens.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tokens.lineSoft,
    padding: 14,
    gap: 8,
  };

  const countStyle: TextStyle = {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.84,
    color: empty ? tokens.textFaint : tokens.text,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spec.label}
      onPress={() => router.push(spec.route as never)}
      style={({ pressed }) => [tileStyle, pressed ? { transform: [{ scale: 0.99 }] } : null]}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: empty ? tokens.surface2 : palette.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <spec.icon size={18} color={empty ? tokens.textFaint : palette.fg} fill={palette.fg} />
      </View>
      <Text style={countStyle}>{spec.count}</Text>
      <View>
        <Text style={{ ...type.cardTitle, color: tokens.text }}>{spec.label}</Text>
        <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 2 }}>{spec.hint}</Text>
      </View>
    </Pressable>
  );
}

function formatWithCommas(n: number): string {
  return n.toLocaleString('en-US');
}
