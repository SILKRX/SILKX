import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Logo, Text } from '@/components/ui';
import { useAppStateChange } from '@/hooks/common';
import { analytics } from '@/lib/analytics';
import { authenticateWithBiometrics, type BiometricKind, getBiometricSupport } from '@/lib/biometrics';
import { haptics } from '@/lib/haptics';
import { useFeatureFlag } from '@/store/flags';
import { usePreferencesStore } from '@/store/preferences';
import { useSessionStore } from '@/store/session';
import { gradients, makeStyles, motion, opacity, sizes, spacing, zIndex } from '@/theme';

const RELOCK_AFTER_MS = 60_000;

export function useBiometricLabel(kind: BiometricKind): string {
  const { t } = useTranslation();
  switch (kind) {
    case 'faceId':
      return t('biometrics.faceId');
    case 'touchId':
      return t('biometrics.touchId');
    case 'fingerprint':
      return t('biometrics.fingerprint');
    case 'face':
      return t('biometrics.face');
    case 'iris':
      return t('biometrics.iris');
    case 'generic':
      return t('biometrics.generic');
  }
}

/**
 * Биометрический замок (Face ID / Touch ID / отпечаток) поверх приложения:
 * при запуске и после 60 секунд в фоне, если вход по биометрии включён.
 */
export function BiometricGate() {
  const styles = useStyles();
  const { t } = useTranslation();
  const locked = useSessionStore((s) => s.locked);
  const status = useSessionStore((s) => s.status);
  const enabled = usePreferencesStore((s) => s.biometricEnabled);
  const flagOn = useFeatureFlag('biometricLogin');
  const [kind, setKind] = useState<BiometricKind>('generic');
  const [failed, setFailed] = useState(false);
  const backgroundedAt = useRef<number | null>(null);
  const label = useBiometricLabel(kind);
  const active = locked && status === 'authenticated' && enabled && flagOn;

  const unlock = useCallback(async () => {
    setFailed(false);
    const ok = await authenticateWithBiometrics({ promptMessage: t('lock.subtitle'), cancelLabel: t('common.cancel') });
    if (ok) {
      haptics.success();
      useSessionStore.getState().setLocked(false);
      analytics.track('sign_in_completed', { method: 'biometric' });
    } else {
      haptics.error();
      setFailed(true);
    }
  }, [t]);

  useEffect(() => {
    void getBiometricSupport().then((support) => {
      setKind(support.kind);
      // биометрию отключили в системе — не блокируем пользователя навсегда
      if (!support.available) useSessionStore.getState().setLocked(false);
    });
  }, []);

  useEffect(() => {
    if (active) void unlock();
  }, [active, unlock]);

  useAppStateChange((next, previous) => {
    if (next === 'background') backgroundedAt.current = Date.now();
    if (next === 'active' && previous !== 'active' && backgroundedAt.current !== null) {
      const away = Date.now() - backgroundedAt.current;
      backgroundedAt.current = null;
      if (away > RELOCK_AFTER_MS && enabled && flagOn && useSessionStore.getState().status === 'authenticated') {
        useSessionStore.getState().setLocked(true);
      }
    }
  });

  if (!active) return null;

  return (
    <Animated.View entering={FadeIn.duration(motion.instant)} exiting={FadeOut.duration(motion.base)} style={styles.overlay}>
      <LinearGradient colors={gradients.ink} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.content}>
        <View style={styles.center}>
          <Logo height={sizes.logo.lg} onDark />
          <Text variant="h2" color="white" align="center">
            {t('lock.title')}
          </Text>
          <Text color="white" align="center" style={styles.subtitle}>
            {failed ? t('lock.failed') : t('lock.subtitle')}
          </Text>
        </View>
        <View style={styles.actions}>
          <Button title={t('lock.unlock', { type: label })} leftIcon={kind === 'faceId' || kind === 'face' ? 'scan' : 'finger-print'} onPress={() => void unlock()} fullWidth />
          <Button
            title={t('lock.usePassword')}
            variant="onDark"
            onPress={() => {
              void useSessionStore.getState().signOut();
            }}
            fullWidth
          />
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const useStyles = makeStyles(() => ({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: zIndex.max,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.xxl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  actions: {
    gap: spacing.sm,
  },
  subtitle: {
    opacity: opacity.pressed,
  },
}));
