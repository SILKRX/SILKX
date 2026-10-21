import * as Updates from 'expo-updates';

import { monitoring } from './monitoring';

export type UpdateCheckOutcome = 'unavailable' | 'up-to-date' | 'downloaded' | 'error';

function updatesSupported(): boolean {
  return !__DEV__ && Updates.isEnabled;
}

/**
 * OTA (expo-updates): проверка и загрузка обновления JS-бандла без релиза в сторах.
 * При запуске — тихо скачиваем, применится при следующем старте.
 */
export async function checkForUpdateOnLaunch(): Promise<void> {
  if (!updatesSupported()) return;
  try {
    const result = await Updates.checkForUpdateAsync();
    if (result.isAvailable) {
      await Updates.fetchUpdateAsync();
      monitoring.addBreadcrumb({ category: 'updates', message: 'update downloaded on launch' });
    }
  } catch (error) {
    monitoring.captureException(error, { scope: 'updates.launch' });
  }
}

/** Ручная проверка из настроек: при наличии обновления — скачиваем и перезапускаем. */
export async function checkForUpdateManually(): Promise<UpdateCheckOutcome> {
  if (!updatesSupported()) return 'unavailable';
  try {
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) return 'up-to-date';
    await Updates.fetchUpdateAsync();
    return 'downloaded';
  } catch (error) {
    monitoring.captureException(error, { scope: 'updates.manual' });
    return 'error';
  }
}

export async function applyDownloadedUpdate(): Promise<void> {
  try {
    await Updates.reloadAsync();
  } catch (error) {
    monitoring.captureException(error, { scope: 'updates.reload' });
  }
}

export function currentUpdateLabel(): string | null {
  return Updates.updateId ? Updates.updateId.slice(0, 8) : null;
}
