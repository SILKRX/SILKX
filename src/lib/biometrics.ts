import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

import { monitoring } from './monitoring';

export type BiometricKind = 'faceId' | 'touchId' | 'fingerprint' | 'face' | 'iris' | 'generic';

export interface BiometricSupport {
  available: boolean;
  kind: BiometricKind;
}

const UNAVAILABLE: BiometricSupport = { available: false, kind: 'generic' };

export async function getBiometricSupport(): Promise<BiometricSupport> {
  if (Platform.OS === 'web') return UNAVAILABLE;
  try {
    const [hasHardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    if (!hasHardware || !enrolled) return { available: false, kind: kindFromTypes(types) };
    return { available: true, kind: kindFromTypes(types) };
  } catch (error) {
    monitoring.captureException(error, { scope: 'biometrics.support' });
    return UNAVAILABLE;
  }
}

function kindFromTypes(types: LocalAuthentication.AuthenticationType[]): BiometricKind {
  const isIOS = Platform.OS === 'ios';
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return isIOS ? 'faceId' : 'face';
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return isIOS ? 'touchId' : 'fingerprint';
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return 'iris';
  return 'generic';
}

export async function authenticateWithBiometrics(options: {
  promptMessage: string;
  cancelLabel: string;
  fallbackLabel?: string;
}): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: options.promptMessage,
      cancelLabel: options.cancelLabel,
      fallbackLabel: options.fallbackLabel,
      disableDeviceFallback: false,
    });
    return result.success;
  } catch (error) {
    // В Expo Go на iOS Face ID недоступен — система отдаст ошибку, падаем мягко
    monitoring.captureException(error, { scope: 'biometrics.authenticate' });
    return false;
  }
}
