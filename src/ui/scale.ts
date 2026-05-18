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

// For non-integer values that we want to keep precise (letterSpacing,
// strokeWidth, etc).
export function scaledF(n: number): number {
  return n * UI_SCALE;
}
