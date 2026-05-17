// v2 primitives — consumed by the v2 redesign screens.
// Old `src/ui/primitives/*` primitives stay around until each redesigned screen
// drops its last legacy import; the unused legacy primitives get deleted in the
// final-sweep task. Don't mix v1 and v2 primitives in a single screen.

export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './button';
export { IconBtn, type IconBtnProps, type IconBtnSize } from './icon-btn';
export { Card, type CardProps } from './card';
export {
  Pill,
  StatusPill,
  type PillProps,
  type PillTone,
  type PillSize,
  type StatusPillProps,
  type EntryStatusKey,
} from './pill';
export { Field, type FieldProps } from './field';
export { ChipSelect, type ChipOption, type ChipSelectProps } from './chip-select';
export { SectionH, type SectionHProps } from './section-h';
export { TopBar, type TopBarProps } from './top-bar';
export { TabBar, type TabBarProps, type TabKey } from './tab-bar';
export { SyncChip, type SyncChipProps, type SyncChipState } from './sync-chip';
export { Sheet, type SheetProps } from './sheet';
export { AnimatedNumber, type AnimatedNumberProps } from './animated-number';
export { HashGlyph, type HashGlyphProps } from './hash-glyph';
export { EmptyState, type EmptyStateProps } from './empty-state';
export { PullToRefresh, type PullToRefreshProps } from './pull-to-refresh';
export { EntryRow, type EntryRowProps } from './entry-row';
export { ChainLink, type ChainLinkItem, type ChainLinkProps } from './chain-link';
export { SigFill, type SigFillProps } from './sig-fill';
export { PhotoStrip, type PhotoStripItem, type PhotoStripProps } from './photo-strip';
export { SigPad, type SigPadProps, type SigPadHandle } from './sig-pad';
export { SealAnim, type SealAnimProps } from './seal-anim';
export { GearCard, type GearCardProps } from './gear-card';
export { CountdownDial, type CountdownDialProps, type CountdownStatus } from './countdown-dial';
