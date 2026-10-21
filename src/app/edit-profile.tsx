import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { z } from 'zod';

import { Avatar, Button, FormBanner, PhoneField, Screen, ScreenHeader, StickyBar, TextField } from '@/components/ui';
import { nameSchema, phoneSchema } from '@/features/auth/schemas';
import { useFormErrorText } from '@/features/forms';
import { useUpdateProfile } from '@/hooks/api/business';
import { errorMessageKey } from '@/lib/errors';
import { monitoring } from '@/lib/monitoring';
import { normalizeUzPhone, toE164 } from '@/lib/phone';
import { useSessionStore } from '@/store/session';
import { toast } from '@/store/toast';
import { layout, makeStyles, spacing } from '@/theme';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

const COMPANY_MAX = 80;
const AVATAR_QUALITY = 0.7;
const AVATAR_ASPECT: [number, number] = [1, 1];

const profileSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  company: z.string().trim().max(COMPANY_MAX),
});

type ProfileValues = z.infer<typeof profileSchema>;

export default function EditProfileScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const errorText = useFormErrorText();
  const user = useSessionStore((s) => s.user);
  const update = useUpdateProfile();
  const [avatar, setAvatar] = useState<string | null>(user?.avatar ?? null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? '',
      phone: normalizeUzPhone(user?.phone ?? ''),
      company: user?.company ?? '',
    },
    mode: 'onTouched',
  });

  if (!user) return null;

  const pickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: AVATAR_ASPECT,
        quality: AVATAR_QUALITY,
      });
      if (!result.canceled && result.assets[0]) setAvatar(result.assets[0].uri);
    } catch (error) {
      monitoring.captureException(error, { scope: 'profile.avatar' });
      toast.error(t('wizard.permissionDenied'));
    }
  };

  const onSubmit = handleSubmit((values) => {
    update.mutate(
      {
        name: values.name,
        phone: toE164(values.phone),
        company: user.role === 'buyer' ? null : values.company || null,
        avatar,
      },
      {
        onSuccess: () => {
          toast.success(t('editProfile.saved'));
          if (router.canGoBack()) router.back();
        },
        onError: (error) => {
          const key = errorMessageKey(error);
          if (key === 'auth.errors.phoneTaken') setError('phone', { message: key });
          else setError('root', { message: key });
        },
      },
    );
  });

  const changed = isDirty || avatar !== (user.avatar ?? null);

  return (
    <Screen>
      <ScreenHeader title={t('editProfile.title')} />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        bottomOffset={layout.stickyBarHeight}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarBlock}>
          <Avatar name={user.name} uri={avatar} size="xl" />
          <Button title={t('editProfile.changePhoto')} variant="ghost" size="sm" leftIcon="camera-outline" onPress={() => void pickAvatar()} />
        </View>
        <FormBanner message={errorText(errors.root?.message)} />
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <TextField
              label={t('auth.name')}
              leftIcon="person-outline"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errorText(errors.name?.message)}
            />
          )}
        />
        <TextField label={t('auth.email')} leftIcon="mail-outline" value={user.email} editable={false} />
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <PhoneField label={t('auth.phone')} value={field.value} onChangeDigits={field.onChange} onBlur={field.onBlur} error={errorText(errors.phone?.message)} />
          )}
        />
        {user.role !== 'buyer' ? (
          <Controller
            control={control}
            name="company"
            render={({ field }) => (
              <TextField
                label={t('auth.company')}
                placeholder={t('auth.companyPlaceholder')}
                leftIcon="briefcase-outline"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errorText(errors.company?.message)}
              />
            )}
          />
        ) : null}
      </KeyboardAwareScrollView>
      <StickyBar>
        <View style={styles.flex}>
          <Button title={t('common.save')} fullWidth disabled={!changed} loading={update.isPending} onPress={() => void onSubmit()} />
        </View>
      </StickyBar>
    </Screen>
  );
}

const useStyles = makeStyles(() => ({
  flex: {
    flex: 1,
  },
  content: {
    padding: layout.screenPadding,
    paddingBottom: layout.stickyBarHeight + spacing.giant,
    gap: spacing.lg,
  },
  avatarBlock: {
    alignItems: 'center',
    gap: spacing.sm,
  },
}));
