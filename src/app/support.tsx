import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { Button, ChipGroup, FormBanner, Icon, type IconName, PressableScale, Screen, ScreenHeader, Text, TextField } from '@/components/ui';
import { useFormErrorText } from '@/features/forms';
import { FEEDBACK_TOPICS, type FeedbackValues, feedbackSchema } from '@/features/support/schemas';
import { useSendFeedback } from '@/hooks/api/business';
import { useSupportChat } from '@/hooks/api/engagement';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { analytics } from '@/lib/analytics';
import { env } from '@/lib/env';
import { errorMessageKey } from '@/lib/errors';
import { callPhone, openUrl } from '@/lib/linking';
import { formatUzPhone } from '@/lib/phone';
import { useSessionStore } from '@/store/session';
import { toast } from '@/store/toast';
import { layout, makeStyles, motion, radii, sizes, spacing, useTheme } from '@/theme';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

const FAQ = [
  { q: 'faq.q1', a: 'faq.a1' },
  { q: 'faq.q2', a: 'faq.a2' },
  { q: 'faq.q3', a: 'faq.a3' },
  { q: 'faq.q4', a: 'faq.a4' },
  { q: 'faq.q5', a: 'faq.a5' },
  { q: 'faq.q6', a: 'faq.a6' },
] as const;

function ContactTile({ icon, label, onPress, loading }: { icon: IconName; label: string; onPress: () => void; loading?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <PressableScale onPress={onPress} haptic="light" style={styles.contact} accessibilityRole="button" accessibilityLabel={label} disabled={loading}>
      <View style={styles.contactIcon}>
        <Icon name={icon} size="lg" color={colors.gold} />
      </View>
      <Text variant="buttonSm" numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <Animated.View layout={LinearTransition.duration(motion.base)} style={styles.faq}>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.faqHeader} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Text variant="bodyStrong" style={styles.flex}>
          {question}
        </Text>
        <Icon name={open ? 'remove' : 'add'} size="md" color={colors.gold} />
      </Pressable>
      {open ? (
        <Animated.View entering={FadeIn.duration(motion.base)}>
          <Text color="secondary">{answer}</Text>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

export default function SupportScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const errorText = useFormErrorText();
  const requireAuth = useRequireAuth();
  const supportChat = useSupportChat();
  const feedback = useSendFeedback();
  const userEmail = useSessionStore((s) => s.user?.email ?? '');

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FeedbackValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { message: '', email: userEmail },
    mode: 'onTouched',
  });

  const openChat = () =>
    requireAuth(() => {
      supportChat.mutate(undefined, {
        onSuccess: (conversation) => router.push({ pathname: '/chats/[id]', params: { id: conversation.id } }),
        onError: (error) => toast.error(t(errorMessageKey(error))),
      });
    }, '/support');

  const call = async () => {
    const ok = await callPhone(env.supportPhone);
    if (!ok) toast.info(t('property.callUnavailable'), formatUzPhone(env.supportPhone));
  };

  const onSubmit = handleSubmit((values) => {
    feedback.mutate(
      { topic: values.topic, message: values.message, email: values.email || null },
      {
        onSuccess: () => {
          analytics.track('feedback_sent', { topic: values.topic });
          toast.success(t('support.sent'));
          reset({ message: '', email: values.email });
        },
        onError: (error) => setError('root', { message: errorMessageKey(error) }),
      },
    );
  });

  return (
    <Screen>
      <ScreenHeader title={t('support.title')} />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        bottomOffset={spacing.xxl}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="h3">{t('support.contactTitle')}</Text>
        <View style={styles.contacts}>
          <ContactTile icon="call-outline" label={t('support.callUs')} onPress={() => void call()} />
          <ContactTile icon="paper-plane-outline" label={t('support.telegram')} onPress={() => void openUrl(env.supportTelegram)} />
          <ContactTile icon="chatbubbles-outline" label={t('support.chatSupport')} onPress={openChat} loading={supportChat.isPending} />
        </View>

        <Text variant="h3">{t('support.socialTitle')}</Text>
        <View style={styles.contacts}>
          <ContactTile icon="logo-instagram" label={t('support.instagram')} onPress={() => void openUrl(env.socialInstagram)} />
          <ContactTile icon="logo-linkedin" label={t('support.linkedin')} onPress={() => void openUrl(env.socialLinkedIn)} />
          <ContactTile icon="logo-facebook" label={t('support.facebook')} onPress={() => void openUrl(env.socialFacebook)} />
        </View>

        <Text variant="h3">{t('support.faqTitle')}</Text>
        <View style={styles.faqList}>
          {FAQ.map((item) => (
            <FaqItem key={item.q} question={t(item.q)} answer={t(item.a)} />
          ))}
        </View>

        <Text variant="h3">{t('support.feedbackTitle')}</Text>
        <FormBanner message={errorText(errors.root?.message)} />
        <View style={styles.form}>
          <Text variant="caption" color={errors.topic ? 'danger' : 'secondary'}>
            {t('support.topic')}
          </Text>
          <Controller
            control={control}
            name="topic"
            render={({ field }) => (
              <ChipGroup
                mode="single"
                allowEmpty={false}
                options={FEEDBACK_TOPICS.map((value) => ({ value, label: t(`support.topics.${value}`) }))}
                value={field.value ? [field.value] : []}
                onChange={(next) => {
                  const picked = next[0];
                  if (picked) field.onChange(picked);
                }}
              />
            )}
          />
          {errors.topic ? (
            <Text variant="caption" color="danger">
              {errorText(errors.topic.message)}
            </Text>
          ) : null}
          <Controller
            control={control}
            name="message"
            render={({ field }) => (
              <TextField
                label={t('support.message')}
                placeholder={t('support.messagePlaceholder')}
                multiline
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errorText(errors.message?.message)}
              />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <TextField
                label={`${t('support.replyEmail')} (${t('common.optional')})`}
                placeholder={t('auth.emailPlaceholder')}
                leftIcon="mail-outline"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errorText(errors.email?.message)}
              />
            )}
          />
          <Button title={t('support.send')} leftIcon="send" fullWidth loading={feedback.isPending} onPress={() => void onSubmit()} />
        </View>
      </KeyboardAwareScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  flex: {
    flex: 1,
  },
  content: {
    padding: layout.screenPadding,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  contacts: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  contact: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: t.colors.surface,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
  contactIcon: {
    width: sizes.iconButton.lg,
    height: sizes.iconButton.lg,
    borderRadius: radii.md,
    backgroundColor: t.colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqList: {
    gap: spacing.sm,
  },
  faq: {
    padding: spacing.lg,
    gap: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: t.colors.surface,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  form: {
    gap: spacing.md,
  },
}));
