import {Linking, NativeModules, PermissionsAndroid, Platform} from 'react-native';

import {CapturedNotification} from '../domain';

type NotificationCaptureModule = {
  isAccessGranted(): Promise<boolean>;
  openAccessSettings(): Promise<void>;
  openApplicationSettings(): Promise<void>;
  isBackgroundExecutionAllowed(): Promise<boolean>;
  openBackgroundExecutionSettings(): Promise<void>;
  requestInitialBackgroundAccess(): Promise<boolean>;
  getSelectableApps(): Promise<NotificationSourceApp[]>;
  getSelectedPackages(): Promise<string[]>;
  setSelectedPackages(packages: string[]): Promise<void>;
  getPending?(): Promise<CapturedNotification[]>;
  removePending?(id: string): Promise<void>;
  drainPending(): Promise<CapturedNotification[]>;
};

export type NotificationSourceApp = {
  packageName: string;
  appName: string;
  iconDataUrl?: string;
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

export async function openApplicationPermissionSettings(): Promise<void> {
  if (Platform.OS === 'android' && nativeCapture) {
    await nativeCapture.openApplicationSettings();
    return;
  }
  await Linking.openSettings();
}

export async function backgroundExecutionAllowed(): Promise<boolean> {
  if (Platform.OS !== 'android' || !nativeCapture) {
    return false;
  }
  return nativeCapture.isBackgroundExecutionAllowed();
}

export async function openBackgroundExecutionSettings(): Promise<void> {
  if (Platform.OS === 'android' && nativeCapture) {
    await nativeCapture.openBackgroundExecutionSettings();
  }
}

export async function requestInitialBackgroundAccess(): Promise<boolean> {
  if (Platform.OS !== 'android' || !nativeCapture) {
    return false;
  }
  return nativeCapture.requestInitialBackgroundAccess();
}

export async function detectionAlertPermissionGranted(): Promise<boolean> {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 33) {
    return true;
  }
  return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
}

export async function requestDetectionAlertPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 33) {
    return true;
  }
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function getSelectableNotificationApps(): Promise<NotificationSourceApp[]> {
  if (Platform.OS !== 'android' || !nativeCapture) {
    return [];
  }
  return nativeCapture.getSelectableApps();
}

export async function getSelectedNotificationPackages(): Promise<string[]> {
  if (Platform.OS !== 'android' || !nativeCapture) {
    return [];
  }
  return nativeCapture.getSelectedPackages();
}

export async function saveSelectedNotificationPackages(packages: string[]): Promise<void> {
  if (Platform.OS === 'android' && nativeCapture) {
    await nativeCapture.setSelectedPackages(packages);
  }
}

export async function drainCapturedNotifications(): Promise<CapturedNotification[]> {
  if (Platform.OS !== 'android' || !nativeCapture) {
    return [];
  }
  return nativeCapture.drainPending();
}

export async function getCapturedNotifications(): Promise<CapturedNotification[]> {
  if (Platform.OS !== 'android' || typeof nativeCapture?.getPending !== 'function') {
    return [];
  }
  return nativeCapture.getPending();
}

export async function removeCapturedNotification(id: string): Promise<void> {
  if (Platform.OS === 'android' && typeof nativeCapture?.removePending === 'function') {
    await nativeCapture.removePending(id);
  }
}
