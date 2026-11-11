import * as Application from 'expo-application';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

export type AppEnv = 'development' | 'preview' | 'production';

interface ExtraConfig {
  appEnv?: AppEnv;
  apiUrl?: string;
  sentryDsn?: string;
  analyticsKey?: string;
  supportPhone?: string;
  supportTelegram?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

export const env = {
  appEnv: extra.appEnv ?? 'development',
  apiUrl: extra.apiUrl ?? 'https://api.silkx.uz',
  sentryDsn: extra.sentryDsn ?? '',
  analyticsKey: extra.analyticsKey ?? '',
  supportPhone: extra.supportPhone ?? '+998970345665',
  supportTelegram: extra.supportTelegram ?? 'https://t.me/SILKX07',
  appVersion: Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '1.0.0',
  buildNumber: Application.nativeBuildVersion ?? '1',
  isExpoGo: Constants.executionEnvironment === ExecutionEnvironment.StoreClient,
  isWeb: Platform.OS === 'web',
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
} as const;
