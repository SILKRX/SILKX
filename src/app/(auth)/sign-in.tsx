import { zodResolver } from '@hookform/resolvers/zod';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { type TextInputInstance, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Chip, FormBanner, IconButton, Logo, Text, TextField } from '@/components/ui';
import { type SignInValues, signInSchema } from '@/features/auth/schemas';
import { useFormErrorText } from '@/features/forms';
import { isSafeRedirect } from '@/hooks/useRequireAuth';
import { errorMessageKey } from '@/lib/errors';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/services/api';
import { useSessionStore } from '@/store/session';
import { toast } from '@/store/toast';
import { layout, makeStyles, radii, sizes, spacing } from '@/theme';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

export default function SignInScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const errorText = useFormErrorText();
  const params = useLocalSearchParams<{ redirect?: string }>();
  const signIn = useSessionStore((s) => s.signIn);
  const passwordRef = useRef<TextInputInstance>(null);

  const {
    control,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  const finish = () => {
    if (isSafeRedirect(params.redirect)) {
      router.replace(params.redirect as Href);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const onSubmit = handleSubmit(async (values) => {
    clearErrors('root');
    try {
      const user = await signIn(values);
      toast.success(t('auth.welcome', { name: user.name.split(' ')[0] ?? user.name }));
      finish();
    } catch (error) {
      const key = errorMessageKey(error);
      if (key === 'auth.errors.invalidCredentials') setError('password', { message: key });
      else setError('root', { message: key });
    }
  });

  const fillDemo = (email: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', DEMO_PASSWORD, { shouldValidate: true });
    clearErrors('root');
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <IconButton icon="close" variant="ghost" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityLabel={t('common.close')} />
      </View>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        bottomOffset={spacing.xxl}
        showsVerticalScrollIndicator={false}
      >
        <Logo height={sizes.logo.lg} />
        <View style={styles.titles}>
          <Text variant="h1">{t('auth.signInTitle')}</Text>
          <Text color="secondary">{t('auth.signInSubtitle')}</Text>
        </View>

        <FormBanner message={errorText(errors.root?.message)} />

        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <TextField
              label={t('auth.email')}
              placeholder={t('auth.emailPlaceholder')}
              leftIcon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              onSubmitEditing={() => passwordRef.current?.focus()}
              error={errorText(errors.email?.message)}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <TextField
              ref={passwordRef}
              label={t('auth.password')}
              placeholder={t('auth.passwordPlaceholder')}
              leftIcon="lock-closed-outline"
              secureToggle
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              onSubmitEditing={() => void onSubmit()}
              error={errorText(errors.password?.message)}
            />
          )}
        />
        <Button title={t('auth.forgot')} variant="ghost" size="sm" onPress={() => toast.info(t('auth.forgotToast'))} style={styles.forgot} />

        <Button title={t('auth.signIn')} onPress={() => void onSubmit()} loading={isSubmitting} fullWidth size="lg" />

        <View style={styles.demo}>
          <Text variant="overline" color="gold">
            {t('auth.demoTitle')}
          </Text>
          <View style={styles.demoChips}>
            {DEMO_ACCOUNTS.map((account) => (
              <Chip key={account.email} label={t(`roles.${account.role}`)} icon="person-circle-outline" onPress={() => fillDemo(account.email)} />
            ))}
          </View>
          <Text variant="caption" color="tertiary">
            {t('auth.demoHint')}
          </Text>
        </View>

        <View style={styles.switchRow}>
          <Text color="secondary">{t('auth.noAccount')}</Text>
          <Button
            title={t('auth.signUp')}
            variant="ghost"
            size="sm"
            onPress={() => router.replace({ pathname: '/sign-up', params: params.redirect ? { redirect: params.redirect } : {} })}
          />
        </View>
        <Button title={t('auth.continueAsGuest')} variant="ghost" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} fullWidth />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
  },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  titles: {
    gap: spacing.sm,
  },
  forgot: {
    alignSelf: 'flex-end',
    marginTop: -spacing.sm,
  },
  demo: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: sizes.border,
    borderColor: t.colors.goldBorder,
    backgroundColor: t.colors.goldSoft,
  },
  demoChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
}));
