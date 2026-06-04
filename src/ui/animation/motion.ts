// Motion signature for Rope Access Logbook.
//
// Every new animation in the app draws its timing + curve from here, so motion
// reads as one coherent voice rather than a grab-bag. The numbers are anchored
// to the established hero moments: the seal sweep (seal-anim.tsx) and the
// career-hours count-up (animated-number.tsx) — those file-local constants are
// mirrored here as `durations.seal*` / `durations.count` so future work can
// migrate onto this module without re-deriving the feel.
//
// House rules for anything that consumes these:
//   1. Gate on useReducedMotion() — land in the end state, don't animate.
//   2. useNativeDriver: true for opacity/transform (never for color/layout).

import { Easing } from 'react-native';

export const easings = {
  // The seal sweep's curve — the signature for continuous draws.
  house: Easing.bezier(0.65, 0.05, 0.36, 1),
  // Decelerate to rest — entrances and reveals. Echoes the count-up's cubic-out.
  decelerate: Easing.out(Easing.cubic),
  // Gentle ease-out — matches the seal's stamp/brand reveal.
  standard: Easing.out(Easing.ease),
};

export const durations = {
  // Established hero-moment timings (kept here for coherence; see file note).
  sealSweep: 1400,
  sealStamp: 360,
  reveal: 280,
  count: 900,
  // New, this layer.
  entrance: 360,
  pressIn: 90,
  pressOut: 150,
  // Tab focus settle (active-state lift + indicator).
  tabFocus: 200,
} as const;

// Staggered content entrance — one well-orchestrated reveal per screen load.
export const entrance = {
  duration: durations.entrance,
  easing: easings.decelerate,
  // ms of delay added per successive item in a batch.
  stagger: 55,
  // Cap the stagger index so long lists don't lag the last rows in by seconds.
  staggerCap: 6,
  // translateY start offset (px) — content rises a hair into place.
  offsetY: 10,
} as const;

// Press feedback — a smooth scale instead of an instant snap. Bigger surfaces
// move less, so the gesture reads as a consistent ~2–3% "give" across sizes.
export const press = {
  inDuration: durations.pressIn,
  outDuration: durations.pressOut,
  inEasing: easings.standard,
  outEasing: easings.decelerate,
  scale: {
    button: 0.97,
    card: 0.985,
    row: 0.99,
    tab: 0.96,
    fab: 0.94,
  },
} as const;
