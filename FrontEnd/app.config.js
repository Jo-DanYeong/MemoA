module.exports = {
  expo: {
    name: 'MemoA',
    slug: 'memoa',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    scheme: 'memoa',
    platforms: ['android', 'ios'],
    extra: {
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || '',
    },
    android: {
      package: 'com.frontend',
    },
    ios: {
      bundleIdentifier: 'org.reactjs.native.example.FrontEnd',
      supportsTablet: true,
    },
  },
};
