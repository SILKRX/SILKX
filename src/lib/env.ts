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
  socialInstagram?: string;
  socialLinkedIn?: string;
  socialFacebook?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

export const env = {
  appEnv: extra.appEnv ?? 'development',
  apiUrl: extra.apiUrl ?? 'https://api.silkx.uz',
  sentryDsn: extra.sentryDsn ?? '',
  analyticsKey: extra.analyticsKey ?? '',
  supportPhone: extra.supportPhone ?? '+998970345665',
  supportTelegram: extra.supportTelegram ?? 'https://t.me/SILKX07',
  socialInstagram: extra.socialInstagram ?? 'https://www.instagram.com/silkx_official',
  socialLinkedIn: extra.socialLinkedIn ?? 'https://www.linkedin.com/company/silkxofficial',
  socialFacebook: extra.socialFacebook ?? 'https://www.facebook.com/profile.php?id=61595846581408',
  appVersion: Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '1.0.0',
  buildNumber: Application.nativeBuildVersion ?? '1',
  isExpoGo: Constants.executionEnvironment === ExecutionEnvironment.StoreClient,
  isWeb: Platform.OS === 'web',
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
} as const;
