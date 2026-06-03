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
import { buildOpenWork, type OpenWorkItem } from '@/src/domain/logbook/today-derivations';
import type { LogbookEntry } from '@/src/domain/logbook/types';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import {
  AnimatedNumber,
  Card,
  EmptyState,
  EntryRow,
  HashGlyph,
  IconBtn,
  InfoSheet,
  Pill,
  PullToRefresh,
  SectionH,
  SyncChip,
  TopBar,
} from '@/src/ui/primitives/v2';
import Constants from 'expo-constants';
import { ENTRY_HASH_VERSION } from '@/src/domain/logbook/entry-hash';
import { MIGRATION_COUNT } from '@/src/db/migrations';
import { NotificationsStubSheet } from '@/src/ui/sheets/notifications-stub-sheet';
import {
  IconBell,
  IconBolt,
  IconBrand,
  IconChain,
  IconCheck,
  IconChevron,
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
  const [aboutOpen, setAboutOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);

  useFocusEffect(
    React.useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['chainHead'] });
      queryClient.invalidateQueries({ queryKey: ['gearItems'] });
    }, [queryClient]),
  );

  const onRefresh = React.useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['entries'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] }),
      queryClient.invalidateQueries({ queryKey: ['careerStats'] }),
      queryClient.invalidateQueries({ queryKey: ['chainHead'] }),
      queryClient.invalidateQueries({ queryKey: ['gearItems'] }),
    ]);
  }, [queryClient]);

  if (profile.isError) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: tokens.bg,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          gap: 14,
        }}
      >
        <IconWarn size={40} color={tokens.danger} fill={tokens.danger} />
        <Text style={{ ...type.cardTitle, color: tokens.text, textAlign: 'center' }}>
          Couldn’t load your logbook
        </Text>
        <Text style={{ ...type.cardSub, color: tokens.textDim, textAlign: 'center' }}>
          This is a read error, not a missing logbook — check your connection or try again.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try again"
          onPress={() => void profile.refetch()}
          hitSlop={8}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 22,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: tokens.line,
            backgroundColor: tokens.surface,
          }}
        >
          <Text style={{ ...type.buttonLabel, color: tokens.text }}>Try again</Text>
        </Pressable>
      </View>
    );
  }

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
  const openWork = buildOpenWork({ openDrafts, awaitingSignature, overdueGear, dueSoonGear });

  const chainShort = chainHead.data
    ? `${chainHead.data.slice(0, 8)}…${chainHead.data.slice(-4)}`
    : null;

  const lastSignedEntry = entriesList.find((e) => e.status === 'signed' || e.status === 'amended');
  const lastEntryAny = entriesList[0];

  const recentEntries = entriesList.slice(0, 5);

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
          leading={
            <IconBtn
              icon={IconBrand}
              label="About Rope Access Logbook"
              size="md"
              onPress={() => setAboutOpen(true)}
            />
          }
          trailing={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SyncChip
                state={awaitingSignature > 0 ? 'queued' : 'synced'}
                count={awaitingSignature}
              />
              <IconBtn
                icon={IconBell}
                label="Notifications"
                size="md"
                onPress={() => setNotifOpen(true)}
              />
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
              // "View pending" — lands the tech on the slice of entries that
              // are actually awaiting a verifier.
              router.push('/records?filter=pending' as never);
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
        <View style={{ paddingHorizontal: 20, gap: 8 }}>
          {openWork.length === 0 ? (
            <EmptyState
              icon={IconCheck}
              title="You're all caught up"
              sub="No drafts, signatures, or gear need attention right now."
              style={{ paddingVertical: 24 }}
            />
          ) : (
            openWork.map((item) => (
              <OpenWorkRow
                key={item.id}
                item={item}
                onPress={() => {
                  haptics.selection();
                  router.push(item.route as never);
                }}
              />
            ))
          )}
        </View>

        <SectionH
          kicker="RECENT"
          title="Last 5 entries"
          action={
            recentEntries.length === 5 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="See all entries"
                onPress={() => router.push('/records')}
              >
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
                onPress={() => router.push(`/entry/${entry.id}` as never)}
              />
            ))
          )}
        </View>
      </PullToRefresh>
      <AboutSheet visible={aboutOpen} onClose={() => setAboutOpen(false)} />
      <NotificationsStubSheet visible={notifOpen} onClose={() => setNotifOpen(false)} />
    </View>
  );
}

function AboutSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { tokens } = useTheme();
  const appName = Constants.expoConfig?.name ?? 'Rope Access Logbook';
  const appVersion = Constants.expoConfig?.version ?? '—';
  const runtime = Constants.expoConfig?.runtimeVersion;
  const runtimeStr =
    typeof runtime === 'object' && runtime
      ? `${(runtime as { policy?: string }).policy ?? 'fingerprint'} policy`
      : typeof runtime === 'string'
        ? runtime
        : 'fingerprint policy';
  const bodyStyle: TextStyle = {
    ...type.cardSub,
    color: tokens.textDim,
    lineHeight: 20,
  };
  const labelStyle: TextStyle = {
    ...type.monoKicker,
    color: tokens.textFaint,
  };
  const valueStyle: TextStyle = {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: tokens.text,
  };
  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: tokens.lineSoft,
  };
  return (
    <InfoSheet visible={visible} onClose={onClose} kicker="OFFLINE-FIRST · HASH-CHAINED" title={appName}>
      <Text style={bodyStyle}>
        Field-grade rope-access logbook. Local SQLite is the source of truth — entries are
        hash-chained and immutable once signed. Hosted remote-signing is optional.
      </Text>
      <Card padding={14}>
        <View style={[rowStyle, { borderTopWidth: 0, paddingTop: 0 }]}>
          <Text style={labelStyle}>VERSION</Text>
          <Text style={valueStyle}>{appVersion}</Text>
        </View>
        <View style={rowStyle}>
          <Text style={labelStyle}>ENTRY-HASH</Text>
          <Text style={valueStyle}>v{ENTRY_HASH_VERSION}</Text>
        </View>
        <View style={rowStyle}>
          <Text style={labelStyle}>SCHEMA MIGRATIONS</Text>
          <Text style={valueStyle}>{MIGRATION_COUNT}</Text>
        </View>
        <View style={rowStyle}>
          <Text style={labelStyle}>RUNTIME</Text>
          <Text style={valueStyle}>{runtimeStr}</Text>
        </View>
      </Card>
      <Text style={{ ...type.cardSub, color: tokens.textFaint, fontStyle: 'italic' }}>
        Built toward SPRAT / IRATA audit-readiness. Official acceptance is a separate
        workstream — see the compliance roadmap.
      </Text>
      <View
        style={{
          marginTop: 8,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: tokens.lineSoft,
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>BY</Text>
        <Text
          style={{
            fontFamily: 'Manrope_600SemiBold',
            fontSize: 14,
            lineHeight: 18,
            color: tokens.text,
            letterSpacing: -0.2,
          }}
        >
          Chad Dubuisson & Michael Cassidy
        </Text>
      </View>
    </InfoSheet>
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
}: {
  hasLastEntry: boolean;
  lastEntrySite: string | null;
  lastEntryTask: string | null;
  onSameAsLast: () => void;
  onRequestSignature: () => void;
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
          <IconBolt size={24} color={tokens.accent} fill={tokens.accent} />
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
        <QuickChip label="View pending" onPress={onRequestSignature} />
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
          <IconChain size={24} color={tokens.accent} fill={tokens.accent} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>CHAIN HEAD</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ ...type.monoMd, color: tokens.text }} numberOfLines={1}>
              {chainShort ?? '— — —'}
            </Text>
            {chainShort ? <HashGlyph hash={chainShort.replace(/[…]/g, '')} size={24} /> : null}
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

const OPEN_WORK_ICON: Record<OpenWorkItem['id'], React.ComponentType<IconProps>> = {
  'gear-overdue': IconWarn,
  'awaiting-signature': IconSign,
  'open-drafts': IconDraft,
  'gear-due-soon': IconGear,
};

function OpenWorkRow({ item, onPress }: { item: OpenWorkItem; onPress: () => void }) {
  const { tokens } = useTheme();
  const Icon = OPEN_WORK_ICON[item.id];
  const fg = item.tone === 'danger' ? tokens.danger : tokens.warn;
  const bg = item.tone === 'danger' ? tokens.dangerSoft : tokens.warnSoft;

  return (
    <Card padding={14} interactive onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={22} color={fg} fill={fg} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ ...type.cardTitle, color: tokens.text }} numberOfLines={1}>
            {item.label}
          </Text>
          <Text style={{ ...type.cardSub, color: tokens.textDim }} numberOfLines={1}>
            {item.hint}
          </Text>
        </View>
        <IconChevron size={20} color={tokens.textFaint} />
      </View>
    </Card>
  );
}

function formatWithCommas(n: number): string {
  return n.toLocaleString('en-US');
}
