import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { useBiometricLabel } from '@/components/system/BiometricGate';
import { MenuCard } from '@/components/profile/ProfileParts';
import { Button, Icon, ListItem, Screen, ScreenHeader, SegmentedControl, type SegmentOption, Switch, Text } from '@/components/ui';
import { SUPPORTED_LANGUAGES, type Language } from '@/i18n';
import { analytics } from '@/lib/analytics';
import { authenticateWithBiometrics, type BiometricSupport, getBiometricSupport } from '@/lib/biometrics';
import { env } from '@/lib/env';
import { openUrl } from '@/lib/linking';
import { ensurePushPermission } from '@/lib/push';
import { applyDownloadedUpdate, checkForUpdateManually, currentUpdateLabel } from '@/lib/updates';
import { mockDb } from '@/services/api';
import { FLAG_KEYS, resolveFlag, useFeatureFlag, useFlagsStore } from '@/store/flags';
import { type NotificationPreferences, type ThemePreference, usePreferencesStore } from '@/store/preferences';
import { useIsSignedIn, useRole, useSessionStore } from '@/store/session';
import { toast } from '@/store/toast';
import { layout, makeStyles, spacing, useTheme } from '@/theme';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

const PRIVACY_URL = 'https://silkx.uz/privacy';

const PUSH_KEYS: readonly { key: keyof NotificationPreferences; label: 'settings.pushPriceDrops' | 'settings.pushNewMatches' | 'settings.pushViewings' | 'settings.pushMessages' }[] = [
  { key: 'priceDrops', label: 'settings.pushPriceDrops' },
  { key: 'newMatches', label: 'settings.pushNewMatches' },
  { key: 'viewings', label: 'settings.pushViewings' },
  { key: 'messages', label: 'settings.pushMessages' },
];

export default function SettingsScreen() {
  const styles = useStyles();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const client = useQueryClient();
  const signedIn = useIsSignedIn();
  const role = useRole();
  const biometricFlag = useFeatureFlag('biometricLogin');
  const prefs = usePreferencesStore();
  const flags = useFlagsStore();
  const [biometric, setBiometric] = useState<BiometricSupport>({ available: false, kind: 'generic' });
  const [checking, setChecking] = useState(false);
  const biometricLabel = useBiometricLabel(biometric.kind);
  const showDeveloper = env.appEnv !== 'production' || role === 'admin';
  const currentLanguage = (prefs.language ?? i18n.language) as Language;

  useEffect(() => {
    void getBiometricSupport().then(setBiometric);
  }, []);

  const themeOptions: SegmentOption<ThemePreference>[] = [
    { value: 'system', label: t('settings.themeSystem'), icon: 'phone-portrait-outline' },
    { value: 'light', label: t('settings.themeLight'), icon: 'sunny-outline' },
    { value: 'dark', label: t('settings.themeDark'), icon: 'moon-outline' },
  ];

  const changeTheme = (theme: ThemePreference) => {
    prefs.setTheme(theme);
    analytics.track('theme_changed', { theme });
  };

  const changeLanguage = (language: Language) => {
    prefs.setLanguage(language);
    analytics.track('language_changed', { language });
  };

  const togglePush = async (key: keyof NotificationPreferences, value: boolean) => {
    prefs.setNotification(key, value);
    if (!value) return;
    const granted = await ensurePushPermission();
    if (!granted && !env.isWeb) toast.warning(t('settings.pushDenied'));
  };

  const toggleBiometric = async (value: boolean) => {
    if (!value) {
      prefs.setBiometricEnabled(false);
      toast.info(t('settings.biometricDisabled'));
      return;
    }
    const ok = await authenticateWithBiometrics({ promptMessage: t('lock.subtitle'), cancelLabel: t('common.cancel') });
    if (!ok) {
      toast.error(t('lock.failed'));
      return;
    }
    prefs.setBiometricEnabled(true);
    toast.success(t('settings.biometricEnabled'));
  };

  const checkUpdates = async () => {
    setChecking(true);
    const outcome = await checkForUpdateManually();
    setChecking(false);
    if (outcome === 'unavailable') toast.info(t('settings.updatesUnavailable'));
    else if (outcome === 'up-to-date') toast.success(t('settings.upToDate'));
    else if (outcome === 'error') toast.error(t('errors.generic'));
    else {
      toast.info(t('settings.updateDownloading'));
      await applyDownloadedUpdate();
    }
  };

  const resetDemo = async () => {
    await mockDb.reset();
    client.clear();
    if (useSessionStore.getState().status === 'authenticated') await useSessionStore.getState().signOut();
    toast.success(t('settings.resetDone'));
  };

  const updateLabel = currentUpdateLabel();

  return (
    <Screen>
      <ScreenHeader title={t('settings.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.group}>
          <Text variant="overline" color="tertiary">
            {t('settings.appearance')}
          </Text>
          <SegmentedControl options={themeOptions} value={prefs.theme} onChange={changeTheme} />
        </View>

        <MenuCard title={t('settings.language')}>
          {SUPPORTED_LANGUAGES.map((language) => (
            <ListItem
              key={language}
              title={t(`languages.${language}`)}
              onPress={() => changeLanguage(language)}
              chevron={false}
              right={currentLanguage === language ? <Icon name="checkmark-circle" size="md" color={colors.gold} /> : null}
            />
          ))}
        </MenuCard>

        <MenuCard title={t('settings.notifications')}>
          {PUSH_KEYS.map((item) => (
            <ListItem
              key={item.key}
              title={t(item.label)}
              right={<Switch value={prefs.notifications[item.key]} onValueChange={(v) => void togglePush(item.key, v)} accessibilityLabel={t(item.label)} />}
            />
          ))}
        </MenuCard>

        {signedIn && biometricFlag ? (
          <MenuCard title={t('settings.security')}>
            <ListItem
              icon={biometric.kind === 'faceId' || biometric.kind === 'face' ? 'scan-outline' : 'finger-print-outline'}
              title={t('settings.biometric', { type: biometricLabel })}
              subtitle={biometric.available ? t('settings.biometricHint') : t('settings.biometricUnavailable')}
              right={
                <Switch
                  value={prefs.biometricEnabled}
                  disabled={!biometric.available}
                  onValueChange={(v) => void toggleBiometric(v)}
                  accessibilityLabel={t('settings.biometric', { type: biometricLabel })}
                />
              }
            />
          </MenuCard>
        ) : null}

        <MenuCard title={t('settings.about')}>
          <ListItem
            icon="information-circle-outline"
            title="SILKX"
            value={t('common.version', { version: `${env.appVersion} (${env.buildNumber})${updateLabel ? ` · ${updateLabel}` : ''}` })}
          />
          <ListItem icon="cloud-download-outline" title={t('settings.checkUpdates')} onPress={() => void checkUpdates()} right={checking ? <Text variant="caption">{t('common.loading')}</Text> : undefined} />
          <ListItem icon="document-lock-outline" title={t('settings.privacy')} onPress={() => void openUrl(PRIVACY_URL)} />
        </MenuCard>

        {showDeveloper ? (
          <MenuCard title={t('settings.developer')}>
            <ListItem
              icon="bug-outline"
              title={t('settings.simulateErrors')}
              subtitle={t('settings.simulateErrorsHint')}
              right={<Switch value={prefs.simulateErrors} onValueChange={prefs.setSimulateErrors} accessibilityLabel={t('settings.simulateErrors')} />}
            />
            {FLAG_KEYS.map((key) => (
              <ListItem
                key={key}
                icon="flag-outline"
                title={t(`flags.${key}`)}
                subtitle={flags.overrides[key] !== undefined ? t('settings.featureFlags') : undefined}
                right={<Switch value={resolveFlag(flags, key)} onValueChange={(v) => flags.setOverride(key, v)} accessibilityLabel={t(`flags.${key}`)} />}
              />
            ))}
            <View style={styles.devActions}>
              <Button title={t('common.reset')} variant="ghost" size="sm" onPress={flags.clearOverrides} />
              <Button title={t('settings.resetData')} variant="danger" size="sm" leftIcon="refresh" onPress={() => void resetDemo()} />
            </View>
          </MenuCard>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles(() => ({
  content: {
    padding: layout.screenPadding,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  group: {
    gap: spacing.sm,
  },
  devActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
}));
