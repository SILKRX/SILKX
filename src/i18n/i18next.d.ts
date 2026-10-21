import 'i18next';

import type { ru } from './locales/ru';

/**
 * Строгая типизация ключей: t('несуществующий.ключ') — ошибка компиляции,
 * а интерполяции ({{name}}) проверяются по эталонной русской локали.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof ru;
    };
    strictKeyChecks: true;
  }
}
