import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { IconButton } from '@/components/ui';
import { useToggleFavorite } from '@/hooks/api/favorites';
import { useIsFavorite } from '@/store/favorites';
import { motion, sizes, useTheme } from '@/theme';

const POP_SCALE = 1.28;

/** Сердечко с мгновенным оптимистичным откликом, «пульсом» и вибрацией. */
export function FavoriteButton({ propertyId, size = 'md', variant = 'glass' }: { propertyId: string; size?: keyof typeof sizes.iconButton; variant?: 'glass' | 'surface' }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const liked = useIsFavorite(propertyId);
  const toggle = useToggleFavorite();
  const scale = useSharedValue(1);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (liked) scale.set(withSequence(withSpring(POP_SCALE, motion.spring), withSpring(1, motion.spring)));
  }, [liked, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Animated.View style={animatedStyle}>
      <IconButton
        icon={liked ? 'heart' : 'heart-outline'}
        color={liked ? colors.gold : variant === 'glass' ? colors.white : colors.text}
        variant={variant}
        size={size}
        haptic={false}
        onPress={() => toggle(propertyId)}
        accessibilityLabel={liked ? t('favorites.remove') : t('favorites.add')}
      />
    </Animated.View>
  );
}
