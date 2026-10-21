import { palette } from './tokens';

export type ColorScheme = 'light' | 'dark';

/** Семантические цвета. Компоненты используют только их, а не palette напрямую. */
export interface ThemeColors {
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;
  surfacePressed: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  textOnGold: string;
  gold: string;
  goldPressed: string;
  goldSoft: string;
  goldText: string;
  goldBorder: string;
  accent: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;
  overlay: string;
  scrim: string;
  glass: string;
  glassOnImage: string;
  /** Тонкая обводка стеклянных элементов поверх фото */
  glassBorder: string;
  onImageMuted: string;
  skeleton: string;
  skeletonHighlight: string;
  tabBar: string;
  tabBarBorder: string;
  tabInactive: string;
  inputBackground: string;
  inputBorder: string;
  inputBorderFocus: string;
  placeholder: string;
  chip: string;
  chipSelected: string;
  chipText: string;
  chipTextSelected: string;
  markerBackground: string;
  markerText: string;
  markerSelected: string;
  markerSelectedText: string;
  bubbleOwn: string;
  bubbleOwnText: string;
  bubbleOther: string;
  bubbleOtherText: string;
  online: string;
  /** Серии графиков: взнос / основной долг / проценты и т.п. */
  chart1: string;
  chart2: string;
  chart3: string;
  shadow: string;
  white: string;
  black: string;
  transparent: string;
}

export const darkColors: ThemeColors = {
  background: palette.ink[900],
  backgroundAlt: palette.ink[950],
  surface: palette.ink[800],
  surfaceElevated: palette.ink[750],
  surfaceMuted: palette.ink[850],
  surfacePressed: palette.ink[700],
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',
  text: palette.white,
  textSecondary: '#A9AEB7',
  textTertiary: '#6E7581',
  textInverse: palette.ink[900],
  textOnGold: palette.ink[950],
  gold: palette.gold[500],
  goldPressed: palette.gold[600],
  goldSoft: 'rgba(188,163,127,0.14)',
  goldText: palette.gold[400],
  goldBorder: 'rgba(188,163,127,0.38)',
  accent: palette.deepBlue[700],
  accentSoft: 'rgba(26,42,58,0.6)',
  success: palette.success,
  successSoft: 'rgba(61,190,132,0.16)',
  warning: palette.warning,
  warningSoft: 'rgba(240,176,63,0.16)',
  danger: palette.danger,
  dangerSoft: 'rgba(239,83,80,0.16)',
  info: palette.info,
  infoSoft: 'rgba(91,141,239,0.16)',
  overlay: 'rgba(0,0,0,0.55)',
  scrim: 'rgba(7,8,10,0.72)',
  glass: 'rgba(16,18,22,0.72)',
  glassOnImage: 'rgba(11,12,15,0.55)',
  glassBorder: 'rgba(255,255,255,0.18)',
  onImageMuted: 'rgba(255,255,255,0.55)',
  skeleton: palette.ink[750],
  skeletonHighlight: palette.ink[700],
  tabBar: 'rgba(11,12,15,0.94)',
  tabBarBorder: 'rgba(255,255,255,0.06)',
  tabInactive: '#7C838F',
  inputBackground: palette.ink[850],
  inputBorder: 'rgba(255,255,255,0.10)',
  inputBorderFocus: palette.gold[500],
  placeholder: '#666D78',
  chip: palette.ink[800],
  chipSelected: palette.gold[500],
  chipText: '#C9CDD3',
  chipTextSelected: palette.ink[950],
  markerBackground: palette.ink[900],
  markerText: palette.white,
  markerSelected: palette.gold[500],
  markerSelectedText: palette.ink[950],
  bubbleOwn: palette.gold[500],
  bubbleOwnText: palette.ink[950],
  bubbleOther: palette.ink[750],
  bubbleOtherText: palette.white,
  online: palette.success,
  chart1: palette.gold[500],
  chart2: palette.gold[200],
  chart3: '#5B6B82',
  shadow: palette.black,
  white: palette.white,
  black: palette.black,
  transparent: palette.transparent,
};

export const lightColors: ThemeColors = {
  background: palette.ivory[100],
  backgroundAlt: palette.ivory[50],
  surface: palette.white,
  surfaceElevated: palette.white,
  surfaceMuted: palette.ivory[200],
  surfacePressed: palette.ivory[300],
  border: 'rgba(11,12,15,0.08)',
  borderStrong: 'rgba(11,12,15,0.16)',
  text: palette.ink[900],
  textSecondary: '#5B606A',
  textTertiary: '#8C919A',
  textInverse: palette.white,
  textOnGold: palette.ink[950],
  gold: palette.gold[500],
  goldPressed: palette.gold[600],
  goldSoft: 'rgba(188,163,127,0.16)',
  goldText: palette.gold[700],
  goldBorder: 'rgba(134,112,78,0.35)',
  accent: palette.deepBlue[700],
  accentSoft: 'rgba(26,42,58,0.08)',
  success: '#22A06B',
  successSoft: 'rgba(34,160,107,0.12)',
  warning: '#C98A12',
  warningSoft: 'rgba(201,138,18,0.12)',
  danger: '#D93B38',
  dangerSoft: 'rgba(217,59,56,0.1)',
  info: '#3D6FD6',
  infoSoft: 'rgba(61,111,214,0.1)',
  overlay: 'rgba(11,12,15,0.4)',
  scrim: 'rgba(11,12,15,0.5)',
  glass: 'rgba(255,255,255,0.78)',
  glassOnImage: 'rgba(11,12,15,0.5)',
  glassBorder: 'rgba(255,255,255,0.22)',
  onImageMuted: 'rgba(255,255,255,0.55)',
  skeleton: palette.ivory[200],
  skeletonHighlight: palette.ivory[50],
  tabBar: 'rgba(255,255,255,0.96)',
  tabBarBorder: 'rgba(11,12,15,0.06)',
  tabInactive: '#8C919A',
  inputBackground: palette.white,
  inputBorder: 'rgba(11,12,15,0.12)',
  inputBorderFocus: palette.gold[600],
  placeholder: '#A1A5AD',
  chip: palette.white,
  chipSelected: palette.ink[900],
  chipText: palette.ink[700],
  chipTextSelected: palette.white,
  markerBackground: palette.white,
  markerText: palette.ink[900],
  markerSelected: palette.ink[900],
  markerSelectedText: palette.white,
  bubbleOwn: palette.ink[900],
  bubbleOwnText: palette.white,
  bubbleOther: palette.white,
  bubbleOtherText: palette.ink[900],
  online: '#22A06B',
  chart1: palette.gold[600],
  chart2: palette.gold[300],
  chart3: palette.deepBlue[700],
  shadow: palette.black,
  white: palette.white,
  black: palette.black,
  transparent: palette.transparent,
};

/** Градиенты (кортежи из минимум двух цветов — требование expo-linear-gradient). */
export const gradients = {
  goldMetal: [palette.metal.highlight, palette.metal.mid, palette.metal.shadow] as const,
  goldSoft: [palette.gold[300], palette.gold[500]] as const,
  heroOverlay: ['rgba(7,8,10,0.25)', 'rgba(7,8,10,0.45)', 'rgba(7,8,10,0.96)'] as const,
  /** В светлой теме фото тоже затемняется книзу: текст hero белый, а контент «наезжает» карточкой. */
  heroOverlayLight: ['rgba(7,8,10,0.18)', 'rgba(7,8,10,0.38)', 'rgba(7,8,10,0.86)'] as const,
  cardBottom: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.72)'] as const,
  cardTop: ['rgba(0,0,0,0.42)', 'rgba(0,0,0,0)'] as const,
  ink: [palette.ink[750], palette.ink[900]] as const,
  deepBlue: [palette.deepBlue[700], palette.deepBlue[900]] as const,
  /** Затемнение под плавающими кнопками галереи */
  galleryTop: ['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)'] as const,
} as const;

/** Позиции цветовых остановок для градиентов с тремя цветами. */
export const gradientStops = {
  hero: [0, 0.55, 1] as const,
} as const;

export const colorsByScheme: Record<ColorScheme, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
};
