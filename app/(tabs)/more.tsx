import React from 'react';
import { Alert, Image, Pressable, ScrollView, Share, Text, TextInput, View, type TextStyle, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCreateBackupSnapshot, useRestoreBackupSnapshot } from '@/src/domain/backup/use-backup';
import type { BackupSnapshot } from '@/src/domain/backup/types';
import { formatDateOrDash } from '@/src/domain/date-format';
import { daysFromTodayIso } from '@/src/domain/date-utils';
import { useCareerStats, useChainHead, useDashboardSummary } from '@/src/domain/logbook/use-logbook';
import { useProfile, useUpdateAvatar } from '@/src/domain/profile/use-profile';
import type { CertLevel, CertScheme, Profile } from '@/src/domain/profile/types';
import type { CareerStats } from '@/src/domain/logbook/types';
import { careerHoursByScheme } from '@/src/domain/profile/hours-baseline';
import { captureOrPickPhoto } from '@/src/ui/photo-picker';
import { deleteAvatarFile, persistAvatarFile } from '@/src/ui/avatar-storage';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { THEME_ORDER, THEMES, type Theme } from '@/src/ui/theme/themes';
import { type } from '@/src/ui/theme/type';
import {
  Button,
  Card,
  ChipSelect,
  Pill,
  SectionH,
  TopBar,
} from '@/src/ui/primitives/v2';
import {
  IconBell,
  IconBrand,
  IconCamera,
  IconChain,
  IconChevron,
  IconClock,
  IconCloudBackup,
  IconExport,
  IconLock,
  IconProfile,
  IconVerified,
  IconWarn,
  type IconProps,
} from '@/src/ui/icons';
import {
  DEFAULT_TERMINAL_ACTION,
  PrefKeys,
  isTerminalActionPref,
  readPref,
  writePref,
  type TerminalActionPref,
} from '@/src/storage/local-prefs';
import { haptics, setHapticsEnabled } from '@/src/ui/haptics';

const TERMINAL_ACTION_OPTIONS: Array<{ value: TerminalActionPref; label: string }> = [
  { value: 'sign', label: 'Sign now' },
  { value: 'request', label: 'Remote' },
  { value: 'draft', label: 'Save draft' },
];

export default function ProfileScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const profile = useProfile();
  const chainHead = useChainHead();
  const careerStats = useCareerStats();
  const p = profile.data;

  const updateAvatar = useUpdateAvatar();
  const createBackup = useCreateBackupSnapshot();
  const restoreBackup = useRestoreBackupSnapshot();
  const [restoreText, setRestoreText] = React.useState('');
  const [restoreError, setRestoreError] = React.useState<string | null>(null);
  const [showBackup, setShowBackup] = React.useState(false);
  const [previewSnapshot, setPreviewSnapshot] = React.useState<BackupSnapshot | null>(null);
  const [restoreConfirmed, setRestoreConfirmed] = React.useState(false);

  const [terminalAction, setTerminalAction] = React.useState<TerminalActionPref>(DEFAULT_TERMINAL_ACTION);
  const [hapticsOn, setHapticsOn] = React.useState(true);
  const [chainOpen, setChainOpen] = React.useState(false);
  const [themeOpen, setThemeOpen] = React.useState(false);
  const summary = useDashboardSummary();
  const { theme: activeTheme } = useTheme();

  React.useEffect(() => {
    readPref<TerminalActionPref>(PrefKeys.defaultTerminalAction, DEFAULT_TERMINAL_ACTION).then(
      (stored) => {
        if (isTerminalActionPref(stored)) setTerminalAction(stored);
      },
    );
    readPref<boolean>(PrefKeys.hapticsEnabled, true).then(setHapticsOn);
  }, []);

  function selectTerminalAction(value: TerminalActionPref) {
    setTerminalAction(value);
    writePref(PrefKeys.defaultTerminalAction, value);
    haptics.selection();
  }

  function selectHaptics(value: boolean) {
    setHapticsOn(value);
    setHapticsEnabled(value);
    haptics.selection();
  }

  async function pickAndSetAvatar() {
    const picked = await captureOrPickPhoto({
      promptTitle: 'Profile photo',
      promptMessage: 'Take a new photo or choose one from your library.',
      square: true,
    });
    if (!picked) return;

    // Order matters: persist the new file, record it, THEN delete the old one.
    // If the DB write fails after the copy we orphan one file but the previous
    // avatar still resolves — never a broken pointer.
    const previous = p?.avatar_uri ?? null;
    try {
      const durable = await persistAvatarFile(picked.uri);
      await updateAvatar.mutateAsync(durable);
      if (previous && previous !== durable) await deleteAvatarFile(previous);
      haptics.success();
    } catch (err) {
      haptics.error();
      Alert.alert(
        'Could not update photo',
        err instanceof Error ? err.message : 'The profile photo could not be saved.',
      );
    }
  }

  async function removeAvatar() {
    const previous = p?.avatar_uri ?? null;
    try {
      await updateAvatar.mutateAsync(null);
      await deleteAvatarFile(previous);
      haptics.success();
    } catch (err) {
      haptics.error();
      Alert.alert(
        'Could not remove photo',
        err instanceof Error ? err.message : 'The profile photo could not be removed.',
      );
    }
  }

  function handleEditAvatar() {
    if (!p) return;
    if (p.avatar_uri) {
      Alert.alert('Profile photo', undefined, [
        { text: 'Change photo', onPress: () => void pickAndSetAvatar() },
        { text: 'Remove photo', style: 'destructive', onPress: () => void removeAvatar() },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      void pickAndSetAvatar();
    }
  }

  async function shareBackupSnapshot() {
    try {
      const snapshot = await createBackup.mutateAsync();
      haptics.success();
      await Share.share({
        title: 'Rope Access Logbook recovery snapshot',
        message: JSON.stringify(snapshot, null, 2),
      });
    } catch (err) {
      // A failed snapshot build (DB read error) previously threw an unhandled
      // rejection with no feedback on the recovery surface — surface it.
      haptics.error();
      Alert.alert(
        'Could not create backup',
        err instanceof Error ? err.message : 'The recovery snapshot could not be created.',
      );
    }
  }

  function previewRestoreText() {
    setRestoreError(null);
    try {
      const trimmed = restoreText.trim();
      if (!trimmed) {
        setRestoreError('Paste a recovery snapshot before previewing.');
        return;
      }
      const parsed = JSON.parse(trimmed) as Partial<BackupSnapshot>;
      if (!parsed || typeof parsed !== 'object' || !parsed.data || !parsed.backup_schema_version) {
        setRestoreError('That does not look like a Rope Access Logbook recovery snapshot.');
        return;
      }
      setPreviewSnapshot(parsed as BackupSnapshot);
    } catch {
      setRestoreError('Recovery file could not be parsed as JSON.');
    }
  }

  async function restoreSnapshot() {
    if (!previewSnapshot) {
      previewRestoreText();
      return;
    }
    setRestoreError(null);
    try {
      await restoreBackup.mutateAsync(previewSnapshot);
      setRestoreText('');
      setRestoreConfirmed(false);
      setPreviewSnapshot(null);
      haptics.success();
    } catch {
      setRestoreError('Restore failed. The local ledger is unchanged.');
      haptics.error();
    }
  }

  function clearPreview() {
    setPreviewSnapshot(null);
    setRestoreConfirmed(false);
    setRestoreError(null);
  }

  const chainShort = chainHead.data ? chainHead.data.slice(0, 8) : null;

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <TopBar
        title="Profile"
        subtitle="Your record · your certifications"
        large
      />
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 28 + insets.bottom + 110,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, gap: 18 }}>
          <OperatorCard
            fullName={p?.full_name ?? 'No profile'}
            employerLine={
              p ? `Local ledger · ${p.primary_scheme.toUpperCase()} primary` : 'Set up your profile to start logging'
            }
            active={!!p}
            avatarUri={p?.avatar_uri ?? null}
            onEditAvatar={p ? handleEditAvatar : undefined}
            sprat={
              p
                ? {
                    level: p.sprat_level,
                    certId: p.sprat_id,
                    expiresOn: p.sprat_expires_on,
                  }
                : null
            }
            irata={
              p
                ? {
                    level: p.irata_level,
                    certId: p.irata_id,
                    expiresOn: p.irata_expires_on,
                  }
                : null
            }
          />
          {p ? (
            <Button
              variant="outline"
              size="md"
              full
              icon={IconProfile}
              onPress={() => router.push('/profile-edit' as never)}
            >
              Edit profile & certifications
            </Button>
          ) : null}
        </View>

        {p ? (
          <>
            <SectionH kicker="CAREER" title="Logged hours" />
            <View style={{ paddingHorizontal: 20, gap: 8 }}>
              <CareerHoursCard profile={p} stats={careerStats.data ?? undefined} />
              <SettingsRow
                icon={IconClock}
                title="Starting hours"
                sub={
                  p.hours_baseline_declared_at
                    ? 'Carried-forward paper balance · tap to view'
                    : 'Carry hours over from your paper logbook'
                }
                onPress={() => router.push('/hours-baseline' as never)}
              />
              <SettingsRow
                icon={IconCamera}
                title="Legacy logbook archive"
                sub="Photos of your old paper logbooks (unverified)"
                onPress={() => router.push('/archives' as never)}
              />
            </View>
          </>
        ) : null}

        <SectionH kicker="APPEARANCE" title="Theme" />
        <View style={{ paddingHorizontal: 20, gap: 8 }}>
          <ThemeCollapseRow
            theme={activeTheme}
            open={themeOpen}
            onToggle={() => setThemeOpen((v) => !v)}
          />
          {themeOpen ? <ThemePicker /> : null}
        </View>

        <SectionH kicker="MANAGE" title="Logbook" />
        <View style={{ paddingHorizontal: 20, gap: 8 }}>
          <SettingsRow
            icon={IconExport}
            title="Audit export"
            sub="Generate auditor-ready packet (PDF / JSON / CSV)"
            onPress={() => router.push('/export' as never)}
          />
          <SettingsRow
            icon={IconCloudBackup}
            title="Sync & backup"
            sub={showBackup ? 'Tap to close' : 'Share or restore a recovery snapshot'}
            onPress={() => setShowBackup((v) => !v)}
          />
          {showBackup ? (
            <BackupInlinePanel
              restoreText={restoreText}
              setRestoreText={(v) => {
                setRestoreText(v);
                if (previewSnapshot) clearPreview();
              }}
              previewSnapshot={previewSnapshot}
              restoreConfirmed={restoreConfirmed}
              setRestoreConfirmed={setRestoreConfirmed}
              restoreError={restoreError}
              backupPending={createBackup.isPending}
              restorePending={restoreBackup.isPending}
              currentChainShort={chainShort}
              onShare={shareBackupSnapshot}
              onPreview={previewRestoreText}
              onRestore={restoreSnapshot}
              onClearPreview={clearPreview}
            />
          ) : null}
          <SettingsRow
            icon={IconChain}
            title="Chain integrity"
            sub={chainShort ? `Head ${chainShort}…` : 'No signed entries yet'}
            onPress={chainHead.data ? () => setChainOpen((v) => !v) : undefined}
          />
          {chainOpen && chainHead.data ? (
            <ChainIntegrityPanel
              chainHead={chainHead.data}
              signedCount={summary.data?.signedEntries ?? 0}
              amendedCount={summary.data?.amendedEntries ?? 0}
            />
          ) : null}
          <SettingsRow
            icon={IconProfile}
            title="Account"
            sub="Sign-in and sign out"
            onPress={() => router.push('/account' as never)}
          />
          <SettingsRow
            icon={IconLock}
            title="Security"
            sub="Device lock and signing settings"
            onPress={() => router.push('/security' as never)}
          />
        </View>

        <SectionH kicker="PREFERENCES" title="This device" />
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <Card>
            <Text style={{ ...type.cardTitle, color: tokens.text }}>Default new-entry action</Text>
            <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 4, marginBottom: 12 }}>
              Which terminal action the new-entry wizard surfaces first. The other two stay reachable.
            </Text>
            <ChipSelect<TerminalActionPref>
              value={terminalAction}
              options={TERMINAL_ACTION_OPTIONS}
              onChange={selectTerminalAction}
            />
          </Card>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ ...type.cardTitle, color: tokens.text }}>Haptic feedback</Text>
                <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 4 }}>
                  Light taps on selections. Turn off for gloved or cold-weather work.
                </Text>
              </View>
              <ChipSelect<'on' | 'off'>
                value={hapticsOn ? 'on' : 'off'}
                options={[
                  { value: 'on', label: 'On' },
                  { value: 'off', label: 'Off' },
                ]}
                onChange={(v) => selectHaptics(v === 'on')}
              />
            </View>
          </Card>
        </View>

        <SectionH kicker="SUPPORT" title="Notifications & data" />
        <View style={{ paddingHorizontal: 20, gap: 8 }}>
          <SettingsRow
            icon={IconBell}
            title="Notifications"
            sub="Gear deadlines and remote-signing updates"
            onPress={() => router.push('/notifications' as never)}
          />
          <SettingsRow
            icon={IconCamera}
            title="Attachments"
            sub="Manage entry photos and uploads"
            onPress={() => router.push('/attachments' as never)}
          />
        </View>

        <ProfileFooter chainHash={chainHead.data ?? null} />
      </ScrollView>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────

interface CertSlot {
  level: CertLevel | null;
  certId: string | null;
  expiresOn: string | null;
}

interface OperatorCardProps {
  fullName: string;
  employerLine: string;
  active: boolean;
  avatarUri: string | null;
  onEditAvatar?: () => void;
  sprat: CertSlot | null;
  irata: CertSlot | null;
}

function OperatorCard({
  fullName,
  employerLine,
  active,
  avatarUri,
  onEditAvatar,
  sprat,
  irata,
}: OperatorCardProps) {
  const { tokens } = useTheme();
  const initials = deriveInitials(fullName);
  // A persisted avatar URI can dangle after a restore-to-new-device (the file
  // bytes aren't in the backup), so a load error falls back to the initials.
  const [avatarFailed, setAvatarFailed] = React.useState(false);
  React.useEffect(() => setAvatarFailed(false), [avatarUri]);
  const showImage = !!avatarUri && !avatarFailed;

  return (
    <Card padding={18}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Pressable
          onPress={onEditAvatar}
          disabled={!onEditAvatar}
          accessibilityRole={onEditAvatar ? 'button' : undefined}
          accessibilityLabel={onEditAvatar ? 'Change profile photo' : undefined}
          style={{
            width: 58,
            height: 58,
            borderRadius: 16,
            backgroundColor: tokens.accent,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {showImage ? (
            <Image
              source={{ uri: avatarUri as string }}
              onError={() => setAvatarFailed(true)}
              style={{ width: 58, height: 58 }}
              resizeMode="cover"
            />
          ) : (
            <Text
              style={{
                fontFamily: 'Manrope_800ExtraBold',
                fontSize: 20,
                fontWeight: '800',
                letterSpacing: -0.4,
                color: tokens.accentInk,
              }}
            >
              {initials}
            </Text>
          )}
          {onEditAvatar ? (
            <View
              style={{
                position: 'absolute',
                right: 0,
                bottom: 0,
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: tokens.surface,
                borderWidth: 1.5,
                borderColor: tokens.bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconCamera size={12} color={tokens.text} />
            </View>
          ) : null}
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{
              fontFamily: 'Manrope_700Bold',
              fontWeight: '700',
              fontSize: 20,
              lineHeight: 24,
              letterSpacing: -0.4,
              color: tokens.text,
            }}
            numberOfLines={1}
          >
            {fullName}
          </Text>
          <Text style={{ ...type.mono, color: tokens.textDim }} numberOfLines={1}>
            {employerLine}
          </Text>
        </View>
        <Pill tone={active ? 'accent' : 'chip'} size="sm">
          {active ? 'Active' : 'No profile'}
        </Pill>
      </View>
      <View
        style={{ height: 1, backgroundColor: tokens.lineSoft, marginVertical: 18, marginHorizontal: -18 }}
      />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <CertCard scheme="sprat" slot={sprat} />
        <CertCard scheme="irata" slot={irata} />
      </View>
    </Card>
  );
}

function CertCard({ scheme, slot }: { scheme: CertScheme; slot: CertSlot | null }) {
  const { tokens } = useTheme();
  const expiryDays = slot?.expiresOn ? daysFromTodayIso(slot.expiresOn) : null;
  const expired = expiryDays != null && expiryDays <= 0;
  const warn = expiryDays != null && expiryDays > 0 && expiryDays < 120;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: tokens.surface2,
        borderRadius: 12,
        padding: 12,
        gap: 6,
      }}
    >
      <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>{scheme.toUpperCase()}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Pill tone={expired ? 'danger' : 'chip'} size="sm">
          {slot?.level ? `Level ${slot.level}` : '—'}
        </Pill>
        {expired ? (
          <Pill tone="danger" size="sm">Expired</Pill>
        ) : null}
      </View>
      <Text style={{ ...type.mono, color: tokens.text }} numberOfLines={1}>
        {slot?.certId ?? '—'}
      </Text>
      <Text
        style={{
          ...type.monoSm,
          color: expired ? tokens.danger : warn ? tokens.warn : tokens.textDim,
        }}
      >
        {slot?.expiresOn
          ? expired
            ? `Expired ${Math.abs(expiryDays!)}d ago`
            : `Exp ${formatDateOrDash(slot.expiresOn)}${warn ? ` · ${expiryDays}d` : ''}`
          : 'No expiry set'}
      </Text>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────

interface ThemeCollapseRowProps {
  theme: Theme;
  open: boolean;
  onToggle: () => void;
}

function ThemeCollapseRow({ theme, open, onToggle }: ThemeCollapseRowProps) {
  const { tokens } = useTheme();
  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: tokens.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tokens.lineSoft,
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={open ? 'Collapse theme picker' : 'Open theme picker'}
      onPress={onToggle}
      style={({ pressed }) => [
        containerStyle,
        pressed ? { transform: [{ scale: 0.99 }], borderColor: tokens.line } : null,
      ]}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          overflow: 'hidden',
          flexDirection: 'row',
        }}
      >
        {theme.swatch.map((hex, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: hex }} />
        ))}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ ...type.cardTitle, color: tokens.text }} numberOfLines={1}>
          {theme.name}
        </Text>
        <Text style={{ ...type.cardSub, color: tokens.textDim }} numberOfLines={1}>
          {open ? 'Tap to collapse' : theme.sub}
        </Text>
      </View>
      <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
        <IconChevron size={21} color={tokens.textFaint} />
      </View>
    </Pressable>
  );
}

function ThemePicker() {
  const { theme, setTheme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {THEME_ORDER.map((key) => (
        <ThemeTile
          key={key}
          theme={THEMES[key]}
          active={theme.key === key}
          onPress={() => setTheme(key)}
        />
      ))}
    </View>
  );
}

function ThemeTile({ theme, active, onPress }: { theme: Theme; active: boolean; onPress: () => void }) {
  const { tokens } = useTheme();
  const containerStyle: ViewStyle = {
    width: '47%',
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: tokens.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: active ? 2 : 1,
    borderColor: active ? tokens.accent : tokens.lineSoft,
  };
  const swatchStyle: ViewStyle = { height: 28, flexDirection: 'row' };
  const labelStyle: TextStyle = {
    fontFamily: 'Manrope_700Bold',
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 18,
    color: tokens.text,
  };
  const subStyle: TextStyle = {
    fontFamily: 'Manrope_500Medium',
    fontWeight: '500',
    fontSize: 11,
    lineHeight: 14,
    color: tokens.textDim,
    marginTop: 2,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Switch to ${theme.name} theme`}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        containerStyle,
        pressed ? { transform: [{ scale: 0.98 }] } : null,
      ]}
    >
      <View style={swatchStyle}>
        {theme.swatch.map((hex, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: hex }} />
        ))}
      </View>
      <View style={{ padding: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={labelStyle}>{theme.name}</Text>
          {active ? (
            <IconVerified size={17} color={tokens.accent} fill={tokens.accent} fillOpacity={0.4} />
          ) : null}
        </View>
        <Text style={subStyle} numberOfLines={1}>
          {theme.sub}
        </Text>
      </View>
    </Pressable>
  );
}

// ──────────────────────────────────────────────────────────────────────────

interface ChainIntegrityPanelProps {
  chainHead: string;
  signedCount: number;
  amendedCount: number;
}

function ChainIntegrityPanel({ chainHead, signedCount, amendedCount }: ChainIntegrityPanelProps) {
  const { tokens } = useTheme();
  const total = signedCount + amendedCount;
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
  async function shareHash() {
    try {
      await Share.share({ message: chainHead });
    } catch {
      // user cancelled or share unsupported — non-essential
    }
  }
  return (
    <Card padding={14}>
      <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 8 }}>
        HEAD HASH · TAP-AND-HOLD TO SELECT
      </Text>
      <Text
        selectable
        style={{
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 12,
          lineHeight: 18,
          color: tokens.text,
        }}
      >
        {chainHead}
      </Text>
      <View style={{ marginTop: 10, gap: 0 }}>
        <View style={[rowStyle, { borderTopWidth: 0, paddingTop: 0 }]}>
          <Text style={labelStyle}>SIGNED ENTRIES</Text>
          <Text style={valueStyle}>{signedCount}</Text>
        </View>
        <View style={rowStyle}>
          <Text style={labelStyle}>AMENDMENTS</Text>
          <Text style={valueStyle}>{amendedCount}</Text>
        </View>
        <View style={rowStyle}>
          <Text style={labelStyle}>SEALED TOTAL</Text>
          <Text style={valueStyle}>{total}</Text>
        </View>
      </View>
      <View style={{ marginTop: 12 }}>
        <Button variant="outline" size="md" full icon={IconExport} onPress={shareHash}>
          Share head hash
        </Button>
      </View>
    </Card>
  );
}

function CareerHoursCard({
  profile,
  stats,
}: {
  profile: Profile | undefined;
  stats: CareerStats | undefined;
}) {
  const { tokens } = useTheme();
  const hours = careerHoursByScheme(profile ?? null, stats ?? null);
  const showSprat = profile?.sprat_level != null || profile?.primary_scheme === 'sprat';
  const showIrata = profile?.irata_level != null || profile?.primary_scheme === 'irata';

  return (
    <Card padding={16}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {showSprat ? (
          <SchemeHoursCell
            scheme="SPRAT"
            total={hours.sprat.total}
            baseline={hours.sprat.baseline}
            logged={hours.sprat.logged}
            declared={hours.declared}
          />
        ) : null}
        {showIrata ? (
          <SchemeHoursCell
            scheme="IRATA"
            total={hours.irata.total}
            baseline={hours.irata.baseline}
            logged={hours.irata.logged}
            declared={hours.declared}
          />
        ) : null}
      </View>
      {hours.declared ? (
        <Text style={{ ...type.cardSub, color: tokens.textFaint, marginTop: 10 }}>
          Includes a self-declared baseline carried from a paper logbook.
        </Text>
      ) : null}
    </Card>
  );
}

function SchemeHoursCell({
  scheme,
  total,
  baseline,
  logged,
  declared,
}: {
  scheme: string;
  total: number;
  baseline: number;
  logged: number;
  declared: boolean;
}) {
  const { tokens } = useTheme();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>{scheme}</Text>
      <Text
        style={{
          fontFamily: 'Manrope_800ExtraBold',
          fontWeight: '800',
          fontSize: 24,
          letterSpacing: -0.6,
          color: tokens.text,
        }}
      >
        {total.toFixed(1)}
        <Text style={{ fontSize: 14, color: tokens.textDim }}> h</Text>
      </Text>
      <Text style={{ ...type.cardSub, color: tokens.textDim }}>
        {declared && baseline > 0
          ? `${baseline.toFixed(0)} carried + ${logged.toFixed(1)} logged`
          : `${logged.toFixed(1)} logged`}
      </Text>
    </View>
  );
}

interface SettingsRowProps {
  icon: React.ComponentType<IconProps>;
  title: string;
  sub?: string;
  onPress?: () => void;
}

function SettingsRow({ icon: Icon, title, sub, onPress }: SettingsRowProps) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          paddingVertical: 12,
          paddingHorizontal: 14,
          backgroundColor: tokens.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: tokens.lineSoft,
        },
        pressed ? { transform: [{ scale: 0.99 }], borderColor: tokens.line } : null,
      ]}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          backgroundColor: tokens.surface2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={24} color={tokens.text} fill={tokens.accent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ ...type.cardTitle, color: tokens.text }} numberOfLines={1}>
          {title}
        </Text>
        {sub ? (
          <Text style={{ ...type.cardSub, color: tokens.textDim }} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      <IconChevron size={21} color={tokens.textFaint} />
    </Pressable>
  );
}

// ──────────────────────────────────────────────────────────────────────────

interface BackupInlinePanelProps {
  restoreText: string;
  setRestoreText: (v: string) => void;
  previewSnapshot: BackupSnapshot | null;
  restoreConfirmed: boolean;
  setRestoreConfirmed: (v: boolean) => void;
  restoreError: string | null;
  backupPending: boolean;
  restorePending: boolean;
  currentChainShort: string | null;
  onShare: () => void;
  onPreview: () => void;
  onRestore: () => void;
  onClearPreview: () => void;
}

function BackupInlinePanel({
  restoreText,
  setRestoreText,
  previewSnapshot,
  restoreConfirmed,
  setRestoreConfirmed,
  restoreError,
  backupPending,
  restorePending,
  currentChainShort,
  onShare,
  onPreview,
  onRestore,
  onClearPreview,
}: BackupInlinePanelProps) {
  const { tokens } = useTheme();

  // When a snapshot is loaded, derive its chain head from the last signature
  // so the user can compare it to their current device head before restoring.
  const snapshotSignatures = previewSnapshot?.data.signatures ?? [];
  const snapshotLastSig = snapshotSignatures[snapshotSignatures.length - 1];
  const snapshotChainShort = snapshotLastSig?.chain_hash
    ? snapshotLastSig.chain_hash.slice(0, 8)
    : null;

  return (
    <Card padding={16}>
      <Text style={{ ...type.cardSub, color: tokens.textDim, marginBottom: 12 }}>
        Share a recovery snapshot to keep a copy off-device. Restoring replaces the local
        ledger with the snapshot.
      </Text>
      <Button variant="primary" full onPress={onShare} disabled={backupPending}>
        {backupPending ? 'Preparing snapshot…' : 'Share backup'}
      </Button>

      <View style={{ height: 16 }} />
      <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 6 }}>
        RESTORE FROM SNAPSHOT
      </Text>
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          padding: 10,
          borderRadius: 10,
          backgroundColor: tokens.warnSoft,
        }}
      >
        <IconWarn size={19} color={tokens.warn} fill={tokens.warn} />
        <Text style={{ ...type.cardSub, color: tokens.text, flex: 1 }}>
          Replacing the local ledger is destructive. Signatures made since the snapshot
          will become unreachable — the chain head moves backward to the snapshot's head.
          {currentChainShort ? ` Current head: ${currentChainShort}…` : ''}
          {' '}Share a backup first.
        </Text>
      </View>

      <TextInput
        value={restoreText}
        onChangeText={setRestoreText}
        editable={!previewSnapshot}
        multiline
        placeholder="Paste recovery file text"
        placeholderTextColor={tokens.textFaint}
        style={{
          marginTop: 10,
          borderWidth: 1,
          borderColor: tokens.lineSoft,
          borderRadius: 10,
          padding: 12,
          minHeight: 100,
          textAlignVertical: 'top',
          backgroundColor: previewSnapshot ? tokens.surface2 : tokens.surface,
          color: tokens.text,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 12,
          lineHeight: 16,
        }}
      />

      {previewSnapshot ? (
        <View
          style={{
            marginTop: 10,
            padding: 10,
            borderRadius: 10,
            backgroundColor: tokens.okSoft,
            gap: 4,
          }}
        >
          <Text style={{ ...type.monoKicker, color: tokens.ok }}>SNAPSHOT PREVIEW</Text>
          <SnapshotRow label="Exported" value={formatDateOrDash(previewSnapshot.exported_at)} />
          <SnapshotRow
            label="Operator"
            value={previewSnapshot.data.profiles[0]?.full_name ?? '—'}
          />
          <SnapshotRow label="Entries" value={String(previewSnapshot.data.entries.length)} />
          <SnapshotRow label="Signatures" value={String(previewSnapshot.data.signatures.length)} />
          <SnapshotRow label="Gear items" value={String(previewSnapshot.data.gear_items.length)} />
          <SnapshotRow
            label="Chain head"
            value={
              snapshotChainShort
                ? `${snapshotChainShort}…${currentChainShort && currentChainShort !== snapshotChainShort ? `  (now ${currentChainShort}…)` : ''}`
                : 'no chain'
            }
          />
        </View>
      ) : null}

      {previewSnapshot ? (
        <View style={{ marginTop: 12, gap: 10 }}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: restoreConfirmed }}
            onPress={() => setRestoreConfirmed(!restoreConfirmed)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              padding: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: restoreConfirmed ? tokens.ok : tokens.lineSoft,
              backgroundColor: restoreConfirmed ? tokens.okSoft : 'transparent',
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 5,
                borderWidth: 1.5,
                borderColor: restoreConfirmed ? tokens.ok : tokens.line,
                backgroundColor: restoreConfirmed ? tokens.ok : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {restoreConfirmed ? (
                <IconVerified size={14} color={tokens.bg} fill={tokens.bg} />
              ) : null}
            </View>
            <Text style={{ ...type.cardSub, color: tokens.text, flex: 1 }}>
              I understand this replaces the local logbook on this device.
            </Text>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button variant="ghost" full onPress={onClearPreview} disabled={restorePending}>
              Back to paste
            </Button>
            <Button
              variant="danger"
              full
              onPress={onRestore}
              disabled={!restoreConfirmed || restorePending}
            >
              {restorePending ? 'Restoring…' : 'Restore ledger'}
            </Button>
          </View>
        </View>
      ) : (
        <View style={{ marginTop: 10 }}>
          <Button variant="outline" full onPress={onPreview} disabled={!restoreText.trim()}>
            Preview snapshot
          </Button>
        </View>
      )}

      {restoreError ? (
        <Text style={{ ...type.cardSub, color: tokens.danger, marginTop: 8 }}>{restoreError}</Text>
      ) : null}
    </Card>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  const { tokens } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Text style={{ ...type.monoSm, color: tokens.textDim, width: 88 }}>{label.toUpperCase()}</Text>
      <Text style={{ ...type.cardSub, color: tokens.text, flex: 1 }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────

function ProfileFooter({ chainHash }: { chainHash: string | null }) {
  const { tokens } = useTheme();
  const head = chainHash ? chainHash.slice(0, 8) : '—';
  return (
    <View
      style={{
        alignItems: 'center',
        gap: 6,
        paddingTop: 36,
        paddingBottom: 28,
      }}
    >
      <IconBrand size={24} color={tokens.textFaint} fill={tokens.accent} fillOpacity={0.18} />
      <Text style={{ ...type.monoSm, color: tokens.textFaint, textTransform: 'uppercase' }}>
        {`Rope Access Logbook · v1.0 · chain ${head}`}
      </Text>
    </View>
  );
}

function deriveInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '—';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
