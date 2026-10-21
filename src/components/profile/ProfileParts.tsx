import { useRouter } from 'expo-router';
import { Children, type ReactNode, type Ref, useImperativeHandle, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Avatar, Badge, Button, Divider, IconButton, Sheet, type SheetRef, Text } from '@/components/ui';
import { formatMonthYear, formatNumber } from '@/lib/format';
import { formatUzPhone } from '@/lib/phone';
import { useSessionStore } from '@/store/session';
import { toast } from '@/store/toast';
import { makeStyles, radii, sizes, spacing } from '@/theme';
import type { User } from '@/types/domain';

export function ProfileHeader({ user }: { user: User }) {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      <Avatar name={user.name} uri={user.avatar} size="xl" verified={user.role !== 'buyer'} />
      <View style={styles.headerInfo}>
        <Text variant="h2" numberOfLines={2}>
          {user.company ?? user.name}
        </Text>
        {user.company ? (
          <Text variant="bodySm" color="secondary" numberOfLines={1}>
            {user.name}
          </Text>
        ) : null}
        <Text variant="bodySm" color="secondary" numberOfLines={1}>
          {formatUzPhone(user.phone)}
        </Text>
        <View style={styles.headerBadges}>
          <Badge tone="goldSoft" label={t(`roles.${user.role}`)} />
          <Text variant="caption" color="tertiary">
            {t('profile.memberSince', { date: formatMonthYear(new Date(user.createdAt), t) })}
          </Text>
        </View>
      </View>
      <IconButton icon="create-outline" onPress={() => router.push('/edit-profile')} accessibilityLabel={t('profile.editProfile')} />
    </View>
  );
}

export interface StatItem {
  key: string;
  label: string;
  value: number | string;
  onPress?: () => void;
}

/** Ряд показателей (избранное / показы / просмотрено или статистика продавца). */
export function StatsRow({ items }: { items: readonly StatItem[] }) {
  const styles = useStyles();
  return (
    <View style={styles.stats}>
      {items.map((item) => (
        <View key={item.key} style={styles.stat} accessible accessibilityLabel={`${item.label}: ${item.value}`}>
          <Text variant="h3" numberOfLines={1}>
            {typeof item.value === 'number' ? formatNumber(item.value) : item.value}
          </Text>
          <Text variant="caption" color="secondary" numberOfLines={1}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Карточка-группа пунктов меню с разделителями. */
export function MenuCard({ title, children }: { title?: string; children: ReactNode }) {
  const styles = useStyles();
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.menuWrap}>
      {title ? (
        <Text variant="overline" color="tertiary" style={styles.menuTitle}>
          {title}
        </Text>
      ) : null}
      <View style={styles.menu}>
        {items.map((child, index) => (
          <View key={index}>
            {index > 0 ? <Divider inset={spacing.lg + sizes.iconButton.sm + spacing.md} /> : null}
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}

export interface SignOutSheetHandle {
  open: () => void;
}

/** Подтверждение выхода в bottom sheet (без системных Alert). */
export function SignOutSheet({ ref }: { ref: Ref<SignOutSheetHandle> }) {
  const styles = useStyles();
  const { t } = useTranslation();
  const sheetRef = useRef<SheetRef>(null);
  const signOut = useSessionStore((s) => s.signOut);

  useImperativeHandle(ref, () => ({ open: () => sheetRef.current?.present() }));

  return (
    <Sheet ref={sheetRef} title={t('profile.signOutConfirm')}>
      <View style={styles.sheetActions}>
        <Button
          title={t('profile.signOut')}
          variant="danger"
          leftIcon="log-out-outline"
          fullWidth
          onPress={async () => {
            sheetRef.current?.dismiss();
            await signOut();
            toast.info(t('profile.signedOut'));
          }}
        />
        <Button title={t('common.cancel')} variant="ghost" fullWidth onPress={() => sheetRef.current?.dismiss()} />
      </View>
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  headerInfo: {
    flex: 1,
    gap: spacing.xxs,
  },
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  stats: {
    flexDirection: 'row',
    borderRadius: radii.xl,
    backgroundColor: t.colors.surface,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
    paddingVertical: spacing.lg,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
  },
  menuWrap: {
    gap: spacing.sm,
  },
  menuTitle: {
    paddingHorizontal: spacing.xs,
  },
  menu: {
    borderRadius: radii.xl,
    backgroundColor: t.colors.surface,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
    overflow: 'hidden',
  },
  sheetActions: {
    gap: spacing.sm,
  },
}));
