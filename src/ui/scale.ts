// Global UI scale. Applied to typography (every fontSize / lineHeight /
// letterSpacing in `src/ui/theme/type.ts`) and to primitive size tables
// (Button SIZES, Pill SIZE_SPEC, IconBtn SIZES). Inline icon `size={N}`
// call sites across screens have been bumped to match — search for
// "size={..}" in app/** and src/ui/primitives/** when reverting.
//
// Set to 1.0 to revert. Bumping this single constant re-scales every
// scaled value at the source — but inline icon sizes baked into call
// sites would need a second pass.

export const UI_SCALE = 1.18;

export function scaled(n: number): number {
  return Math.round(n * UI_SCALE);
}

// Global icon multiplier, applied inside `Icon` / `CustomIcon` so every icon
// in the app grows from one knob. Capped at a size threshold so large
// decorative/illustrative icons (empty-state plates, splash/hero marks) keep
// their hand-tuned dimensions and don't overflow their containers — only the
// functional/nav/status icons (≤36px) scale. Set ICON_SCALE to 1.0 to revert.
export const ICON_SCALE = 1.4;
const ICON_SCALE_MAX_BASE = 36;

export function scaledIcon(n: number): number {
  return n <= ICON_SCALE_MAX_BASE ? Math.round(n * ICON_SCALE) : n;
}

// For non-integer values that we want to keep precise (letterSpacing,
// strokeWidth, etc).
export function scaledF(n: number): number {
  return n * UI_SCALE;
}
