import { create } from 'zustand';

export type StatusBarTone = 'light' | 'dark';

interface UiState {
  /**
   * Экраны с фото на всю ширину (главная, галерея, карточка объекта) временно
   * переключают цвет статус-бара. null — цвет по теме.
   */
  statusBarOverride: StatusBarTone | null;
  setStatusBarOverride: (tone: StatusBarTone | null) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  statusBarOverride: null,
  setStatusBarOverride: (statusBarOverride) => set({ statusBarOverride }),
}));
