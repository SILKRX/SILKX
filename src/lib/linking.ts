import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import type { Coordinates } from '@/types/domain';

import { monitoring } from './monitoring';

async function openSafely(url: string, scope: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    // Симулятор без «Телефона», планшет без SIM, веб без обработчика tel: — не падаем
    monitoring.addBreadcrumb({ category: 'linking', message: `${scope} failed` });
    return false;
  }
}

/** Звонок продавцу. Возвращает false, если устройство не умеет звонить. */
export function callPhone(phone: string): Promise<boolean> {
  const digits = phone.replace(/[^\d+]/g, '');
  if (!digits) return Promise.resolve(false);
  return openSafely(`tel:${digits}`, 'call');
}

/** Открыть точку в системных картах (Apple Maps / Google Maps / браузер). */
export function openInMaps(coords: Coordinates, label: string): Promise<boolean> {
  const { latitude, longitude } = coords;
  const query = encodeURIComponent(label);
  const url =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?ll=${latitude},${longitude}&q=${query}`
      : Platform.OS === 'android'
        ? `geo:${latitude},${longitude}?q=${latitude},${longitude}(${query})`
        : `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  return openSafely(url, 'maps');
}

export function openUrl(url: string): Promise<boolean> {
  // В вебе внешние ссылки — в новой вкладке: сессия живёт в памяти, и уход со страницы разлогинивает.
  // С noopener window.open всегда возвращает null, поэтому результат не проверяем.
  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return Promise.resolve(true);
  }
  return openSafely(url, 'url');
}
