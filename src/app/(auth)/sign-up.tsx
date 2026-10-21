import { zodResolver } from '@hookform/resolvers/zod';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { type TextInputInstance, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Checkbox, ChoiceCard, FormBanner, IconButton, PhoneField, Text, TextField } from '@/components/ui';
import { PasswordStrengthMeter } from '@/features/auth/PasswordStrengthMeter';
import { type SignUpValues, signUpSchema } from '@/features/auth/schemas';
import { useFormErrorText } from '@/features/forms';
import { isSafeRedirect } from '@/hooks/useRequireAuth';
import { analytics } from '@/lib/analytics';
import { errorMessageKey } from '@/lib/errors';
import { toE164 } from '@/lib/phone';
import { useSessionStore } from '@/store/session';
import { toast } from '@/store/toast';
import { layout, makeStyles, spacing } from '@/theme';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

export default function SignUpScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const errorText = useFormErrorText();
  const params = useLocalSearchParams<{ redirect?: string }>();
  const signUp = useSessionStore((s) => s.signUp);
  const emailRef = useRef<TextInputInstance>(null);
  const phoneRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);

  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', phone: '', password: '', company: '', terms: false },
    mode: 'onTouched',
  });
  const role = useWatch({ control, name: 'role' });
  const password = useWatch({ control, name: 'password' });

  useEffect(() => {
    analytics.track('sign_up_started', { source: isSafeRedirect(params.redirect) ? params.redirect : 'direct' });
  }, [params.redirect]);

  const onSubmit = handleSubmit(async (values) => {
    clearErrors('root');
    try {
      const user = await signUp({
        name: values.name,
        email: values.email,
        phone: toE164(values.phone),
        password: values.password,
        role: values.role,
        company: values.role === 'seller' && values.company ? values.company : null,
      });
      toast.success(t('auth.welcome', { name: user.name.split(' ')[0] ?? user.name }));
      if (isSafeRedirect(params.redirect)) router.replace(params.redirect as Href);
      else if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (error) {
      const key = errorMessageKey(error);
      if (key === 'auth.errors.emailTaken') setError('email', { message: key });
      else if (key === 'auth.errors.phoneTaken') setError('phone', { message: key });
      else setError('root', { message: key });
    }
  });

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <IconButton
          icon="chevron-back"
          variant="ghost"
          onPress={() => router.replace({ pathname: '/sign-in', params: params.redirect ? { redirect: params.redirect } : {} })}
          accessibilityLabel={t('common.back')}
        />
      </View>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        bottomOffset={spacing.xxl}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titles}>
          <Text variant="h1">{t('auth.signUpTitle')}</Text>
          <Text color="secondary">{t('auth.signUpSubtitle')}</Text>
        </View>

        <FormBanner message={errorText(errors.root?.message)} />

        <View style={styles.group}>
          <Text variant="title">{t('auth.roleTitle')}</Text>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <View style={styles.roles} accessibilityRole="radiogroup">
                <ChoiceCard
                  title={t('auth.buyerTitle')}
                  description={t('auth.buyerDesc')}
                  icon="key-outline"
                  selected={field.value === 'buyer'}
                  onPress={() => field.onChange('buyer')}
                />
                <ChoiceCard
                  title={t('auth.sellerTitle')}
                  description={t('auth.sellerDesc')}
                  icon="business-outline"
                  selected={field.value === 'seller'}
                  onPress={() => field.onChange('seller')}
                />
              </View>
            )}
          />
          {errors.role ? (
            <Text variant="caption" color="danger">
              {errorText(errors.role.message)}
            </Text>
          ) : null}
        </View>

        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <TextField
              label={t('auth.name')}
              placeholder={t('auth.namePlaceholder')}
              leftIcon="person-outline"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              onSubmitEditing={() => emailRef.current?.focus()}
              error={errorText(errors.name?.message)}
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <TextField
              ref={emailRef}
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
              onSubmitEditing={() => phoneRef.current?.focus()}
              error={errorText(errors.email?.message)}
            />
          )}
        />
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <PhoneField
              ref={phoneRef}
              label={t('auth.phone')}
              value={field.value}
              onChangeDigits={field.onChange}
              onBlur={field.onBlur}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              error={errorText(errors.phone?.message)}
            />
          )}
        />
        <View>
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
                autoComplete="new-password"
                textContentType="newPassword"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errorText(errors.password?.message)}
              />
            )}
          />
          <PasswordStrengthMeter password={password} />
        </View>
        {role === 'seller' ? (
          <Controller
            control={control}
            name="company"
            render={({ field }) => (
              <TextField
                label={`${t('auth.company')} (${t('common.optional')})`}
                placeholder={t('auth.companyPlaceholder')}
                leftIcon="briefcase-outline"
                autoComplete="organization"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errorText(errors.company?.message)}
              />
            )}
          />
        ) : null}
        <Controller
          control={control}
          name="terms"
          render={({ field }) => <Checkbox checked={field.value} onChange={field.onChange} label={t('auth.terms')} error={errorText(errors.terms?.message)} />}
        />

        <Button title={t('auth.signUp')} onPress={() => void onSubmit()} loading={isSubmitting} fullWidth size="lg" />

        <View style={styles.switchRow}>
          <Text color="secondary">{t('auth.haveAccount')}</Text>
          <Button
            title={t('auth.signIn')}
            variant="ghost"
            size="sm"
            onPress={() => router.replace({ pathname: '/sign-in', params: params.redirect ? { redirect: params.redirect } : {} })}
          />
        </View>
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
  group: {
    gap: spacing.md,
  },
  roles: {
    gap: spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
}));
