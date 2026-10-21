import 'intl-pluralrules';

import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { en } from './locales/en';
import { ru } from './locales/ru';
import { uz } from './locales/uz';
import { isLanguage, type Language } from './types';

export { isLanguage, type Language, SUPPORTED_LANGUAGES } from './types';

/** Язык устройства, если он поддерживается; иначе русский. */
export function detectDeviceLanguage(): Language {
  try {
    const code = getLocales()[0]?.languageCode ?? 'ru';
    return isLanguage(code) ? code : 'ru';
  } catch {
    return 'ru';
  }
}

let initialized = false;

export function initI18n(language: Language): typeof i18n {
  if (initialized) {
    if (i18n.language !== language) void i18n.changeLanguage(language);
    return i18n;
  }
  initialized = true;
  void i18n.use(initReactI18next).init({
    resources: {
      ru: { translation: ru },
      uz: { translation: uz },
      en: { translation: en },
    },
    lng: language,
    fallbackLng: 'ru',
    supportedLngs: ['ru', 'uz', 'en'],
    interpolation: { escapeValue: false },
    returnNull: false,
    initAsync: false,
    react: { useSuspense: false },
  });
  return i18n;
}

/** Смена языка на лету — без перезагрузки: все useTranslation() перерисуются. */
export function changeLanguage(language: Language): void {
  if (i18n.language !== language) void i18n.changeLanguage(language);
}

export default i18n;
