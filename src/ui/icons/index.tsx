// Icon facade for the app. Most public IconX components render the generated
// currentColor SVGs in `src/ui/icons/custom`; the remaining fallbacks keep the
// original 24x24 duotone shapes where the custom set has no exact equivalent.

import React from 'react';
import { Svg, SvgXml, G, Path, Rect, Circle } from 'react-native-svg';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { scaledIcon } from '@/src/ui/scale';
import type { GearCategory } from '@/src/domain/gear/types';

import anchorXml from '@/src/ui/icons/custom/anchor';
import ascenderXml from '@/src/ui/icons/custom/ascender';
import bellXml from '@/src/ui/icons/custom/bell';
import brokenChainXml from '@/src/ui/icons/custom/brokenChain';
import cameraXml from '@/src/ui/icons/custom/camera';
import carabinerXml from '@/src/ui/icons/custom/carabiner';
import cloudXml from '@/src/ui/icons/custom/cloud';
import cloudAltXml from '@/src/ui/icons/custom/cloudAlt';
import cloudBackupXml from '@/src/ui/icons/custom/cloudBackup';
import draftXml from '@/src/ui/icons/custom/draft';
import editXml from '@/src/ui/icons/custom/edit';
import harnessXml from '@/src/ui/icons/custom/harness';
import helmetXml from '@/src/ui/icons/custom/helmet';
import inboxXml from '@/src/ui/icons/custom/inbox';
import inspectXml from '@/src/ui/icons/custom/inspect';
import lanyardXml from '@/src/ui/icons/custom/lanyard';
import lifeRingXml from '@/src/ui/icons/custom/lifeRing';
import lockXml from '@/src/ui/icons/custom/lock';
import moreXml from '@/src/ui/icons/custom/more';
import paintRollerXml from '@/src/ui/icons/custom/paintRoller';
import paintRollerAltXml from '@/src/ui/icons/custom/paintRollerAlt';
import pendingXml from '@/src/ui/icons/custom/pending';
import plusXml from '@/src/ui/icons/custom/plus';
import ropeXml from '@/src/ui/icons/custom/rope';
import pulleyXml from '@/src/ui/icons/custom/pulley';
import pulleyHaulXml from '@/src/ui/icons/custom/pulleyHaul';
import profileXml from '@/src/ui/icons/custom/profile';
import recordsXml from '@/src/ui/icons/custom/records';
import riggingPlateXml from '@/src/ui/icons/custom/riggingPlate';
import searchXml from '@/src/ui/icons/custom/search';
import settingsXml from '@/src/ui/icons/custom/settings';
import shareXml from '@/src/ui/icons/custom/share';
import signDocumentXml from '@/src/ui/icons/custom/signDocument';
import signatureXml from '@/src/ui/icons/custom/signature';
import slingXml from '@/src/ui/icons/custom/sling';
import squeegeeXml from '@/src/ui/icons/custom/squeegee';
import todayXml from '@/src/ui/icons/custom/today';
import trainingXml from '@/src/ui/icons/custom/training';
import trashXml from '@/src/ui/icons/custom/trash';
import warnXml from '@/src/ui/icons/custom/warn';
import weldingTorchXml from '@/src/ui/icons/custom/weldingTorch';
import arrowLeftXml from '@/src/ui/icons/custom/arrowLeft';
import boltXml from '@/src/ui/icons/custom/bolt';
import checkXml from '@/src/ui/icons/custom/check';
import closeXml from '@/src/ui/icons/custom/close';
import heightXml from '@/src/ui/icons/custom/height';
import stampXml from '@/src/ui/icons/custom/stamp';
import syncXml from '@/src/ui/icons/custom/sync';

export interface IconProps {
  size?: number;
  color?: string;
  fill?: string;
  fillOpacity?: number;
}

interface IconBodyProps extends IconProps {
  duotone?: React.ReactNode;
  shape: React.ReactNode;
}

function Icon({ size = 24, color, fill, fillOpacity = 0.28, duotone, shape }: IconBodyProps) {
  const { tokens } = useTheme();
  const ink = color ?? tokens.text;
  const tint = fill ?? tokens.accent;
  const px = scaledIcon(size);
  return (
    <Svg width={px} height={px} viewBox="0 0 24 24" fill="none">
      {duotone ? (
        <G fill={tint} opacity={fillOpacity}>
          {duotone}
        </G>
      ) : null}
      <G fill={ink}>{shape}</G>
    </Svg>
  );
}

// Renders a generated currentColor SVG from `src/ui/icons/custom/`.
function CustomIcon({ xml, size = 24, color, fill }: IconProps & { xml: string }) {
  const { tokens } = useTheme();
  const ink = color ?? fill ?? tokens.text;
  const px = scaledIcon(size);
  return <SvgXml xml={xml} width={px} height={px} color={ink} />;
}

// ─── Navigation ────────────────────────────────────────────────────────────

export function IconBrand(p: IconProps) {
  // App mark: the rope-access climber silhouette (same custom art as the Profile
  // icon). Replaces the legacy duotone carabiner-style mark so the brand renders
  // single-tone and theme-aware like the rest of the icon set. Every call site
  // passes its own `color`, which CustomIcon honors.
  return <CustomIcon {...p} xml={profileXml} />;
}

export function IconToday(p: IconProps) {
  return <CustomIcon {...p} xml={todayXml} />;
}

export function IconRecords(p: IconProps) {
  return <CustomIcon {...p} xml={recordsXml} />;
}

export function IconNew(p: IconProps) {
  return <CustomIcon {...p} xml={plusXml} />;
}

export function IconGear(p: IconProps) {
  return <CustomIcon {...p} xml={carabinerXml} />;
}

export function IconProfile(p: IconProps) {
  return <CustomIcon {...p} xml={profileXml} />;
}

// ─── Actions ───────────────────────────────────────────────────────────────

export function IconSync(p: IconProps) {
  return <CustomIcon {...p} xml={syncXml} />;
}

export function IconSign(p: IconProps) {
  return <CustomIcon {...p} xml={signDocumentXml} />;
}

export function IconStamp(p: IconProps) {
  return <CustomIcon {...p} xml={stampXml} />;
}

export function IconChain(p: IconProps) {
  return (
    <Icon
      {...p}
      duotone={
        <Path d="M7 9a4 4 0 0 1 4-4h1a.9.9 0 1 1 0 1.8h-1a2.2 2.2 0 0 0-2.2 2.2v6a2.2 2.2 0 0 0 2.2 2.2h1a.9.9 0 1 1 0 1.8h-1a4 4 0 0 1-4-4V9Zm6 6a4 4 0 0 1 4-4V9a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-1a.9.9 0 1 1 0-1.8h1a2.2 2.2 0 0 0 2.2-2.2v-6a2.2 2.2 0 0 0-2.2-2.2h-1a.9.9 0 1 1 0-1.8h1a4 4 0 0 1 4 4v6Z" />
      }
      shape={
        <Path d="M8.5 5a3.5 3.5 0 0 0-3.5 3.5v2a.9.9 0 1 0 1.8 0v-2A1.7 1.7 0 0 1 8.5 6.8h2a.9.9 0 1 0 0-1.8h-2Zm9.5 8.6a.9.9 0 0 0-.9.9v2a1.7 1.7 0 0 1-1.7 1.7h-2a.9.9 0 1 0 0 1.8h2a3.5 3.5 0 0 0 3.5-3.5v-2a.9.9 0 0 0-.9-.9ZM9 11.1a.9.9 0 0 0 0 1.8h6a.9.9 0 1 0 0-1.8H9Z" />
      }
    />
  );
}

export function IconExport(p: IconProps) {
  return <CustomIcon {...p} xml={shareXml} />;
}

export function IconBolt(p: IconProps) {
  return <CustomIcon {...p} xml={boltXml} />;
}

export function IconPlus(p: IconProps) {
  return <CustomIcon {...p} xml={plusXml} />;
}

export function IconCheck(p: IconProps) {
  return <CustomIcon {...p} xml={checkXml} />;
}

export function IconClose(p: IconProps) {
  return <CustomIcon {...p} xml={closeXml} />;
}

export function IconChevron(p: IconProps) {
  return (
    <Icon
      {...p}
      shape={
        <Path d="M9.3 5.94a.9.9 0 0 1 1.28 0l5.4 5.4a.9.9 0 0 1 0 1.28l-5.4 5.4a.9.9 0 1 1-1.28-1.28L13.98 12 9.3 7.22a.9.9 0 0 1 0-1.28Z" />
      }
    />
  );
}

export function IconArrowLeft(p: IconProps) {
  return <CustomIcon {...p} xml={arrowLeftXml} />;
}

export function IconMore(p: IconProps) {
  return <CustomIcon {...p} xml={moreXml} />;
}

export function IconSearch(p: IconProps) {
  return <CustomIcon {...p} xml={searchXml} />;
}

export function IconFilter(p: IconProps) {
  return <CustomIcon {...p} xml={settingsXml} />;
}

export function IconCamera(p: IconProps) {
  return <CustomIcon {...p} xml={cameraXml} />;
}

// ─── Status ────────────────────────────────────────────────────────────────

export function IconVerified(p: IconProps) {
  return (
    <Icon
      {...p}
      duotone={<Path d="M12 2.5 4 5v6c0 4.4 3.2 8.5 8 10 4.8-1.5 8-5.6 8-10V5l-8-2.5Z" />}
      shape={
        <Path d="M12 1.6a.9.9 0 0 0-.27.04L3.73 4.14A.9.9 0 0 0 3.1 5v6c0 4.86 3.6 9.3 8.6 10.86a.9.9 0 0 0 .6 0c5-1.56 8.6-6 8.6-10.86V5a.9.9 0 0 0-.63-.86L12.27 1.64A.9.9 0 0 0 12 1.6Zm0 1.84 7.1 2.21V11c0 3.94-2.84 7.6-7.1 9-4.26-1.4-7.1-5.06-7.1-9V5.65L12 3.44Zm3.96 6.42-5.06 5.06-2.84-2.84a.9.9 0 1 0-1.28 1.28l3.48 3.48a.9.9 0 0 0 1.28 0l5.7-5.7a.9.9 0 1 0-1.28-1.28Z" />
      }
    />
  );
}

export function IconDraft(p: IconProps) {
  return <CustomIcon {...p} xml={draftXml} />;
}

export function IconPending(p: IconProps) {
  return <CustomIcon {...p} xml={pendingXml} />;
}

export function IconVoid(p: IconProps) {
  return <CustomIcon {...p} xml={brokenChainXml} />;
}

export function IconWarn(p: IconProps) {
  return <CustomIcon {...p} xml={warnXml} />;
}

export function IconLock(p: IconProps) {
  return <CustomIcon {...p} xml={lockXml} />;
}

export function IconBell(p: IconProps) {
  return <CustomIcon {...p} xml={bellXml} />;
}

// ─── Gear ──────────────────────────────────────────────────────────────────

export function IconHarness(p: IconProps) {
  return <CustomIcon {...p} xml={harnessXml} />;
}

export function IconHelmet(p: IconProps) {
  return <CustomIcon {...p} xml={helmetXml} />;
}

export function IconRope(p: IconProps) {
  return <CustomIcon {...p} xml={ropeXml} />;
}

export function IconCarabiner(p: IconProps) {
  return <CustomIcon {...p} xml={carabinerXml} />;
}

export function IconDescender(p: IconProps) {
  return <CustomIcon {...p} xml={riggingPlateXml} />;
}

export function IconAscender(p: IconProps) {
  return <CustomIcon {...p} xml={ascenderXml} />;
}

export function IconLanyard(p: IconProps) {
  return <CustomIcon {...p} xml={lanyardXml} />;
}

export function IconSling(p: IconProps) {
  return <CustomIcon {...p} xml={slingXml} />;
}

export function IconPulley(p: IconProps) {
  return <CustomIcon {...p} xml={pulleyXml} />;
}

export function IconPulleyHaul(p: IconProps) {
  return <CustomIcon {...p} xml={pulleyHaulXml} />;
}

// ─── Form ──────────────────────────────────────────────────────────────────

export function IconClock(p: IconProps) {
  return <CustomIcon {...p} xml={pendingXml} />;
}

export function IconCalendar(p: IconProps) {
  return (
    <Icon
      {...p}
      duotone={<Rect x={3} y={6} width={18} height={15} rx={2} />}
      shape={
        <Path d="M7 2.6a.9.9 0 0 0-.9.9V5h-1.6A2.5 2.5 0 0 0 2 7.5v11A2.5 2.5 0 0 0 4.5 21h15a2.5 2.5 0 0 0 2.5-2.5v-11A2.5 2.5 0 0 0 19.5 5h-1.6V3.5a.9.9 0 1 0-1.8 0V5H7.9V3.5a.9.9 0 0 0-.9-.9Zm-2.5 4.2h15a.7.7 0 0 1 .7.7v1.1h-16.4V7.5a.7.7 0 0 1 .7-.7Zm-.7 3.6h16.4v7.6a.7.7 0 0 1-.7.7h-15a.7.7 0 0 1-.7-.7v-7.6Z" />
      }
    />
  );
}

export function IconHeight(p: IconProps) {
  return <CustomIcon {...p} xml={heightXml} />;
}

export function IconLocation(p: IconProps) {
  return (
    <Icon
      {...p}
      duotone={<Path d="M12 2c4 0 7 3 7 7 0 5-7 13-7 13S5 14 5 9c0-4 3-7 7-7Z" />}
      shape={
        <Path d="M12 1.6c-4.4 0-7.9 3.4-7.9 7.6 0 2.7 1.7 5.9 3.5 8.5a36 36 0 0 0 3.7 4.65.9.9 0 0 0 1.4 0c.1-.11 4-4.59 5.7-8 1-1.95 1.5-3.65 1.5-5.15 0-4.2-3.5-7.6-7.9-7.6Zm0 1.8c3.5 0 6.1 2.6 6.1 5.8 0 1.04-.36 2.36-1.2 4-1.2 2.4-3.5 5.4-4.9 7.1-1.4-1.65-3.7-4.6-4.9-7.05C6.26 11.6 5.9 10.3 5.9 9.2c0-3.2 2.6-5.8 6.1-5.8Zm0 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0 1.8a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z" />
      }
    />
  );
}

export function IconWifi(p: IconProps) {
  return (
    <Icon
      {...p}
      duotone={<Path d="M3 9a13 13 0 0 1 18 0M6 13a8 8 0 0 1 12 0" />}
      shape={
        <>
          <Path d="M12 4a14 14 0 0 0-9.8 4 .9.9 0 1 0 1.28 1.28A12.2 12.2 0 0 1 12 5.8a12.2 12.2 0 0 1 8.52 3.48.9.9 0 1 0 1.28-1.28A14 14 0 0 0 12 4Zm0 4.4a9.6 9.6 0 0 0-6.78 2.8.9.9 0 1 0 1.28 1.28A7.8 7.8 0 0 1 12 10.2a7.8 7.8 0 0 1 5.5 2.28.9.9 0 1 0 1.28-1.28A9.6 9.6 0 0 0 12 8.4Z" />
          <Circle cx={12} cy={17.4} r={1.6} />
        </>
      }
    />
  );
}

export function IconOffline(p: IconProps) {
  return (
    <Icon
      {...p}
      duotone={<Circle cx={12} cy={17.4} r={1.6} />}
      shape={
        <Path d="M4.04 4.04a.9.9 0 0 1 1.28 0l15 15a.9.9 0 1 1-1.28 1.28l-3.04-3.04a3 3 0 0 1-5.96-1.1 3 3 0 0 1 .26-1.2L4.04 5.32a.9.9 0 0 1 0-1.28Zm17.32 5.24A14 14 0 0 0 12 4c-1.06 0-2.1.12-3.1.34l1.74 1.74A12.2 12.2 0 0 1 12 5.8a12.2 12.2 0 0 1 8.52 3.48.9.9 0 1 0 .84-.94Z" />
      }
    />
  );
}

// ─── Misc ──────────────────────────────────────────────────────────────────

export function IconSettings(p: IconProps) {
  return <CustomIcon {...p} xml={settingsXml} />;
}

export function IconAnchor(p: IconProps) {
  return <CustomIcon {...p} xml={anchorXml} />;
}

export function IconBrokenChain(p: IconProps) {
  return <CustomIcon {...p} xml={brokenChainXml} />;
}

export function IconCloud(p: IconProps) {
  return <CustomIcon {...p} xml={cloudXml} />;
}

export function IconCloudAlt(p: IconProps) {
  return <CustomIcon {...p} xml={cloudAltXml} />;
}

export function IconCloudBackup(p: IconProps) {
  return <CustomIcon {...p} xml={cloudBackupXml} />;
}

export function IconClimber(p: IconProps) {
  return <CustomIcon {...p} xml={profileXml} />;
}

export function IconEdit(p: IconProps) {
  return <CustomIcon {...p} xml={editXml} />;
}

export function IconInbox(p: IconProps) {
  return <CustomIcon {...p} xml={inboxXml} />;
}

export function IconInspect(p: IconProps) {
  return <CustomIcon {...p} xml={inspectXml} />;
}

export function IconLifeRing(p: IconProps) {
  return <CustomIcon {...p} xml={lifeRingXml} />;
}

export function IconPaintRoller(p: IconProps) {
  return <CustomIcon {...p} xml={paintRollerXml} />;
}

export function IconPaintRollerAlt(p: IconProps) {
  return <CustomIcon {...p} xml={paintRollerAltXml} />;
}

export function IconRescue(p: IconProps) {
  return <CustomIcon {...p} xml={lifeRingXml} />;
}

export function IconRiggingPlate(p: IconProps) {
  return <CustomIcon {...p} xml={riggingPlateXml} />;
}

export function IconSignDocument(p: IconProps) {
  return <CustomIcon {...p} xml={signDocumentXml} />;
}

export function IconSignature(p: IconProps) {
  return <CustomIcon {...p} xml={signatureXml} />;
}

export function IconSqueegee(p: IconProps) {
  return <CustomIcon {...p} xml={squeegeeXml} />;
}

export function IconTraining(p: IconProps) {
  return <CustomIcon {...p} xml={trainingXml} />;
}

export function IconTrash(p: IconProps) {
  return <CustomIcon {...p} xml={trashXml} />;
}

export function IconWeldingTorch(p: IconProps) {
  return <CustomIcon {...p} xml={weldingTorchXml} />;
}

// ─── Gear category mapping ────────────────────────────────────────────────

export type IconComponent = React.ComponentType<IconProps>;

// Maps every `GearCategory` to its custom icon. `other` intentionally keeps the
// carabiner as the most neutral rope-access fallback.
export const GEAR_ICON: Record<GearCategory, IconComponent> = {
  harness: IconHarness,
  helmet: IconHelmet,
  rope: IconRope,
  carabiner: IconCarabiner,
  descender: IconDescender,
  ascender: IconAscender,
  lanyard: IconLanyard,
  sling: IconSling,
  pulley: IconPulley,
  other: IconCarabiner,
};
