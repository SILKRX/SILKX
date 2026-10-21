import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { MenuCard, ProfileHeader, SignOutSheet, type SignOutSheetHandle, StatsRow } from '@/components/profile/ProfileParts';
import { SellerDashboard } from '@/components/profile/SellerDashboard';
import { FeatureGate } from '@/components/system/AppSync';
import { Button, Icon, ListItem, Logo, Screen, Text } from '@/components/ui';
import { useAdminOverview, useSellerListings, useSellerStats } from '@/hooks/api/business';
import { useMyViewings, useUnreadCounts } from '@/hooks/api/engagement';
import { usePullToRefresh } from '@/hooks/common';
import { propertyTitle } from '@/features/property/format';
import { formatDateTime } from '@/lib/format';
import { useFavoritesStore } from '@/store/favorites';
import { useHistoryStore } from '@/store/history';
import { useRole, useSessionStore } from '@/store/session';
import { gradients, layout, makeStyles, opacity, radii, sizes, spacing, useTheme } from '@/theme';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

function GuestCard() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <LinearGradient colors={gradients.ink} style={styles.guest}>
      <Logo height={sizes.logo.md} onDark />
      <Text variant="h2" color="white">
        {t('profile.guestTitle')}
      </Text>
      <Text color="white" style={styles.guestText}>
        {t('profile.guestText')}
      </Text>
      <View style={styles.guestActions}>
        <View style={styles.flex}>
          <Button title={t('auth.signIn')} fullWidth onPress={() => router.push('/sign-in')} />
        </View>
        <View style={styles.flex}>
          <Button title={t('auth.signUp')} variant="onDark" fullWidth onPress={() => router.push('/sign-up')} />
        </View>
      </View>
    </LinearGradient>
  );
}

function NextViewingCard() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const viewings = useMyViewings();
  const next = viewings.data?.find((v) => v.status === 'scheduled' && new Date(v.start).getTime() > Date.now() && !v.isIncoming);

  return (
    <Pressable style={styles.nextCard} onPress={() => router.push(next ? '/viewings' : '/catalog')} accessibilityRole="button">
      <View style={styles.nextIcon}>
        <Icon name="calendar" size="lg" color={colors.textOnGold} />
      </View>
      <View style={styles.flex}>
        <Text variant="caption" color="secondary">
          {t('profile.nextViewing')}
        </Text>
        {next ? (
          <>
            <Text variant="bodyStrong" numberOfLines={1}>
              {formatDateTime(new Date(next.start), t)}
            </Text>
            {next.property ? (
              <Text variant="bodySm" color="secondary" numberOfLines={1}>
                {propertyTitle(next.property, t)}
              </Text>
            ) : null}
          </>
        ) : (
          <>
            <Text variant="bodyStrong">{t('profile.noViewings')}</Text>
            <Text variant="bodySm" color="gold">
              {t('profile.findProperty')}
            </Text>
          </>
        )}
      </View>
      <Icon name="chevron-forward" size="sm" color={colors.textTertiary} />
    </Pressable>
  );
}

function AdminOverviewCard() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const overview = useAdminOverview();
  const data = overview.data;
  return (
    <View style={styles.section}>
      <StatsRow
        items={[
          { key: 'pending', label: t('admin.moderation'), value: data?.pending ?? '—' },
          { key: 'active', label: t('profile.listingStatus.active'), value: data?.activeListings ?? '—' },
          { key: 'users', label: t('admin.users'), value: data?.users ?? '—' },
          { key: 'banned', label: t('admin.bannedBadge'), value: data?.banned ?? '—' },
        ]}
      />
      <MenuCard>
        <ListItem
          icon="shield-checkmark-outline"
          title={t('admin.moderation')}
          subtitle={data ? t('profile.adminPending', { count: data.pending }) : undefined}
          badge={data?.pending}
          onPress={() => router.push('/manage')}
        />
        <ListItem icon="people-outline" title={t('profile.usersManagement')} onPress={() => router.push('/admin/users')} />
      </MenuCard>
    </View>
  );
}

export default function ProfileScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const user = useSessionStore((s) => s.user);
  const role = useRole();
  const favoritesCount = useFavoritesStore((s) => s.ids.length);
  const historyCount = useHistoryStore((s) => s.entries.length);
  const unread = useUnreadCounts();
  const viewings = useMyViewings();
  const sellerStats = useSellerStats();
  const sellerListings = useSellerListings();
  const overview = useAdminOverview();
  const signOutRef = useRef<SignOutSheetHandle>(null);

  const { refreshing, onRefresh } = usePullToRefresh(() =>
    Promise.all([viewings.refetch(), sellerStats.refetch(), sellerListings.refetch(), overview.refetch()]),
  );

  const upcomingCount = viewings.data?.filter((v) => v.status === 'scheduled' && new Date(v.start).getTime() > Date.now()).length ?? 0;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          role ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} progressBackgroundColor={colors.surface} />
          ) : undefined
        }
      >
        <Text variant="h1" accessibilityRole="header">
          {t('profile.title')}
        </Text>

        {!user || !role ? (
          <GuestCard />
        ) : (
          <>
            <ProfileHeader user={user} />
            {role === 'buyer' ? (
              <>
                <StatsRow
                  items={[
                    { key: 'fav', label: t('profile.statFavorites'), value: favoritesCount },
                    { key: 'views', label: t('profile.statViewings'), value: upcomingCount },
                    { key: 'history', label: t('profile.statHistory'), value: historyCount },
                  ]}
                />
                <NextViewingCard />
              </>
            ) : null}
            {role === 'seller' ? (
              <View style={styles.section}>
                <Text variant="overline" color="tertiary">
                  {t('profile.sellerDashboard')}
                </Text>
                <SellerDashboard />
              </View>
            ) : null}
            {role === 'admin' ? (
              <View style={styles.section}>
                <Text variant="overline" color="tertiary">
                  {t('profile.adminPanel')}
                </Text>
                <AdminOverviewCard />
              </View>
            ) : null}
          </>
        )}

        {user && role ? (
          <MenuCard title={t('settings.account')}>
            <ListItem icon="calendar-outline" title={t('profile.myViewings')} onPress={() => router.push('/viewings')} badge={upcomingCount} />
            {role === 'seller' ? <ListItem icon="time-outline" title={t('profile.slots')} onPress={() => router.push('/seller/slots')} /> : null}
            <FeatureGate flag="chat">
              <ListItem icon="chatbubbles-outline" title={t('profile.messages')} onPress={() => router.push('/chats')} badge={unread.messages} />
            </FeatureGate>
            <ListItem icon="notifications-outline" title={t('profile.notifications')} onPress={() => router.push('/notifications')} badge={unread.notifications} />
          </MenuCard>
        ) : null}

        <MenuCard>
          <ListItem icon="time-outline" title={t('profile.history')} onPress={() => router.push('/history')} value={historyCount > 0 ? String(historyCount) : undefined} />
          <ListItem icon="settings-outline" title={t('profile.settings')} onPress={() => router.push('/settings')} />
          <ListItem icon="help-buoy-outline" title={t('profile.support')} onPress={() => router.push('/support')} />
        </MenuCard>

        {user && role ? (
          <MenuCard>
            <ListItem icon="log-out-outline" title={t('profile.signOut')} destructive onPress={() => signOutRef.current?.open()} chevron={false} />
          </MenuCard>
        ) : null}
      </ScrollView>
      <SignOutSheet ref={signOutRef} />
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
    gap: spacing.xl,
  },
  section: {
    gap: spacing.md,
  },
  guest: {
    padding: spacing.xl,
    borderRadius: radii.xl,
    gap: spacing.md,
    overflow: 'hidden',
  },
  guestText: {
    opacity: opacity.pressed,
  },
  guestActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  nextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: t.colors.surface,
    borderWidth: sizes.border,
    borderColor: t.colors.goldBorder,
  },
  nextIcon: {
    width: sizes.iconButton.lg,
    height: sizes.iconButton.lg,
    borderRadius: radii.md,
    backgroundColor: t.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
