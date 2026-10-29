import React from 'react';
import {AppState, Linking, Platform} from 'react-native';
import ReactTestRenderer, {act} from 'react-test-renderer';

import * as capture from '../src/native/capture';
import {SettingsScreen} from '../src/screens/SettingsScreen';
import * as calendar from '../src/services/deviceCalendar';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('../src/native/capture', () => ({
  notificationCaptureAvailable: jest.fn(), iosShortcutCaptureAvailable: jest.fn(),
  notificationAccessGranted: jest.fn().mockResolvedValue(false),
  detectionAlertPermissionGranted: jest.fn().mockResolvedValue(false),
  backgroundExecutionAllowed: jest.fn().mockResolvedValue(false),
  getSelectableNotificationApps: jest.fn().mockResolvedValue([]),
  getSelectedNotificationPackages: jest.fn().mockResolvedValue([]),
  openApplicationPermissionSettings: jest.fn().mockResolvedValue(undefined),
  openBackgroundExecutionSettings: jest.fn().mockResolvedValue(undefined),
  openNotificationAccessSettings: jest.fn().mockResolvedValue(undefined),
  requestDetectionAlertPermission: jest.fn().mockResolvedValue(true),
  saveSelectedNotificationPackages: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../src/services/deviceCalendar', () => ({
  deviceCalendarPermissionGranted: jest.fn().mockResolvedValue(false),
  requestDeviceCalendarPermission: jest.fn().mockResolvedValue(true),
}));

const originalOs = Object.getOwnPropertyDescriptor(Platform, 'OS');
const originalVersion = Object.getOwnPropertyDescriptor(Platform, 'Version');
let renderer: ReactTestRenderer.ReactTestRenderer;

async function renderSettings(os: 'android' | 'ios', version = 27) {
  Object.defineProperty(Platform, 'OS', {configurable: true, value: os});
  Object.defineProperty(Platform, 'Version', {configurable: true, value: version});
  jest.mocked(capture.notificationCaptureAvailable).mockReturnValue(os === 'android');
  jest.mocked(capture.iosShortcutCaptureAvailable).mockReturnValue(os === 'ios');
  await act(async () => {
    renderer = ReactTestRenderer.create(<SettingsScreen session={{userId: 'guest', displayName: '테스트', guest: true}} onLogout={jest.fn()} />);
  });
}

async function press(label: string) {
  await act(async () => renderer.root.findByProps({accessibilityLabel: label}).props.onPress());
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(capture.detectionAlertPermissionGranted).mockResolvedValue(false);
  jest.mocked(capture.requestDetectionAlertPermission).mockResolvedValue(true);
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({remove: jest.fn()});
});

afterEach(async () => {
  if (renderer) { await act(async () => renderer.unmount()); }
  jest.restoreAllMocks();
  if (originalOs) { Object.defineProperty(Platform, 'OS', originalOs); }
  if (originalVersion) { Object.defineProperty(Platform, 'Version', originalVersion); }
});

test('iPhone은 단축어와 네트워크 설정만 표시하고 Android 권한을 조회하지 않는다', async () => {
  await renderSettings('ios');
  const output = JSON.stringify(renderer.toJSON());
  expect(output).toContain('iPhone 설정');
  expect(output).toContain('iPhone 알림 자동화');
  expect(output).toContain('로컬 네트워크 접근');
  expect(output).not.toContain('Android 알림 접근 권한');
  expect(output).not.toContain('백그라운드 실행');
  expect(output).not.toContain('기기 캘린더 연동');
  expect(capture.notificationAccessGranted).not.toHaveBeenCalled();
  expect(capture.getSelectableNotificationApps).not.toHaveBeenCalled();
  expect(capture.backgroundExecutionAllowed).not.toHaveBeenCalled();
  expect(calendar.deviceCalendarPermissionGranted).not.toHaveBeenCalled();
  await press('로컬 네트워크 접근');
  expect(capture.openApplicationPermissionSettings).toHaveBeenCalledTimes(1);
}, 15000);

test('Android는 알림 접근과 배터리 설정을 각각 맞는 시스템 화면으로 연결한다', async () => {
  await renderSettings('android', 36);
  const output = JSON.stringify(renderer.toJSON());
  expect(output).toContain('Android 설정');
  expect(output).toContain('알림을 읽을 앱');
  expect(output).toContain('기기 캘린더 연동');
  expect(output).not.toContain('iPhone 알림 자동화');
  expect(output).not.toContain('로컬 네트워크 접근');
  await press('Android 알림 접근 권한');
  await press('백그라운드 실행');
  expect(capture.openNotificationAccessSettings).toHaveBeenCalledTimes(1);
  expect(capture.openBackgroundExecutionSettings).toHaveBeenCalledTimes(1);
});

test('iPhone 단축어 안내에서 단축어 앱을 열 수 있다', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  await renderSettings('ios');
  await press('iPhone 알림 자동화');
  await press('단축어 앱 열기');
  expect(open).toHaveBeenCalledWith('shortcuts://');
});

test('알림 권한이 이미 있으면 다시 요청하지 않고 시스템 설정을 연다', async () => {
  jest.mocked(capture.detectionAlertPermissionGranted).mockResolvedValue(true);
  await renderSettings('ios');
  await press('감지 알림');
  expect(capture.requestDetectionAlertPermission).not.toHaveBeenCalled();
  expect(capture.openApplicationPermissionSettings).toHaveBeenCalledTimes(1);
});

test('알림 권한 요청이 거부되면 시스템 설정에서 변경할 수 있다', async () => {
  jest.mocked(capture.requestDetectionAlertPermission).mockResolvedValue(false);
  await renderSettings('ios');
  await press('감지 알림');
  expect(capture.requestDetectionAlertPermission).toHaveBeenCalledTimes(1);
  expect(capture.openApplicationPermissionSettings).toHaveBeenCalledTimes(1);
});

test('이전 iOS에는 알림 자동화의 버전 조건을 안내한다', async () => {
  await renderSettings('ios', 26);
  expect(JSON.stringify(renderer.toJSON())).toContain('알림 자동화는 iOS 27 이상');
  await press('iPhone 알림 자동화');
  expect(renderer.root.findAllByProps({accessibilityLabel: '단축어 앱 열기'})).toHaveLength(0);
});
