import React from 'react';
import { router } from 'expo-router';
import { Clock3, FileJson, FileText, Plus, ShieldCheck } from 'lucide-react-native';
import { Pressable, Share, Text, View } from 'react-native';
import { formatDateRange } from '@/src/domain/date-format';
import type { EntryStatus } from '@/src/domain/logbook/types';
import { useEntries, useExportLogbook, useExportLogbookCsv } from '@/src/domain/logbook/use-logbook';
import { ActionTile, Button, Card, Screen } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

type RecordFilter = 'all' | EntryStatus;

const FILTERS: Array<{ value: RecordFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'signed', label: 'Signed' },
  { value: 'amended', label: 'Amended' },
];

function statusTone(status: EntryStatus) {
  if (status === 'signed') return 'ok';
  if (status === 'amended') return 'info';
  return 'warn';
}

function statusLabel(status: EntryStatus): string {
  if (status === 'signed') return 'Signed';
  if (status === 'amended') return 'Amended';
  return 'Draft';
}

function StatusPill({ status }: { status: EntryStatus }) {
  const { colors, radii, spacing, typography } = useTheme();
  const tone = statusTone(status);
  const color = tone === 'ok' ? colors.statusOk : tone === 'info' ? colors.statusInfo : colors.statusWarn;
  const backgroundColor = tone === 'ok' ? colors.statusOkTint : tone === 'info' ? colors.statusInfoTint : colors.statusWarnTint;

  return (
    <View
      style={{
        minHeight: 32,
        borderRadius: radii.pill,
        backgroundColor,
        paddingHorizontal: spacing.sm,
        justifyContent: 'center',
      }}
    >
      <Text selectable={false} style={{ ...typography.caption, color }}>
        {statusLabel(status)}
      </Text>
    </View>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors, radii, spacing, typography, touchTarget } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        minHeight: touchTarget.min,
        borderRadius: radii.pill,
        borderWidth: 1,
        borderColor: selected ? colors.accentPrimary : colors.border,
        backgroundColor: selected ? colors.accentTint : colors.bgSurface,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
      }}
    >
      <Text selectable={false} style={{ ...typography.label, color: selected ? colors.accentPrimary : colors.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function RecordsScreen() {
  const { colors, spacing, typography } = useTheme();
  const entries = useEntries();
  const exportLogbook = useExportLogbook();
  const exportLogbookCsv = useExportLogbookCsv();
  const [filter, setFilter] = React.useState<RecordFilter>('all');
  const allEntries = entries.data ?? [];
  const filteredEntries = filter === 'all'
    ? allEntries
    : allEntries.filter((entry) => entry.status === filter);
  const signedCount = allEntries.filter((entry) => entry.status === 'signed').length;
  const draftCount = allEntries.filter((entry) => entry.status === 'draft').length;

  async function shareJsonExport() {
    const bundle = await exportLogbook.mutateAsync();
    await Share.share({
      title: 'RALB backup file',
      message: JSON.stringify(bundle, null, 2),
    });
  }

  async function shareCsvExport() {
    const csv = await exportLogbookCsv.mutateAsync();
    await Share.share({
      title: 'RALB spreadsheet export',
      message: csv,
    });
  }

  return (
    <Screen
      safeTop
      footer={
        <Button
          title="New entry"
          icon={Plus}
          onPress={() => router.push('/entry/new')}
        />
      }
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <ActionTile
          title="Signed"
          value={String(signedCount)}
          icon={ShieldCheck}
          onPress={() => setFilter('signed')}
          tone={filter === 'signed' ? 'accent' : 'default'}
        />
        <ActionTile
          title="Drafts"
          value={String(draftCount)}
          icon={Clock3}
          onPress={() => setFilter('draft')}
          tone={filter === 'draft' ? 'accent' : draftCount ? 'warn' : 'default'}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          title="Backup file"
          icon={FileJson}
          onPress={shareJsonExport}
          variant="secondary"
          disabled={exportLogbook.isPending || exportLogbookCsv.isPending}
          loading={exportLogbook.isPending}
          style={{ flex: 1 }}
        />
        <Button
          title="Spreadsheet"
          icon={FileText}
          onPress={shareCsvExport}
          variant="secondary"
          disabled={exportLogbook.isPending || exportLogbookCsv.isPending}
          loading={exportLogbookCsv.isPending}
          style={{ flex: 1 }}
        />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {FILTERS.map((item) => (
          <FilterChip
            key={item.value}
            label={item.label}
            selected={filter === item.value}
            onPress={() => setFilter(item.value)}
          />
        ))}
      </View>

      {exportLogbook.isError || exportLogbookCsv.isError ? (
        <Text selectable style={{ ...typography.caption, color: colors.statusErr }}>
          Export could not be shared. Try again when the app is responsive.
        </Text>
      ) : null}

      {entries.isLoading ? (
        <Card>
          <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
            Loading records
          </Text>
          <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
            Your logbook is opening.
          </Text>
        </Card>
      ) : entries.isError ? (
        <Card>
          <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
            Records could not load
          </Text>
          <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
            Nothing was changed. Try loading the records again.
          </Text>
          <Button title="Try again" variant="secondary" onPress={() => entries.refetch()} />
        </Card>
      ) : filteredEntries.length ? (
        filteredEntries.map((entry) => {
          const dateLabel = formatDateRange(entry.date_from, entry.date_to);
          const meta = [dateLabel, `${entry.work_hours.toFixed(1)} hr`, entry.work_task].filter(Boolean).join(' - ');
          const org = [entry.employer, entry.client].filter(Boolean).join(' - ');

          return (
            <Pressable
              key={entry.id}
              accessibilityRole="button"
              onPress={() => router.push(`/entry/${entry.id}`)}
            >
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <Text selectable style={{ ...typography.title3, color: colors.textPrimary }} numberOfLines={2}>
                      {entry.site || 'Unnamed site'}
                    </Text>
                    <Text selectable style={{ ...typography.caption, color: colors.textSecondary }} numberOfLines={2}>
                      {meta}
                    </Text>
                    {org ? (
                      <Text selectable style={{ ...typography.body, color: colors.textSecondary }} numberOfLines={1}>
                        {org}
                      </Text>
                    ) : null}
                  </View>
                  <StatusPill status={entry.status} />
                </View>
                {entry.description ? (
                  <Text selectable style={{ ...typography.body, color: colors.textPrimary }} numberOfLines={2}>
                    {entry.description}
                  </Text>
                ) : null}
              </Card>
            </Pressable>
          );
        })
      ) : (
        <Card>
          <Text selectable style={{ ...typography.title3, color: colors.textPrimary }}>
            No records yet
          </Text>
          <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
            Start a new work entry when you are ready.
          </Text>
          {filter !== 'all' ? (
            <Button title="Show all" variant="secondary" onPress={() => setFilter('all')} />
          ) : null}
        </Card>
      )}
    </Screen>
  );
}
