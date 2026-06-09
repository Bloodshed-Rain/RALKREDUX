import React from 'react';
import { FlatList, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { useNdtInspections, useNdtSummary } from '@/src/domain/ndt/use-ndt';
import type {
  NdtInspection,
  NdtInspectionStatus,
  NdtMethod,
  NdtMethodTotal,
  NdtSummary,
} from '@/src/domain/ndt/types';
import { formatIsoForDisplay } from '@/src/domain/date-utils';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import { Button, Card, EmptyState, IconBtn, Pill, type PillTone } from '@/src/ui/primitives/v2';
import { IconChevron, IconInspect, IconPlus } from '@/src/ui/icons';
import { Reveal } from '@/src/ui/animation/reveal';

// Disclaimer text is contractually verbatim (compliance copy) — do not reword.
// NDT only ACCRUES experience; verification authority is the NDT Level III.
const NDT_DISCLAIMER =
  'Accrued NDT experience for your own records — verification is by your NDT Level III.';

// Long-form method labels shown alongside the code chip.
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

// Verification-state badge mapping. `chip` is the only neutral/muted tone in the
// PillTone union, so both draft (muted) and amended (neutral) land there.
const STATUS_BADGE: Record<NdtInspectionStatus, { label: string; tone: PillTone }> = {
  draft: { label: 'Draft', tone: 'chip' },
  logged: { label: 'Self-logged', tone: 'accent' },
  pending: { label: 'Pending verification', tone: 'warn' },
  verified: { label: 'Verified', tone: 'ok' },
  amended: { label: 'Amended', tone: 'chip' },
};

function formatHours(n: number): string {
  // Trim a trailing ".0" so whole numbers read clean, keep one decimal otherwise.
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export interface NdtLedgerProps {
  // Host owns routing: the ledger is presentational and never imports `router`,
  // so it renders identically inside the standalone /ndt route and the Records
  // NDT tab. The two hooks (inspections + summary) are consumed internally.
  onOpenRecord: (id: string) => void;
  onNewRecord: () => void;
  // Whether to render the in-card "+New" affordance in the ACCRUED HOURS header.
  // The Records NDT tab sets this `true` because its host TopBar carries Export,
  // not +New — without it a non-empty ledger there is a dead end. The standalone
  // /ndt route already exposes +New in its own TopBar, so it omits this to avoid
  // two identical primary actions ~50px apart. The EmptyState always offers
  // create regardless, so the empty case is covered either way.
  showHeaderCreate?: boolean;
}

/**
 * The NDT ledger body: ACCRUED HOURS summary + BY METHOD breakdown + the
 * verification-state inspections list + empty state. Shared between the
 * standalone `/ndt` route and the Records screen's NDT tab. The whole surface is
 * a single virtualized FlatList (summary rides as the list header) — never wrap
 * it in a ScrollView, which would disable virtualization on large ledgers.
 */
export function NdtLedger({
  onOpenRecord,
  onNewRecord,
  showHeaderCreate = false,
}: NdtLedgerProps) {
  const inspections = useNdtInspections();
  const summary = useNdtSummary();

  const data = inspections.data ?? [];
  const summaryData = summary.data ?? null;

  const selfLoggedHours = summaryData?.selfLoggedHours ?? 0;
  const verifiedHours = summaryData?.verifiedHours ?? 0;

  if (!inspections.data) return null;

  return (
    <FlatList
      style={{ flex: 1, paddingHorizontal: 20 }}
      contentContainerStyle={{ paddingBottom: 132 }}
      data={data}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      ListHeaderComponent={
        <NdtSummaryHeader
          summary={summaryData}
          selfLoggedHours={selfLoggedHours}
          verifiedHours={verifiedHours}
          onNewRecord={onNewRecord}
          showCreate={showHeaderCreate}
        />
      }
      ListEmptyComponent={
        <View style={{ paddingTop: 8 }}>
          <EmptyState
            icon={IconInspect}
            title="No NDT records yet"
            sub="Log inspection experience here. Verification is by your NDT Level III."
            action={
              <Button variant="primary" icon={IconPlus} onPress={onNewRecord}>
                New NDT record
              </Button>
            }
          />
        </View>
      }
      renderItem={({ item, index }) => (
        <Reveal index={index} dedupeKey={item.id}>
          <NdtRow inspection={item} onPress={() => onOpenRecord(item.id)} />
        </Reveal>
      )}
    />
  );
}

interface NdtSummaryHeaderProps {
  summary: NdtSummary | null;
  selfLoggedHours: number;
  verifiedHours: number;
  onNewRecord: () => void;
  showCreate: boolean;
}

function NdtSummaryHeader({
  summary,
  selfLoggedHours,
  verifiedHours,
  onNewRecord,
  showCreate,
}: NdtSummaryHeaderProps) {
  const { tokens } = useTheme();

  const kickerStyle: TextStyle = { ...type.monoKicker, color: tokens.textFaint };

  // byMethod is the TOTAL accrued per method (verified INCLUDED); byMethodVerified
  // is the verified subset. Joining them lets each row show "total" with an
  // "of which verified" line — never sum the two or verified hours double-count.
  const methodRows = React.useMemo(() => {
    if (!summary) return [];
    const verifiedByMethod = new Map<NdtMethod, number>();
    for (const v of summary.byMethodVerified) verifiedByMethod.set(v.method, v.hours);
    return summary.byMethod.map((m: NdtMethodTotal) => ({
      method: m.method,
      total: m.hours,
      verified: verifiedByMethod.get(m.method) ?? 0,
      inspections: m.inspections,
    }));
  }, [summary]);

  return (
    <View style={{ paddingTop: 4, paddingBottom: 6, gap: 12 }}>
      <Card padding={16}>
        {showCreate ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <Text style={kickerStyle}>ACCRUED HOURS</Text>
            {/* Create affordance for hosts whose TopBar action isn't +New
                (the Records NDT tab, whose TopBar carries Export). */}
            <IconBtn icon={IconPlus} label="New NDT record" size="sm" onPress={onNewRecord} />
          </View>
        ) : (
          <Text style={kickerStyle}>ACCRUED HOURS</Text>
        )}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
          <SplitStat label="Self-logged" value={selfLoggedHours} tone="accent" />
          <View style={{ width: 1, backgroundColor: tokens.lineSoft }} />
          <SplitStat label="Verified" value={verifiedHours} tone="ok" />
        </View>
        <Text style={{ ...type.cardSub, color: tokens.textFaint, marginTop: 12 }}>
          {NDT_DISCLAIMER}
        </Text>
      </Card>

      {methodRows.length > 0 ? (
        <Card padding={16}>
          <Text style={kickerStyle}>BY METHOD</Text>
          <View style={{ marginTop: 10, gap: 0 }}>
            {methodRows.map((row, i) => (
              <MethodRow
                key={row.method}
                method={row.method}
                total={row.total}
                verified={row.verified}
                inspections={row.inspections}
                first={i === 0}
              />
            ))}
          </View>
        </Card>
      ) : null}
    </View>
  );
}

function SplitStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'accent' | 'ok';
}) {
  const { tokens } = useTheme();
  const color = tone === 'ok' ? tokens.ok : tokens.accent;
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
        <Text style={{ ...type.detailStat, color }}>{formatHours(value)}</Text>
        <Text style={{ ...type.monoSm, color: tokens.textDim, paddingBottom: 4 }}>hrs</Text>
      </View>
      <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function MethodRow({
  method,
  total,
  verified,
  inspections,
  first,
}: {
  method: NdtMethod;
  total: number;
  verified: number;
  inspections: number;
  first: boolean;
}) {
  const { tokens } = useTheme();
  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: first ? 0 : 1,
    borderTopColor: tokens.lineSoft,
  };
  return (
    <View style={rowStyle}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
        <Pill tone="chip" size="sm">
          {method}
        </Pill>
        <Text style={{ ...type.cardSub, color: tokens.textDim }} numberOfLines={1}>
          {METHOD_LABEL[method]} · {inspections} {inspections === 1 ? 'record' : 'records'}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ ...type.monoMd, color: tokens.text }}>{formatHours(total)}h</Text>
        <Text style={{ ...type.monoSm, color: tokens.textFaint }}>
          {formatHours(verified)}h verified
        </Text>
      </View>
    </View>
  );
}

function NdtRow({
  inspection,
  onPress,
}: {
  inspection: NdtInspection;
  onPress: () => void;
}) {
  const { tokens } = useTheme();
  const badge = STATUS_BADGE[inspection.status];
  const dateLabel = formatIsoForDisplay(inspection.date_from) ?? inspection.date_from;

  return (
    <Card
      padding={14}
      interactive
      onPress={onPress}
      accessibilityLabel={`${inspection.method} record at ${inspection.site}`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Pill tone="chip" size="sm">
              {inspection.method}
            </Pill>
            <Pill tone={badge.tone} size="sm">
              {badge.label}
            </Pill>
          </View>
          <Text style={{ ...type.cardTitle, color: tokens.text }} numberOfLines={1}>
            {inspection.site}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ ...type.monoMd, color: tokens.text }}>
              {formatHours(inspection.hours)}h
            </Text>
            <Text style={{ ...type.cardSub, color: tokens.textDim }} numberOfLines={1}>
              · {dateLabel}
            </Text>
          </View>
        </View>
        <IconChevron size={20} color={tokens.textFaint} />
      </View>
    </Card>
  );
}
