import { create } from 'zustand';

interface NetworkState {
  isOnline: boolean;
  setOnline: (value: boolean) => void;
}

/** Текущее состояние сети (обновляется NetworkProvider через NetInfo). */
export const useNetworkStore = create<NetworkState>()((set) => ({
  isOnline: true,
  setOnline: (isOnline) => set({ isOnline }),
}));

export function isOnlineNow(): boolean {
  return useNetworkStore.getState().isOnline;
}
