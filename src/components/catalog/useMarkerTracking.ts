import { useEffect, useState } from 'react';

import { motion } from '@/theme';

/**
 * Кастомные маркеры react-native-maps: на Android view маркера снимается в bitmap.
 * Пока tracksViewChanges=true, снимок обновляется (дорого), поэтому включаем его только
 * на короткое время после монтирования и после смены ключевых пропсов.
 */
export function useMarkerTracking(key: unknown): boolean {
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    setTracking(true);
    const timer = setTimeout(() => setTracking(false), motion.markerSnapshot);
    return () => clearTimeout(timer);
  }, [key]);
  return tracking;
}
