const originalSideload = process.env.MEMOA_IOS_SIDELOAD;
const originalApi = process.env.EXPO_PUBLIC_API_BASE_URL;
const originalIosApi = process.env.EXPO_PUBLIC_IOS_API_BASE_URL;

function loadConfig(sideload: boolean, apiBaseUrl: string) {
  jest.resetModules();
  process.env.MEMOA_IOS_SIDELOAD = sideload ? '1' : '0';
  process.env.EXPO_PUBLIC_API_BASE_URL = apiBaseUrl;
  delete process.env.EXPO_PUBLIC_IOS_API_BASE_URL;
  return require('../app.config.js').expo;
}

afterEach(() => {
  if (originalSideload === undefined) {
    delete process.env.MEMOA_IOS_SIDELOAD;
  } else {
    process.env.MEMOA_IOS_SIDELOAD = originalSideload;
  }
  if (originalApi === undefined) {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
  } else {
    process.env.EXPO_PUBLIC_API_BASE_URL = originalApi;
  }
  if (originalIosApi === undefined) {
    delete process.env.EXPO_PUBLIC_IOS_API_BASE_URL;
  } else {
    process.env.EXPO_PUBLIC_IOS_API_BASE_URL = originalIosApi;
  }
  jest.resetModules();
});

test('일반 빌드는 Android 설정과 기존 iOS 식별자를 유지한다', () => {
  const config = loadConfig(false, 'http://127.0.0.1:8080/api/v1');
  expect(config.android.package).toBe('com.frontend');
  expect(config.ios.bundleIdentifier).toBe('org.reactjs.native.example.FrontEnd');
  expect(config.ios.infoPlist).toBeUndefined();
  expect(config.extra.apiBaseUrl).toBe('http://127.0.0.1:8080/api/v1');
  expect(config.extra.iosApiBaseUrl).toBe('http://100.72.90.63:8080/api/v1');
});

test('개인 iPhone 테스트는 별도 식별자와 LAN 안내를 사용한다', () => {
  const config = loadConfig(true, 'http://192.168.1.10:8080/api/v1');
  expect(config.android.package).toBe('com.frontend');
  expect(config.ios.bundleIdentifier).toBe('app.memoa.sideload');
  expect(config.extra.apiBaseUrl).toBe('http://192.168.1.10:8080/api/v1');
  expect(config.ios.infoPlist.NSLocalNetworkUsageDescription).toContain('Wi-Fi');
});

test.each(['', 'http://127.0.0.1:8080/api/v1', 'http://localhost:8080/api/v1',
  'ftp://192.168.1.10/api/v1', 'http://user:password@example.com/api/v1'])
('iPhone에서 사용할 수 없거나 인증정보가 포함된 주소를 거절한다: %s', address => {
  expect(() => loadConfig(true, address)).toThrow();
});
