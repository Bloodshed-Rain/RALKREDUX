// Share a generated text payload (CSV / JSON) as a real FILE.
//
// `Share.share({ message })` puts the whole payload into a message body — which
// for a logbook export means a multi-megabyte string pasted into Mail/Messages
// instead of an attachable artifact. Every text export therefore writes to the
// cache directory first and goes out through `expo-sharing`, matching what the
// PDF paths already do.
//
// `Share.share` remains only as the last-resort fallback for platforms with no
// share-sheet provider (notably web), where a file URI can't be handed off.

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

export type ShareableTextFormat = 'json' | 'csv';

const MIME_TYPE: Record<ShareableTextFormat, string> = {
  json: 'application/json',
  csv: 'text/csv',
};

// iOS uniform type identifiers. Getting these right is what makes the receiving
// app offer "open in Numbers/Excel" rather than treating the payload as text.
const UTI: Record<ShareableTextFormat, string> = {
  json: 'public.json',
  csv: 'public.comma-separated-values-text',
};

export interface ShareTextAsFileOptions {
  fileName: string;
  contents: string;
  format: ShareableTextFormat;
  dialogTitle: string;
}

export async function shareTextAsFile({
  fileName,
  contents,
  format,
  dialogTitle,
}: ShareTextAsFileOptions): Promise<void> {
  const dir = FileSystem.cacheDirectory;
  if (dir && (await Sharing.isAvailableAsync())) {
    const uri = `${dir}${fileName}`;
    // Overwrite rather than append — a repeat export of the same day must not
    // stack onto the previous run's bytes.
    await FileSystem.deleteAsync(uri, { idempotent: true });
    await FileSystem.writeAsStringAsync(uri, contents);
    await Sharing.shareAsync(uri, {
      dialogTitle,
      mimeType: MIME_TYPE[format],
      UTI: UTI[format],
    });
    return;
  }
  await Share.share({ title: dialogTitle, message: contents });
}
