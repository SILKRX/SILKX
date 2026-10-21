import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Avatar, Badge, Button, Stars, Text } from '@/components/ui';
import { formatMonthYear } from '@/lib/format';
import { makeStyles, radii, sizes, spacing } from '@/theme';
import type { SellerSummary } from '@/types/domain';

interface SellerCardProps {
  seller: SellerSummary;
  onMessage?: () => void;
  onCall?: () => void;
  messageLoading?: boolean;
}

/** Карточка продавца с маркером доверия «Проверено SILKX», рейтингом и стажем на платформе. */
export function SellerCard({ seller, onMessage, onCall, messageLoading }: SellerCardProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Avatar name={seller.name} uri={seller.avatar} size="lg" verified={seller.verified} />
        <View style={styles.info}>
          <Text variant="title" numberOfLines={1}>
            {seller.name}
          </Text>
          <Text variant="bodySm" color="secondary">
            {t(`property.sellerKind.${seller.kind}`)}
          </Text>
          <View style={styles.rating}>
            <Stars rating={seller.rating} />
            <Text variant="caption" color="secondary">
              {seller.rating.toFixed(1)} · {t('property.reviews', { count: seller.reviewsCount })}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.meta}>
        {seller.verified ? <Badge tone="goldSoft" icon="shield-checkmark" label={t('property.verified')} /> : null}
        <Text variant="caption" color="tertiary">
          {t('property.onSilkxSince', { date: formatMonthYear(new Date(seller.registeredAt), t) })}
        </Text>
      </View>
      {onMessage || onCall ? (
        <View style={styles.actions}>
          {onMessage ? (
            <View style={styles.flex}>
              <Button title={t('property.writeMessage')} variant="outline" leftIcon="chatbubble-ellipses-outline" onPress={onMessage} loading={messageLoading} fullWidth />
            </View>
          ) : null}
          {onCall ? (
            <View style={styles.flex}>
              <Button title={t('common.call')} variant="secondary" leftIcon="call-outline" onPress={onCall} fullWidth />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  flex: {
    flex: 1,
  },
  card: {
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: t.colors.surface,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  info: {
    flex: 1,
    gap: spacing.xxs,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + spacing.xxs,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
}));
