// Transient handoff between the catalog browser (`app/gear/catalog.tsx`)
// and the gear tab's Add-gear form (`app/(tabs)/gear.tsx`).
//
// Cross-route data passing in expo-router is awkward — pushing /gear with
// query params creates a new tab instance; going back via `router.back()`
// has no payload. So the catalog writes the picked entry to a fixed
// AsyncStorage slot, the gear tab reads it on focus and clears it. Single
// transient slot — only the most recent pick survives, and only until
// it's consumed.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GearCategory } from '@/src/domain/gear/types';

const KEY = 'ralb:transient:gear-catalog-pick';

export interface GearCatalogPick {
  manufacturer: string;
  model: string;
  category: GearCategory;
  image_url: string | null;
}

export async function writeGearCatalogPick(pick: GearCatalogPick): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(pick));
  } catch {
    // Best-effort; the user can still type the gear in manually.
  }
}

export async function consumeGearCatalogPick(): Promise<GearCatalogPick | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    await AsyncStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as Partial<GearCatalogPick>;
    if (!parsed.manufacturer || !parsed.model || !parsed.category) return null;
    return {
      manufacturer: String(parsed.manufacturer),
      model: String(parsed.model),
      category: parsed.category as GearCategory,
      image_url: parsed.image_url ?? null,
    };
  } catch {
    return null;
  }
}
