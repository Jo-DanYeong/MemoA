const {URL} = require('node:url');

const iosSideload = process.env.MEMOA_IOS_SIDELOAD === '1';
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || '';

if (iosSideload) {
  let apiUrl;
  try {
    apiUrl = new URL(apiBaseUrl);
  } catch {
    throw new Error('iPhone 테스트용 EXPO_PUBLIC_API_BASE_URL에 PC의 접속 가능한 서버 주소를 입력해 주세요.');
  }
  if (!['http:', 'https:'].includes(apiUrl.protocol)
    || ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(apiUrl.hostname)
    || apiUrl.hostname.endsWith('.localhost')
    || apiUrl.username || apiUrl.password) {
    throw new Error('iPhone 테스트 서버에는 인증정보 없는 HTTP(S) 주소를 사용하세요. localhost는 사용할 수 없습니다.');
  }
}

module.exports = {
  expo: {
    name: 'MemoA',
    slug: 'memoa',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    scheme: 'memoa',
    platforms: ['android', 'ios'],
    plugins: ['expo-calendar', './plugins/with-memoa-shortcuts'],
    extra: {
      apiBaseUrl,
    },
    android: {
      package: 'com.frontend',
      permissions: [
        'android.permission.READ_CALENDAR',
        'android.permission.WRITE_CALENDAR',
      ],
    },
    ios: {
      bundleIdentifier: iosSideload ? 'app.memoa.sideload' : 'org.reactjs.native.example.FrontEnd',
      supportsTablet: true,
      ...(iosSideload ? {
        infoPlist: {
          NSLocalNetworkUsageDescription: '같은 Wi-Fi의 MemoA 개발 서버에 연결해 로그인과 일정 분석을 테스트합니다.',
        },
      } : {}),
    },
  },
};
