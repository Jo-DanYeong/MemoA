function apiBaseUrl(os: string, extra: object = {}) {
  jest.resetModules();
  jest.doMock('react-native', () => ({Platform: {OS: os, select: (values: Record<string, string>) => values[os] ?? values.default}}));
  jest.doMock('expo-constants', () => ({__esModule: true, default: {expoConfig: {extra}}}));
  return require('../src/services/api').API_BASE_URL;
}

test('Android는 iPhone 전용 서버 주소와 독립적으로 기존 USB 주소를 사용한다', () => {
  expect(apiBaseUrl('android', {
    apiBaseUrl: 'http://127.0.0.1:8080/api/v1',
    iosApiBaseUrl: 'http://100.72.90.63:8080/api/v1',
  })).toBe('http://127.0.0.1:8080/api/v1');
});

test('iPhone은 Android USB 주소 대신 iPhone에 지정한 서버를 사용한다', () => {
  expect(apiBaseUrl('ios', {
    apiBaseUrl: 'http://127.0.0.1:8080/api/v1',
    iosApiBaseUrl: 'http://100.72.90.63:8080/api/v1/',
  })).toBe('http://100.72.90.63:8080/api/v1');
});

test('별도 설정이 없을 때도 각 OS의 기본 주소를 유지한다', () => {
  expect(apiBaseUrl('android')).toBe('http://10.0.2.2:8080/api/v1');
  expect(apiBaseUrl('ios')).toBe('http://100.72.90.63:8080/api/v1');
});
