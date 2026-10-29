import {Linking, NativeEventEmitter, NativeModules, PermissionsAndroid, Platform} from 'react-native';

import {CapturedNotification} from '../domain';

type NotificationCaptureModule = {
  captureEventsSupported?: boolean;
  addListener?(eventName: string): void;
  removeListeners?(count: number): void;
  isAccessGranted(): Promise<boolean>;
  isDetectionAlertPermissionGranted?(): Promise<boolean>;
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
const iosCapture = NativeModules.MemoaShortcutCapture as {
  addListener?(eventName: string): void;
  removeListeners?(count: number): void;
  getPending(): Promise<CapturedNotification[]>;
  removePending(id: string): Promise<void>;
  alertPermission(): Promise<boolean>;
  requestAlertPermission(): Promise<boolean>;
} | undefined;

export function iosShortcutCaptureAvailable(): boolean {
  return Platform.OS === 'ios' && typeof iosCapture?.getPending === 'function';
}

export function notificationCaptureAvailable(): boolean {
  return Platform.OS === 'android' && Boolean(nativeCapture);
}

export function subscribeToCapturedNotifications(onChanged: () => void): {remove(): void} | null {
  const module = Platform.OS === 'ios' ? iosCapture
    : Platform.OS === 'android' && nativeCapture?.captureEventsSupported ? nativeCapture : undefined;
  if (typeof module?.addListener !== 'function' || typeof module.removeListeners !== 'function') {
    return null;
  }
  const emitter = new NativeEventEmitter({
    addListener: module.addListener,
    removeListeners: module.removeListeners,
  });
  return emitter.addListener('MemoaNotificationCandidatesChanged', onChanged);
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
  if (Platform.OS === 'ios') {
    return typeof iosCapture?.alertPermission === 'function' ? iosCapture.alertPermission() : false;
  }
  if (Platform.OS === 'android' && typeof nativeCapture?.isDetectionAlertPermissionGranted === 'function') {
    return nativeCapture.isDetectionAlertPermissionGranted();
  }
  if (Platform.OS !== 'android' || Number(Platform.Version) < 33) {
    return true;
  }
  return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
}

export async function requestDetectionAlertPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    return typeof iosCapture?.requestAlertPermission === 'function' ? iosCapture.requestAlertPermission() : false;
  }
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
  if (iosShortcutCaptureAvailable()) {
    return iosCapture!.getPending();
  }
  if (Platform.OS !== 'android' || typeof nativeCapture?.getPending !== 'function') {
    return [];
  }
  return nativeCapture.getPending();
}

export async function removeCapturedNotification(id: string): Promise<void> {
  if (Platform.OS === 'ios' && typeof iosCapture?.removePending === 'function') {
    await iosCapture.removePending(id);
    return;
  }
  if (Platform.OS === 'android' && typeof nativeCapture?.removePending === 'function') {
    await nativeCapture.removePending(id);
  }
}
