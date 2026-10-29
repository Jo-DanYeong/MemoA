const removeSubscription = jest.fn();
const addEventListener = jest.fn().mockReturnValue({remove: removeSubscription});
const createEmitter = jest.fn().mockImplementation(() => ({addListener: addEventListener}));

function loadBridge(platform: string, module?: object) {
  jest.doMock('react-native', () => ({
    Platform: {OS: platform},
    NativeModules: {MemoaNotificationCapture: module},
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
