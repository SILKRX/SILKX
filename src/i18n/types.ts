import type { ru } from './locales/ru';

/** Превращает литеральные строки эталонной локали в string, сохраняя структуру ключей. */
type Widen<T> = { readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };

/** Тип любой локали. Пропущенный или лишний ключ в uz/en — ошибка компиляции. */
export type Translation = Widen<typeof ru>;

export const SUPPORTED_LANGUAGES = ['ru', 'uz', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export function isLanguage(value: string): value is Language {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}
