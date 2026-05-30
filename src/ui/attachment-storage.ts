// Persistence for entry evidence photos. expo-image-picker hands us a transient
// cache-dir URI (a blob: URL on web) that the OS can evict at any time. Because
// an entry LOCKS the moment it's signed, a dangling attachment pointer can never
// be repaired afterwards — the audit packet's photo evidence is permanently lost.
// So we copy the picked image into documentDirectory under a unique filename and
// record that durable URI instead. Mirrors src/ui/avatar-storage.ts.
//
// Web has no documentDirectory; there we pass the picked URI straight through.
// A copy failure also falls back to the source URI rather than throwing — the
// attachment still records (best effort) instead of blocking the user mid-shift.

import * as FileSystem from 'expo-file-system/legacy';
import { createId } from '@/src/domain/id';

function extensionFor(uri: string): string {
  const match = /\.(jpe?g|png|heic|webp)(?:\?|$)/i.exec(uri);
  return match ? match[1].toLowerCase() : 'jpg';
}

/**
 * Copy a picked evidence image into durable storage and return its stable URI.
 * Returns the source URI unchanged on web (no documentDirectory) or if the copy
 * fails.
 */
export async function persistAttachmentFile(sourceUri: string): Promise<string> {
  const dir = FileSystem.documentDirectory;
  if (!dir) return sourceUri;
  try {
    const target = `${dir}${createId('attach')}.${extensionFor(sourceUri)}`;
    await FileSystem.copyAsync({ from: sourceUri, to: target });
    return target;
  } catch {
    return sourceUri;
  }
}
