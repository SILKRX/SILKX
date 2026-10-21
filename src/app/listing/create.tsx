import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { KeyboardAwareScrollView, type KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import Animated, { FadeIn, FadeInRight, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BasicsStep, DetailsStep, LocationStep, MediaStep, ReviewStep } from '@/components/listing/WizardSteps';
import { Button, Icon, IconButton, ProgressBar, StickyBar, Text } from '@/components/ui';
import { useFormErrorText } from '@/features/forms';
import { type StepErrors, validateStep } from '@/features/listing/schemas';
import { useCreateListing } from '@/hooks/api/business';
import { analytics } from '@/lib/analytics';
import { errorMessageKey } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import { isDraftDirty, type ListingDraft, useListingDraftStore, WIZARD_STEPS } from '@/store/listingDraft';
import { toast } from '@/store/toast';
import { layout, makeStyles, motion, radii, sizes, spacing, useTheme } from '@/theme';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

/** Мастер создания объявления: 5 шагов, валидация каждого шага, черновик переживает перезапуск. */
export default function CreateListingScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const errorText = useFormErrorText();
  const draft = useListingDraftStore((s) => s.draft);
  const stepIndex = useListingDraftStore((s) => s.stepIndex);
  const update = useListingDraftStore((s) => s.update);
  const setStepIndex = useListingDraftStore((s) => s.setStepIndex);
  const resetDraft = useListingDraftStore((s) => s.reset);
  const create = useCreateListing();
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
  const [errors, setErrors] = useState<StepErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const step = WIZARD_STEPS[stepIndex] ?? 'basics';
  const isLast = stepIndex === WIZARD_STEPS.length - 1;
  const dirty = isDraftDirty(draft);

  useEffect(() => {
    if (isDraftDirty(useListingDraftStore.getState().draft)) toast.info(t('wizard.draftRestored'));
    // только при открытии мастера
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = (changes: Partial<ListingDraft>) => {
    update(changes);
    // поправленное поле больше не подсвечиваем ошибкой
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(changes) as (keyof ListingDraft)[]) delete next[key];
      return next;
    });
  };

  const goTo = (index: number) => {
    setErrors({});
    setStepIndex(index);
    analytics.track('listing_wizard_step', { step: index + 1 });
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const close = () => (router.canGoBack() ? router.back() : router.dismissTo('/profile'));

  const submit = () => {
    const normalized: ListingDraft = { ...draft, floor: draft.type === 'house' ? 1 : draft.floor };
    create.mutate(normalized, {
      onSuccess: () => {
        haptics.success();
        setSubmitted(true);
        resetDraft();
      },
      onError: (error) => {
        haptics.error();
        toast.error(t(errorMessageKey(error)));
      },
    });
  };

  const next = () => {
    const stepErrors = validateStep(step, draft);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) {
      haptics.error();
      return;
    }
    if (isLast) submit();
    else goTo(stepIndex + 1);
  };

  const back = () => (stepIndex === 0 ? close() : goTo(stepIndex - 1));
  const errorFor = (field: keyof ListingDraft) => errorText(errors[field]);

  if (submitted) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.success}>
          <Animated.View entering={ZoomIn.springify()} style={styles.successIcon}>
            <Icon name="hourglass-outline" size="hero" color={colors.textOnGold} />
          </Animated.View>
          <Animated.View entering={FadeIn.delay(motion.fast)} style={styles.successTexts}>
            <Text variant="h2" align="center">
              {t('wizard.submittedTitle')}
            </Text>
            <Text color="secondary" align="center">
              {t('wizard.submittedText')}
            </Text>
          </Animated.View>
          <View style={styles.successActions}>
            <Button title={t('profile.myListings')} fullWidth onPress={() => router.dismissTo('/profile')} />
            <Button title={t('profile.createListing')} variant="ghost" fullWidth onPress={() => setSubmitted(false)} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <IconButton icon="close" variant="ghost" onPress={close} accessibilityLabel={t('common.close')} />
        <View style={styles.flex}>
          <Text variant="title" align="center">
            {t('wizard.title')}
          </Text>
          <Text variant="caption" color="secondary" align="center">
            {t('wizard.step', { current: stepIndex + 1, total: WIZARD_STEPS.length })} · {t(`wizard.steps.${step}`)}
          </Text>
        </View>
        {dirty ? (
          <IconButton
            icon="trash-outline"
            variant="ghost"
            onPress={() => {
              resetDraft();
              setErrors({});
              toast.info(t('wizard.discarded'));
            }}
            accessibilityLabel={t('wizard.discard')}
          />
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>
      <View style={styles.progress}>
        <ProgressBar progress={(stepIndex + 1) / WIZARD_STEPS.length} />
      </View>

      <KeyboardAwareScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        bottomOffset={layout.stickyBarHeight}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View key={step} entering={FadeInRight.duration(motion.base)}>
          {step === 'basics' ? <BasicsStep draft={draft} update={patch} errorFor={errorFor} /> : null}
          {step === 'location' ? <LocationStep draft={draft} update={patch} errorFor={errorFor} /> : null}
          {step === 'details' ? <DetailsStep draft={draft} update={patch} errorFor={errorFor} /> : null}
          {step === 'media' ? <MediaStep draft={draft} update={patch} errorFor={errorFor} /> : null}
          {step === 'review' ? <ReviewStep draft={draft} goTo={goTo} /> : null}
        </Animated.View>
      </KeyboardAwareScrollView>

      <StickyBar>
        <Button title={t('common.back')} variant="secondary" leftIcon="chevron-back" onPress={back} />
        <View style={styles.flex}>
          <Button
            title={isLast ? t('wizard.submit') : t('common.next')}
            rightIcon={isLast ? 'send' : 'chevron-forward'}
            fullWidth
            loading={create.isPending}
            onPress={next}
          />
        </View>
      </StickyBar>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    minHeight: sizes.header,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  headerSpacer: {
    width: sizes.iconButton.md,
  },
  progress: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.md,
  },
  content: {
    padding: layout.screenPadding,
    paddingBottom: layout.stickyBarHeight + spacing.giant,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  success: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.xxl,
  },
  successIcon: {
    width: sizes.avatar.xl,
    height: sizes.avatar.xl,
    borderRadius: radii.pill,
    backgroundColor: t.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTexts: {
    gap: spacing.sm,
    maxWidth: layout.textMaxWidth,
  },
  successActions: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
}));
