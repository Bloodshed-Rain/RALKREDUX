// Persistence for the local profile avatar. The image picker / camera hands us
// a temporary URI (cache dir on native, a blob: URL on web) — neither survives
// app restarts. We copy the chosen image into expo-file-system's
// documentDirectory under a unique filename so it's stable, then hand the
// caller the durable URI to record on the profile row.
//
// Two deliberate choices:
//   • Unique filename per change → React Native's <Image> caches by URI, so a
//     fresh path is what forces the new photo to actually render.
//   • Old file is deleted only AFTER the DB write succeeds (caller's order), so
//     a failed write leaves the previous avatar resolvable rather than orphaned.
//
// Web has no documentDirectory; there we pass the picked URI straight through.

import * as FileSystem from 'expo-file-system/legacy';
import { createId } from '@/src/domain/id';

function extensionFor(uri: string): string {
  const match = /\.(jpe?g|png|heic|webp)(?:\?|$)/i.exec(uri);
  return match ? match[1].toLowerCase() : 'jpg';
}

/**
 * Copy a picked image into durable storage and return its stable URI.
 * On web (no documentDirectory) the source URI is returned unchanged.
 */
export async function persistAvatarFile(sourceUri: string): Promise<string> {
  const dir = FileSystem.documentDirectory;
  if (!dir) return sourceUri;

  const target = `${dir}${createId('avatar')}.${extensionFor(sourceUri)}`;
  await FileSystem.copyAsync({ from: sourceUri, to: target });
  return target;
}

/**
 * Remove a previously-persisted avatar file. Idempotent and scoped: only files
 * we own (under documentDirectory) are touched, so we never delete the picker's
 * original in the photo library or cache. No-op for null / web / foreign URIs.
 */
export async function deleteAvatarFile(uri: string | null): Promise<void> {
  const dir = FileSystem.documentDirectory;
  if (!uri || !dir || !uri.startsWith(dir)) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Best-effort cleanup — a leftover orphan is harmless and not worth
    // surfacing to the user.
  }
}
