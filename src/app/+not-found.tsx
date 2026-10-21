import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EmptyState, Screen, ScreenHeader } from '@/components/ui';

export default function NotFoundScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <Screen>
      <ScreenHeader onBack={() => router.replace('/')} />
      <EmptyState icon="compass-outline" title={t('notFound.title')} text={t('notFound.text')} actionLabel={t('errors.goHome')} onAction={() => router.replace('/')} />
    </Screen>
  );
}
