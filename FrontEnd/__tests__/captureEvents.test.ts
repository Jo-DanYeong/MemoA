const removeSubscription = jest.fn();
const addEventListener = jest.fn().mockReturnValue({remove: removeSubscription});
const createEmitter = jest.fn().mockImplementation(() => ({addListener: addEventListener}));

function loadBridge(platform: string, module?: object, iosModule?: object) {
  jest.doMock('react-native', () => ({
    Platform: {OS: platform},
    NativeModules: {MemoaNotificationCapture: module, MemoaShortcutCapture: iosModule},
    NativeEventEmitter: createEmitter,
  }));
  return require('../src/native/capture') as typeof import('../src/native/capture');
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

test('Android 후보 변경 이벤트를 구독하고 해제할 수 있다', () => {
  const onChanged = jest.fn();
  const bridge = loadBridge('android', {
    captureEventsSupported: true, addListener: jest.fn(), removeListeners: jest.fn(),
  });
  const subscription = bridge.subscribeToCapturedNotifications(onChanged);
  expect(addEventListener).toHaveBeenCalledWith('MemoaNotificationCandidatesChanged', onChanged);
  addEventListener.mock.calls[0][1]();
  expect(onChanged).toHaveBeenCalledTimes(1);
  subscription?.remove();
  expect(removeSubscription).toHaveBeenCalledTimes(1);
});

test('이벤트 API가 없는 이전 개발 APK에서도 오류 없이 기본 갱신으로 전환한다', () => {
  const bridge = loadBridge('android', {getPending: jest.fn()});
  expect(bridge.subscribeToCapturedNotifications(jest.fn())).toBeNull();
  expect(createEmitter).not.toHaveBeenCalled();
});

test.each(['android', 'ios'])('네이티브 모듈이 없는 %s 실행에서도 이벤트를 구독하지 않는다', platform => {
  const bridge = loadBridge(platform);
  expect(bridge.subscribeToCapturedNotifications(jest.fn())).toBeNull();
  expect(createEmitter).not.toHaveBeenCalled();
});

test('iPhone 단축어 후보를 읽고 삭제하며 변경 이벤트를 구독한다', async () => {
  const item = {id: 'ios-1', text: '내일 회의', sourceType: 'SHARE'};
  const module = {
    getPending: jest.fn().mockResolvedValue([item]), removePending: jest.fn().mockResolvedValue(undefined),
    addListener: jest.fn(), removeListeners: jest.fn(),
    alertPermission: jest.fn().mockResolvedValue(false), requestAlertPermission: jest.fn().mockResolvedValue(true),
  };
  const bridge = loadBridge('ios', undefined, module);
  expect(bridge.iosShortcutCaptureAvailable()).toBe(true);
  expect(await bridge.getCapturedNotifications()).toEqual([item]);
  await bridge.removeCapturedNotification(item.id);
  expect(module.removePending).toHaveBeenCalledWith(item.id);
  bridge.subscribeToCapturedNotifications(jest.fn())?.remove();
  expect(addEventListener).toHaveBeenCalledWith('MemoaNotificationCandidatesChanged', expect.any(Function));
  expect(await bridge.detectionAlertPermissionGranted()).toBe(false);
  expect(await bridge.requestDetectionAlertPermission()).toBe(true);
});

test('이전 IPA와 Expo Go에서는 iPhone 후보와 알림 권한 API를 안전하게 생략한다', async () => {
  const bridge = loadBridge('ios');
  expect(bridge.iosShortcutCaptureAvailable()).toBe(false);
  expect(await bridge.getCapturedNotifications()).toEqual([]);
  await expect(bridge.removeCapturedNotification('missing')).resolves.toBeUndefined();
  expect(await bridge.requestDetectionAlertPermission()).toBe(false);
});

test('Android는 시스템의 실제 알림 차단 상태를 확인한다', async () => {
  const permission = jest.fn().mockResolvedValue(false);
  const bridge = loadBridge('android', {isDetectionAlertPermissionGranted: permission});
  expect(await bridge.detectionAlertPermissionGranted()).toBe(false);
  expect(permission).toHaveBeenCalledTimes(1);
});
