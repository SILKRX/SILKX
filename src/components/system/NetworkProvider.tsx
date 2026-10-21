import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Platform } from 'react-native';

import { useNetworkStore } from '@/store/network';
import { toast, useToastStore } from '@/store/toast';

const OFFLINE_TOAST_ID = 'network-offline';

/**
 * Сеть и фокус приложения:
 *  • NetInfo → onlineManager (React Query ставит запросы на паузу офлайн и догоняет при восстановлении);
 *  • постоянный тост «Нет подключения… показаны сохранённые данные»;
 *  • AppState → focusManager (refetch при возвращении в приложение).
 */
export function NetworkProvider() {
  const { t } = useTranslation();
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    let wasOnline = true;
    const unsubscribe = NetInfo.addEventListener((state) => {
      // null — состояние ещё неизвестно: не пугаем пользователя
      const online = state.isConnected !== false && state.isInternetReachable !== false;
      useNetworkStore.getState().setOnline(online);
      onlineManager.setOnline(online);
      if (!online && wasOnline) {
        useToastStore.getState().show({ id: OFFLINE_TOAST_ID, type: 'offline', title: tRef.current('network.offline'), duration: null });
      } else if (online && !wasOnline) {
        toast.hide(OFFLINE_TOAST_ID);
        toast.success(tRef.current('network.online'));
      }
      wasOnline = online;
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (status) => {
      focusManager.setFocused(status === 'active');
    });
    return () => sub.remove();
  }, []);

  return null;
}
