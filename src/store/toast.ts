import { create } from 'zustand';

import { uid } from '@/lib/id';
import { motion } from '@/theme/tokens';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'offline';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  /** null — висит, пока не скроют вручную (например, «нет сети») */
  duration: number | null;
}

interface ToastState {
  toasts: ToastItem[];
  show: (toast: Omit<ToastItem, 'id' | 'duration'> & { id?: string; duration?: number | null }) => string;
  hide: (id: string) => void;
}

const MAX_VISIBLE = 3;

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  show: (input) => {
    const id = input.id ?? uid('toast');
    const item: ToastItem = {
      id,
      type: input.type,
      title: input.title,
      message: input.message,
      duration: input.duration === undefined ? motion.toast : input.duration,
    };
    set((s) => {
      const withoutSame = s.toasts.filter((t) => t.id !== id);
      return { toasts: [...withoutSame, item].slice(-MAX_VISIBLE) };
    });
    return id;
  },
  hide: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Императивный API — вызывается из мутаций, сторов и обработчиков, не только из компонентов. */
export const toast = {
  success: (title: string, message?: string) => useToastStore.getState().show({ type: 'success', title, message }),
  error: (title: string, message?: string) => useToastStore.getState().show({ type: 'error', title, message }),
  info: (title: string, message?: string) => useToastStore.getState().show({ type: 'info', title, message }),
  warning: (title: string, message?: string) => useToastStore.getState().show({ type: 'warning', title, message }),
  hide: (id: string) => useToastStore.getState().hide(id),
};
