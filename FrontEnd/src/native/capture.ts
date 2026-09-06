import {Linking, NativeModules, Platform} from 'react-native';

import {CapturedNotification} from '../domain';

type NotificationCaptureModule = {
  isAccessGranted(): Promise<boolean>;
  openAccessSettings(): Promise<void>;
  drainPending(): Promise<CapturedNotification[]>;
};

const nativeCapture = NativeModules.MemoaNotificationCapture as NotificationCaptureModule | undefined;

export function notificationCaptureAvailable(): boolean {
  return Platform.OS === 'android' && Boolean(nativeCapture);
}

export async function getSharedTextFromUrl(url: string | null): Promise<string | null> {
  if (!url || !url.startsWith('memoa://capture')) {
    return null;
  }
  const match = url.match(/[?&]text=([^&]+)/);
  return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : null;
}

export async function getInitialSharedText(): Promise<string | null> {
  return getSharedTextFromUrl((await Linking.getInitialURL()) ?? null);
}

export async function notificationAccessGranted(): Promise<boolean> {
  if (Platform.OS !== 'android' || !nativeCapture) {
    return false;
  }
  return nativeCapture.isAccessGranted();
}

export async function openNotificationAccessSettings(): Promise<void> {
  if (Platform.OS === 'android' && nativeCapture) {
    await nativeCapture.openAccessSettings();
  }
}

export async function drainCapturedNotifications(): Promise<CapturedNotification[]> {
  if (Platform.OS !== 'android' || !nativeCapture) {
    return [];
  }
  return nativeCapture.drainPending();
}
