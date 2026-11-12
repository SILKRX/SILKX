import type { TFunction } from 'i18next';

const NBSP = ' ';

/** 85000 → «85 000» (неразрывные пробелы, не зависит от ICU устройства). */
export function formatNumber(value: number, fractionDigits = 0): string {
  if (!Number.isFinite(value)) return '—';
  const fixed = Math.abs(value).toFixed(fractionDigits);
  const [intPart = '0', fracPart] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  const sign = value < 0 ? '−' : '';
  return fracPart ? `${sign}${grouped},${fracPart}` : `${sign}${grouped}`;
}

export function formatUSD(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '—';
  return `$${formatNumber(value)}`;
}

/** Компактно для маркеров карты: $85K, $1.2M */
export function formatCompactUSD(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '—';
  if (value >= 1_000_000) return `$${trimZero((value / 1_000_000).toFixed(1))}M`;
  if (value >= 10_000) return `$${Math.round(value / 1000)}K`;
  if (value >= 1000) return `$${trimZero((value / 1000).toFixed(1))}K`;
  return `$${Math.round(value)}`;
}

function trimZero(value: string): string {
  return value.endsWith('.0') ? value.slice(0, -2) : value;
}

export function formatUZS(value: number, unit: string): string {
  return `${formatNumber(value)}${NBSP}${unit}`;
}

export function formatArea(area: number): string {
  return Number.isInteger(area) ? String(area) : area.toFixed(1).replace('.', ',');
}

export function pricePerM2(price: number, area: number): number {
  return area > 0 ? Math.round(price / area) : 0;
}

export function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

export function formatTime(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

const MONTH_GENITIVE = [
  'calendar.monthsGenitive.m1',
  'calendar.monthsGenitive.m2',
  'calendar.monthsGenitive.m3',
  'calendar.monthsGenitive.m4',
  'calendar.monthsGenitive.m5',
  'calendar.monthsGenitive.m6',
  'calendar.monthsGenitive.m7',
  'calendar.monthsGenitive.m8',
  'calendar.monthsGenitive.m9',
  'calendar.monthsGenitive.m10',
  'calendar.monthsGenitive.m11',
  'calendar.monthsGenitive.m12',
] as const;

const MONTH_SHORT = [
  'calendar.monthsShort.m1',
  'calendar.monthsShort.m2',
  'calendar.monthsShort.m3',
  'calendar.monthsShort.m4',
  'calendar.monthsShort.m5',
  'calendar.monthsShort.m6',
  'calendar.monthsShort.m7',
  'calendar.monthsShort.m8',
  'calendar.monthsShort.m9',
  'calendar.monthsShort.m10',
  'calendar.monthsShort.m11',
  'calendar.monthsShort.m12',
] as const;

const WEEKDAY_SHORT = [
  'calendar.weekdaysShort.d0',
  'calendar.weekdaysShort.d1',
  'calendar.weekdaysShort.d2',
  'calendar.weekdaysShort.d3',
  'calendar.weekdaysShort.d4',
  'calendar.weekdaysShort.d5',
  'calendar.weekdaysShort.d6',
] as const;

export function monthGenitive(date: Date, t: TFunction): string {
  return t(MONTH_GENITIVE[date.getMonth()] ?? MONTH_GENITIVE[0]);
}

export function monthShort(date: Date, t: TFunction): string {
  return t(MONTH_SHORT[date.getMonth()] ?? MONTH_SHORT[0]);
}

export function weekdayShort(date: Date, t: TFunction): string {
  return t(WEEKDAY_SHORT[date.getDay()] ?? WEEKDAY_SHORT[0]);
}

/** «17 октября» или «17 октября 2025», если год не текущий. Порядок задаёт локаль: в zh/ko — «10月17日». */
export function formatDayMonth(date: Date, t: TFunction): string {
  const values = { day: date.getDate(), month: monthGenitive(date, t), year: date.getFullYear() };
  return date.getFullYear() === new Date().getFullYear() ? t('calendar.dayMonth', values) : t('calendar.dayMonthYear', values);
}

/** «окт 2023» — для «на SILKX с …» (в zh/ko — «2023年10月») */
export function formatMonthYear(date: Date, t: TFunction): string {
  return t('calendar.monthYear', { month: monthShort(date, t), year: date.getFullYear() });
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** «2026-10-17» → локальная полночь этого дня (new Date('2026-10-17') дал бы UTC и сдвиг дня). */
export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

/** Локальная дата → «2026-10-17». */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** «Сегодня», «Вчера», «Завтра» или «17 октября». */
export function formatRelativeDay(date: Date, t: TFunction): string {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return t('calendar.today');
  if (diff === -1) return t('calendar.yesterday');
  if (diff === 1) return t('calendar.tomorrow');
  return formatDayMonth(date, t);
}

/** «Сегодня в 14:20», «17 октября в 10:00» */
export function formatDateTime(date: Date, t: TFunction): string {
  return `${formatRelativeDay(date, t)}, ${formatTime(date)}`;
}

/** Для середины предложения: «Вы записаны на завтра, 14:00». */
export function lowerFirst(value: string): string {
  return value ? value.charAt(0).toLocaleLowerCase() + value.slice(1) : value;
}

/** «только что», «5 минут назад», «2 часа назад», «Вчера, 14:20», «17 октября» */
export function formatRelativeTime(iso: string, t: TFunction): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return t('calendar.justNow');
  if (minutes < 60) return t('calendar.minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 6) return t('calendar.hoursAgo', { count: hours });
  if (isSameDay(date, new Date())) return formatTime(date);
  return formatDateTime(date, t);
}

/** Короткая метка для списка чатов: время сегодня, иначе «17 окт». */
export function formatChatTimestamp(iso: string, t: TFunction): string {
  const date = new Date(iso);
  if (isSameDay(date, new Date())) return formatTime(date);
  return `${date.getDate()} ${monthShort(date, t)}`;
}

export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
