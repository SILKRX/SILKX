import type { Ref } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { Property } from '@/types/domain';

export interface PropertyMapHandle {
  /** Плавно навести камеру на объект */
  focus: (id: string) => void;
  /** Показать все маркеры */
  fitAll: () => void;
}

export interface PropertyMapProps {
  ref?: Ref<PropertyMapHandle>;
  properties: readonly Property[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Тап по пустому месту карты (снять выделение) */
  onMapPress?: () => void;
  /** Высота перекрывающей карусели снизу — чтобы маркеры не прятались под карточками */
  bottomInset?: number;
  style?: StyleProp<ViewStyle>;
}
