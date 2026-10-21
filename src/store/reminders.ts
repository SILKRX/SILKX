import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { cancelScheduledReminder } from '@/lib/push';
import { STORAGE_KEYS, zustandStorage } from '@/lib/storage';

interface RemindersState {
  /** viewingId → id локального уведомления «показ через 2 часа» */
  byViewing: Record<string, string>;
  remember: (viewingId: string, notificationId: string) => void;
  /** Отменить напоминание (при отмене показа) */
  cancel: (viewingId: string) => Promise<void>;
}

export const useRemindersStore = create<RemindersState>()(
  persist(
    (set, get) => ({
      byViewing: {},
      remember: (viewingId, notificationId) => set((s) => ({ byViewing: { ...s.byViewing, [viewingId]: notificationId } })),
      cancel: async (viewingId) => {
        const notificationId = get().byViewing[viewingId];
        if (!notificationId) return;
        await cancelScheduledReminder(notificationId);
        set((s) => {
          const next = { ...s.byViewing };
          delete next[viewingId];
          return { byViewing: next };
        });
      },
    }),
    { name: STORAGE_KEYS.reminders, storage: zustandStorage, version: 1 },
  ),
);
