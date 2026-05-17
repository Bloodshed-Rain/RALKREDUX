import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import type { LogbookEntry } from '@/src/domain/logbook/types';
import { ENTRY_HASH_VERSION } from '@/src/domain/logbook/entry-hash';
import {
  buildLogbookCsv,
  buildLogbookExportFileName,
  buildLogbookExportBundle,
  buildLogbookPdfHtml,
} from '@/src/domain/logbook/export';
import { useChainHead, useEntries, useExportLogbook } from '@/src/domain/logbook/use-logbook';
import { isValidIsoDateRange } from '@/src/domain/date-utils';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import {
  Button,
  Card,
  ChipSelect,
  Field,
  IconBtn,
  Pill,
  SectionH,
  ToggleRow,
  TopBar,
} from '@/src/ui/primitives/v2';
import {
  IconArrowLeft,
  IconBrand,
  IconChain,
  IconExport,
  IconLock,
  IconVerified,
} from '@/src/ui/icons';
import { haptics } from '@/src/ui/haptics';

type Range = 'all' | 'year' | 'quarter' | 'custom';
type Format = 'pdf' | 'json' | 'csv';

const RANGE_OPTIONS: Array<{ value: Range; label: string }> = [
  { value: 'all', label: 'All time' },
  { value: 'year', label: 'This year' },
  { value: 'quarter', label: 'This quarter' },
  { value: 'custom', label: 'Custom…' },
];

const FORMAT_OPTIONS: Array<{ value: Format; label: string; sub: string }> = [
  { value: 'pdf', label: 'PDF', sub: 'Printable' },
  { value: 'json', label: 'JSON', sub: 'Audit packet' },
  { value: 'csv', label: 'CSV', sub: 'Spreadsheet' },
];

function startOfYearIso(now = new Date()): string {
  return `${now.getFullYear()}-01-01`;
}

function startOfQuarterIso(now = new Date()): string {
  const month = now.getMonth();
  const qStart = month - (month % 3); // 0,3,6,9
  return `${now.getFullYear()}-${String(qStart + 1).padStart(2, '0')}-01`;
}

function inRange(entry: LogbookEntry, range: Range, customFrom: string, customTo: string): boolean {
  if (range === 'all') return true;
  if (range === 'year') return entry.date_to >= startOfYearIso();
  if (range === 'quarter') return entry.date_to >= startOfQuarterIso();
  // custom
  const from = customFrom.trim();
  const to = customTo.trim();
  if (from && entry.date_to < from) return false;
  if (to && entry.date_from > to) return false;
  return true;
}

export default function ExportScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const entriesQ = useEntries();
  const chainHeadQ = useChainHead();
  const exportLogbook = useExportLogbook();

  const [range, setRange] = React.useState<Range>('all');
  const [customFrom, setCustomFrom] = React.useState('');
  const [customTo, setCustomTo] = React.useState('');
  const [includeDrafts, setIncludeDrafts] = React.useState(false);
  const [includeAttachments, setIncludeAttachments] = React.useState(true);
  const [format, setFormat] = React.useState<Format>('pdf');
  const [pending, setPending] = React.useState(false);

  const allEntries = entriesQ.data ?? [];

  const customRangeValid =
    range !== 'custom' ||
    !customFrom.trim() ||
    !customTo.trim() ||
    isValidIsoDateRange(customFrom, customTo);

  const preview = React.useMemo(() => {
    const filtered = allEntries.filter((e) => {
      if (!includeDrafts && e.status === 'draft') return false;
      return inRange(e, range, customFrom, customTo);
    });
    const signedHours = filtered
      .filter((e) => e.status === 'signed')
      .reduce((sum, e) => sum + e.work_hours, 0);
    return { entries: filtered, signedHours };
  }, [allEntries, includeDrafts, range, customFrom, customTo]);

  const previewCount = preview.entries.length;

  async function runExport() {
    if (pending) return;
    if (previewCount === 0) {
      Alert.alert('Nothing to export', 'No entries match the selected range and filters.');
      return;
    }
    if (!customRangeValid) {
      Alert.alert('Invalid date range', 'Make sure “From” is on or before “To”.');
      return;
    }
    setPending(true);
    try {
      const bundle = await exportLogbook.mutateAsync({ includeDrafts });
      const includedIds = new Set(preview.entries.map((e) => e.id));
      const filteredBundleEntries = bundle.entries.filter((be) => includedIds.has(be.entry.id));
      const sanitizedEntries = includeAttachments
        ? filteredBundleEntries
        : filteredBundleEntries.map((be) => ({ ...be, attachments: [] }));
      const sanitizedBundle = buildLogbookExportBundle({
        profile: bundle.profile,
        entries: sanitizedEntries,
        supervisors: bundle.supervisors,
        exportedAt: bundle.exported_at,
      });

      if (format === 'pdf') {
        const html = buildLogbookPdfHtml(sanitizedBundle);
        const { uri } = await Print.printToFileAsync({ html });
        const fileName = buildLogbookExportFileName(sanitizedBundle, 'pdf');
        const namedUri = FileSystem.cacheDirectory
          ? `${FileSystem.cacheDirectory}${fileName}`
          : uri;
        if (namedUri !== uri) {
          await FileSystem.deleteAsync(namedUri, { idempotent: true });
          await FileSystem.copyAsync({ from: uri, to: namedUri });
        }
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(namedUri, {
            dialogTitle: 'Share RALB audit logbook PDF',
            mimeType: 'application/pdf',
            UTI: 'com.adobe.pdf',
          });
        } else {
          await Share.share({ title: 'RALB audit logbook PDF', message: namedUri });
        }
      } else if (format === 'json') {
        await Share.share({
          title: 'RALB logbook export',
          message: JSON.stringify(sanitizedBundle, null, 2),
        });
      } else {
        const csv = buildLogbookCsv(sanitizedBundle);
        await Share.share({ title: 'RALB logbook CSV', message: csv });
      }
      haptics.success();
    } catch {
      haptics.error();
      Alert.alert('Could not export', 'The audit export failed. Try again.');
    } finally {
      setPending(false);
    }
  }

  const chainHash = chainHeadQ.data ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <Stack.Screen options={{ headerShown: false, title: 'Audit export' }} />
      <TopBar
        title="Audit export"
        leading={
          <IconBtn icon={IconArrowLeft} label="Back" size="sm" onPress={() => router.back()} />
        }
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Preview */}
        <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
          <PreviewCard
            entryCount={previewCount}
            signedHours={preview.signedHours}
            chainHash={chainHash}
          />
        </View>

        {/* Options */}
        <SectionH kicker="OPTIONS" title="What to include" />
        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          <View>
            <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 6 }}>
              RANGE
            </Text>
            <ChipSelect<Range>
              value={range}
              options={RANGE_OPTIONS}
              onChange={(v) => {
                setRange(v);
                if (v !== 'custom') {
                  setCustomFrom('');
                  setCustomTo('');
                }
              }}
            />
          </View>
          {range === 'custom' ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field
                  label="From"
                  value={customFrom}
                  onChangeText={setCustomFrom}
                  placeholder="YYYY-MM-DD"
                  autoCapitalize="none"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="To"
                  value={customTo}
                  onChangeText={setCustomTo}
                  placeholder="YYYY-MM-DD"
                  autoCapitalize="none"
                />
              </View>
            </View>
          ) : null}
          <ToggleRow
            label="Include drafts"
            sub="Unsigned entries marked as draft"
            value={includeDrafts}
            onChange={setIncludeDrafts}
          />
          <ToggleRow
            label="Include attachments"
            sub="Evidence photos and supporting files"
            value={includeAttachments}
            onChange={setIncludeAttachments}
          />
          <ToggleRow
            label="Embed chain proof"
            sub="Signature + chain hashes — always on"
            value
            onChange={() => {}}
            disabled
          />
        </View>

        <SectionH kicker="FORMAT" title="How to export" />
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {FORMAT_OPTIONS.map((o) => (
              <FormatTile
                key={o.value}
                label={o.label}
                sub={o.sub}
                active={format === o.value}
                onPress={() => setFormat(o.value)}
              />
            ))}
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          <Button
            variant="primary"
            full
            size="lg"
            icon={IconExport}
            onPress={runExport}
            disabled={pending || previewCount === 0 || !customRangeValid}
          >
            {pending
              ? 'Building export…'
              : previewCount === 0
                ? 'Nothing to export'
                : `Export ${previewCount} ${previewCount === 1 ? 'entry' : 'entries'}`}
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

interface PreviewCardProps {
  entryCount: number;
  signedHours: number;
  chainHash: string | null;
}

function PreviewCard({ entryCount, signedHours, chainHash }: PreviewCardProps) {
  const { tokens } = useTheme();

  const kickerStyle: TextStyle = {
    ...type.monoKicker,
    color: tokens.textFaint,
  };

  const headlineStyle: TextStyle = {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.6,
    color: tokens.text,
    marginTop: 6,
  };

  const subStyle: TextStyle = {
    ...type.cardSub,
    color: tokens.textDim,
    marginTop: 2,
  };

  return (
    <Card padding={18}>
      <View style={{ position: 'relative' }}>
        {/* Concentric rings decoration (top-right). Two overlapping circles. */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', right: -34, top: -34, opacity: 0.55 }}
        >
          <Svg width={140} height={140}>
            <Circle
              cx={70}
              cy={70}
              r={58}
              fill="none"
              stroke={tokens.lineSoft}
              strokeWidth={1.5}
            />
            <Circle
              cx={70}
              cy={70}
              r={36}
              fill="none"
              stroke={tokens.lineSoft}
              strokeWidth={1.5}
            />
          </Svg>
        </View>
        {/* Embossed brand watermark (bottom-right). */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            right: -28,
            bottom: -28,
            opacity: 0.06,
            transform: [{ rotate: '-8deg' }],
          }}
        >
          <IconBrand size={220} color={tokens.text} fill={tokens.text} />
        </View>

        <Text style={kickerStyle}>AUDIT PACKET · V{ENTRY_HASH_VERSION}</Text>
        <Text style={headlineStyle}>
          {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
        </Text>
        <Text style={subStyle}>
          {signedHours.toFixed(1)} signed hrs · chain verifiable
        </Text>
        <View style={{ height: 1, backgroundColor: tokens.lineSoft, marginVertical: 14 }} />
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <Pill tone="ok" icon={IconVerified}>Chain valid</Pill>
          <Pill tone="chip" icon={IconLock}>Hash v{ENTRY_HASH_VERSION}</Pill>
          <Pill tone="chip" icon={IconChain}>
            {entryCount} {entryCount === 1 ? 'link' : 'links'}
          </Pill>
        </View>
        {chainHash ? (
          <Text
            style={{
              ...type.monoSm,
              color: tokens.textFaint,
              marginTop: 10,
              letterSpacing: 0.5,
            }}
            numberOfLines={1}
          >
            HEAD · {chainHash.slice(0, 8)}…{chainHash.slice(-4)}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

interface FormatTileProps {
  label: string;
  sub: string;
  active: boolean;
  onPress: () => void;
}

function FormatTile({ label, sub, active, onPress }: FormatTileProps) {
  const { tokens } = useTheme();
  const containerStyle: ViewStyle = {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: active ? tokens.accentSoft : tokens.surface,
    borderWidth: active ? 1.5 : 1,
    borderColor: active ? tokens.accent : tokens.lineSoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  };
  const labelStyle: TextStyle = {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 0.8,
    color: active ? tokens.accent : tokens.text,
  };
  const subStyle: TextStyle = {
    ...type.cardSub,
    color: tokens.textDim,
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label} — ${sub}`}
      onPress={onPress}
      style={({ pressed }) => [
        containerStyle,
        pressed ? { transform: [{ scale: 0.99 }] } : null,
      ]}
    >
      <Text style={labelStyle}>{label}</Text>
      <Text style={subStyle}>{sub}</Text>
    </Pressable>
  );
}
