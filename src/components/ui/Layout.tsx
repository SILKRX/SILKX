import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';
import { type Edge, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, makeStyles, radii, sizes, spacing, useTheme } from '@/theme';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { IconButton } from './IconButton';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

/** Корневой контейнер экрана с фоном темы и безопасными зонами. */
export function Screen({ children, edges = ['top'], style }: { children: ReactNode; edges?: Edge[]; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles();
  return (
    <SafeAreaView edges={edges} style={[styles.screen, style]}>
      {children}
    </SafeAreaView>
  );
}

interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: ReactNode;
  /** Хедер сам добавляет отступ под статус-бар (для экранов без SafeAreaView) */
  withInset?: boolean;
  large?: boolean;
}

export function ScreenHeader({ title, subtitle, showBack = true, onBack, right, withInset = false, large = false }: ScreenHeaderProps) {
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const handleBack = () => {
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  return (
    <View style={[styles.header, withInset && { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.headerRow}>
        {showBack ? <IconButton icon="chevron-back" onPress={handleBack} accessibilityLabel="back" variant="ghost" /> : null}
        {!large && title ? (
          <View style={styles.headerTitleBox}>
            <Text variant="title" numberOfLines={1} align={showBack ? 'center' : 'left'}>
              {title}
            </Text>
            {subtitle ? (
              <Text variant="caption" color="secondary" numberOfLines={1} align={showBack ? 'center' : 'left'}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.flex} />
        )}
        <View style={styles.headerRight}>{right}</View>
      </View>
      {large && title ? (
        <View style={styles.largeTitle}>
          <Text variant="h1">{title}</Text>
          {subtitle ? <Text color="secondary">{subtitle}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

export function SectionHeader({ title, subtitle, actionLabel, onAction }: { title: string; subtitle?: string; actionLabel?: string; onAction?: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <View style={styles.flex}>
        <Text variant="h2">{title}</Text>
        {subtitle ? (
          <Text variant="bodySm" color="secondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <PressableScale onPress={onAction} haptic="selection" hitSlop={sizes.hitSlop} style={styles.sectionAction}>
          <Text variant="buttonSm" color="gold">
            {actionLabel}
          </Text>
          <Icon name="chevron-forward" size="sm" />
        </PressableScale>
      ) : null}
    </View>
  );
}

export function Card({ children, style, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  const styles = useStyles();
  return <View style={[styles.card, padded && styles.cardPadded, style]}>{children}</View>;
}

export function Divider({ inset = 0, style }: { inset?: number; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles();
  return <View style={[styles.divider, { marginLeft: inset }, style]} />;
}

interface EmptyStateProps {
  icon: IconName;
  title: string;
  text?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export function EmptyState({ icon, title, text, actionLabel, onAction, compact = false }: EmptyStateProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={[styles.empty, compact && styles.emptyCompact]}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size="xxl" color={colors.gold} />
      </View>
      <Text variant="h3" align="center">
        {title}
      </Text>
      {text ? (
        <Text color="secondary" align="center" style={styles.emptyText}>
          {text}
        </Text>
      ) : null}
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} style={styles.emptyAction} /> : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: t.colors.background,
  },
  headerRow: {
    minHeight: sizes.header,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitleBox: {
    flex: 1,
  },
  headerRight: {
    minWidth: sizes.iconButton.md,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  largeTitle: {
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    gap: spacing.xs,
  },
  section: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingBottom: spacing.xs,
  },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: radii.xl,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
  cardPadded: {
    padding: spacing.lg,
  },
  divider: {
    height: sizes.divider,
    backgroundColor: t.colors.border,
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.giant,
    gap: spacing.sm,
  },
  emptyCompact: {
    paddingVertical: spacing.xxxl,
  },
  emptyIcon: {
    width: sizes.avatar.xl,
    height: sizes.avatar.xl,
    borderRadius: sizes.avatar.xl / 2,
    backgroundColor: t.colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyText: {
    maxWidth: layout.textMaxWidth,
  },
  emptyAction: {
    marginTop: spacing.md,
    alignSelf: 'center',
  },
}));
