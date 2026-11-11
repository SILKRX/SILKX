import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Единая конфигурация приложения для всех сред.
 * Среда задаётся переменной APP_ENV (её выставляет eas.json для каждого профиля сборки).
 *
 *  development — внутренние dev-сборки (expo-dev-client), отдельный bundle id: можно ставить рядом с prod
 *  preview     — сборки для внутреннего тестирования (TestFlight / APK)
 *  production  — сторы
 */
type AppEnv = 'development' | 'preview' | 'production';

const APP_ENV: AppEnv = (() => {
  const raw = process.env.APP_ENV;
  return raw === 'preview' || raw === 'production' ? raw : 'development';
})();

const ENV_SUFFIX: Record<AppEnv, { id: string; name: string }> = {
  development: { id: '.dev', name: ' Dev' },
  preview: { id: '.preview', name: ' Preview' },
  production: { id: '', name: '' },
};

const BRAND_BACKGROUND = '#0B0C0F';
const BRAND_GOLD = '#BCA37F';

/** EAS project id (@silkx/silkx). Можно переопределить через EAS_PROJECT_ID. */
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID ?? 'b76db4d2-5715-424a-b666-eb0bed8aa4eb';

const googleMapsKeys = {
  androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_KEY,
  iosGoogleMapsApiKey: process.env.GOOGLE_MAPS_IOS_KEY,
};
const hasMapsKeys = Boolean(googleMapsKeys.androidGoogleMapsApiKey || googleMapsKeys.iosGoogleMapsApiKey);

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: `SILKX${ENV_SUFFIX[APP_ENV].name}`,
  slug: 'silkx',
  scheme: 'silkx',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  backgroundColor: BRAND_BACKGROUND,
  primaryColor: BRAND_GOLD,
  ios: {
    bundleIdentifier: `uz.silkx.app${ENV_SUFFIX[APP_ENV].id}`,
    supportsTablet: false,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: `uz.silkx.app${ENV_SUFFIX[APP_ENV].id}`,
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      monochromeImage: './assets/images/adaptive-icon-monochrome.png',
      backgroundColor: BRAND_BACKGROUND,
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: BRAND_BACKGROUND,
        image: './assets/images/splash-logo.png',
        imageWidth: 220,
      },
    ],
    'expo-secure-store',
    'expo-localization',
    [
      'expo-local-authentication',
      { faceIDPermission: 'SILKX использует Face ID для быстрого и безопасного входа в аккаунт.' },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'SILKX нужен доступ к фото, чтобы вы могли добавить снимки объекта в объявление или чат.',
        cameraPermission: 'SILKX нужен доступ к камере, чтобы сфотографировать объект для объявления.',
        microphonePermission: false,
      },
    ],
    ['expo-notifications', { color: BRAND_GOLD }],
    ...(hasMapsKeys ? [['react-native-maps', googleMapsKeys] as [string, typeof googleMapsKeys]] : []),
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  runtimeVersion: { policy: 'appVersion' },
  updates: EAS_PROJECT_ID
    ? {
        url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
        checkAutomatically: 'ON_LOAD',
        fallbackToCacheTimeout: 0,
      }
    : { enabled: false },
  extra: {
    appEnv: APP_ENV,
    apiUrl: process.env.API_URL ?? 'https://api.silkx.uz',
    sentryDsn: process.env.SENTRY_DSN ?? '',
    analyticsKey: process.env.ANALYTICS_KEY ?? '',
    supportPhone: '+998970345665',
    supportTelegram: 'https://t.me/SILKX07',
    eas: { projectId: EAS_PROJECT_ID },
  },
});
