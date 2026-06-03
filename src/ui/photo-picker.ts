// Camera-first photo capture for evidence attachments. Two call sites consume
// this: the New Entry wizard (`app/entry/new.tsx`) and the Entry Detail screen
// (`app/entry/[id].tsx`). Both used to call `launchImageLibraryAsync` directly,
// which is backwards for an in-field flow — a tech standing in a harness wants
// to take the photo now, not pick yesterday's screenshots.
//
// UX contract: a single Alert prompts "Take photo" first (camera-first) with
// "From photos" as the discoverable secondary. Camera path requests permission
// on demand and falls back to a permission-denied alert; library path is
// permission-less on iOS 14+ and handled by `expo-image-picker` on Android.

import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export interface PickedPhoto {
  uri: string;
  fileName: string | null;
  mimeType: string | null;
}

type PhotoSource = 'camera' | 'library';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  quality: 0.75,
};

// Optional copy + cropping overrides so non-evidence flows (e.g. the profile
// avatar) can reuse the same camera-first picker without the "evidence" framing.
export interface CapturePhotoOptions {
  /** Title of the source-choice Alert. Defaults to the evidence framing. */
  promptTitle?: string;
  /** Message of the source-choice Alert. */
  promptMessage?: string;
  /** Force a square 1:1 crop (avatars). Off by default. */
  square?: boolean;
}

export async function captureOrPickPhoto(
  options: CapturePhotoOptions = {},
): Promise<PickedPhoto | null> {
  const source = await promptSource(options.promptTitle, options.promptMessage);
  if (!source) return null;

  const pickerOptions: ImagePicker.ImagePickerOptions = options.square
    ? { ...PICKER_OPTIONS, allowsEditing: true, aspect: [1, 1] }
    : PICKER_OPTIONS;

  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Camera permission needed',
        'Allow Rope Access Logbook to use the camera to take evidence photos, or pick from your library instead.',
      );
      return null;
    }
  }

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(pickerOptions);

  if (result.canceled || !result.assets.length) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    fileName: asset.fileName ?? null,
    mimeType: asset.mimeType ?? null,
  };
}

function promptSource(
  title = 'Add photo evidence',
  message = 'Capture now or pick from your library.',
): Promise<PhotoSource | null> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Take photo', onPress: () => resolve('camera') },
        { text: 'From photos', onPress: () => resolve('library') },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ],
      { onDismiss: () => resolve(null), cancelable: true },
    );
  });
}
