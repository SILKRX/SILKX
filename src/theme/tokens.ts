/**
 * SILKX Design Tokens — единственный источник правды для отступов, радиусов,
 * типографики, размеров и анимаций. В компонентах запрещены «магические числа»:
 * любое значение берётся отсюда.
 *
 * Палитра выведена из логотипа: глубокий графит/чёрный фон + матовое «шёлковое» золото.
 */

export const palette = {
  ink: {
    950: '#07080A',
    900: '#0B0C0F',
    850: '#101216',
    800: '#15181D',
    750: '#1B1F25',
    700: '#232830',
    600: '#2E343D',
    500: '#3D444F',
    400: '#5A6270',
    300: '#8A919C',
    200: '#B9BEC6',
    100: '#E1E3E7',
    50: '#F2F3F5',
  },
  ivory: {
    50: '#FBFAF7',
    100: '#F6F4EF',
    200: '#EEEAE1',
    300: '#E2DCCF',
    400: '#CFC6B4',
  },
  gold: {
    50: '#FBF6EC',
    100: '#F4E9D2',
    200: '#EAD7AF',
    300: '#DCC28F',
    400: '#CDB088',
    500: '#BCA37F',
    600: '#A38A63',
    700: '#86704E',
    800: '#665539',
    900: '#463A27',
  },
  metal: {
    highlight: '#ECD8A6',
    mid: '#C9A86A',
    shadow: '#8F6C3D',
  },
  deepBlue: {
    900: '#0D1724',
    800: '#13202F',
    700: '#1A2A3A',
  },
  white: '#FFFFFF',
  black: '#000000',
  success: '#3DBE84',
  warning: '#F0B03F',
  danger: '#EF5350',
  info: '#5B8DEF',
  transparent: 'transparent',
} as const;

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  giant: 56,
  colossal: 72,
} as const;

export const radii = {
  none: 0,
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  pill: 999,
} as const;

export const fontFamily = {
  display: 'CormorantGaramond_600SemiBold',
  displayBold: 'CormorantGaramond_700Bold',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const typography = {
  display: { fontFamily: fontFamily.displayBold, fontSize: 42, lineHeight: 46, letterSpacing: -0.4 },
  h1: { fontFamily: fontFamily.display, fontSize: 34, lineHeight: 40, letterSpacing: -0.2 },
  h2: { fontFamily: fontFamily.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.1 },
  h3: { fontFamily: fontFamily.semibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  title: { fontFamily: fontFamily.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.1 },
  body: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 22, letterSpacing: 0 },
  bodyStrong: { fontFamily: fontFamily.semibold, fontSize: 15, lineHeight: 22, letterSpacing: 0 },
  bodySm: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  caption: { fontFamily: fontFamily.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0.1 },
  overline: { fontFamily: fontFamily.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 1.4 },
  price: { fontFamily: fontFamily.bold, fontSize: 21, lineHeight: 26, letterSpacing: -0.3 },
  priceLg: { fontFamily: fontFamily.displayBold, fontSize: 34, lineHeight: 38, letterSpacing: -0.3 },
  button: { fontFamily: fontFamily.semibold, fontSize: 16, lineHeight: 20, letterSpacing: 0.1 },
  buttonSm: { fontFamily: fontFamily.semibold, fontSize: 14, lineHeight: 18, letterSpacing: 0.1 },
  tab: { fontFamily: fontFamily.medium, fontSize: 11, lineHeight: 13, letterSpacing: 0.1 },
  micro: { fontFamily: fontFamily.semibold, fontSize: 10, lineHeight: 12, letterSpacing: 0.2 },
} as const;

export type TypographyVariant = keyof typeof typography;

export const sizes = {
  icon: { xs: 14, sm: 16, md: 20, lg: 24, xl: 28, xxl: 34, hero: 48 },
  avatar: { xs: 28, sm: 36, md: 44, lg: 64, xl: 88 },
  touch: 44,
  hitSlop: 10,
  button: { sm: 38, md: 50, lg: 56 },
  iconButton: { sm: 36, md: 42, lg: 48 },
  input: 54,
  textArea: 132,
  tabBar: 62,
  header: 52,
  chip: 36,
  badgeDot: 8,
  statusDot: 10,
  handle: { width: 40, height: 4 },
  switch: { width: 50, height: 30, thumb: 24 },
  slider: { track: 4, thumb: 26, histogram: 56 },
  border: 1,
  borderStrong: 2,
  divider: 1,
  marker: { height: 30, arrow: 6, box: 120 },
  progress: 4,
  pagerDot: 6,
  pagerDotActive: 18,
  chatBubbleMax: 0.78,
  calendarDay: 58,
  timeSlot: 44,
  unitCell: 46,
  donut: 168,
  donutStroke: 22,
  photoTile: 104,
  chart: 120,
  logo: { sm: 22, md: 28, lg: 46, hero: 64 },
  mark: 40,
} as const;

/** Размеры экранных блоков, выраженные через доли экрана или фиксированные токены. */
export const layout = {
  screenPadding: spacing.lg,
  heroHeightRatio: 0.66,
  galleryHeightRatio: 0.58,
  cardImageAspect: 4 / 3,
  wideImageAspect: 16 / 10,
  carouselCardRatio: 0.74,
  complexCardRatio: 0.84,
  mapCardRatio: 0.84,
  mapCardHeight: 120,
  maxContentWidth: 680,
  stickyBarHeight: 84,
  sheetSnapPoints: ['60%', '92%'] as const,
  listEndThreshold: 0.4,
  photosMax: 15,
  descriptionPreviewLines: 4,
  textMaxWidth: 320,
  /** Доля высоты hero, после которой шапка главной начинает проявляться */
  heroFadeStartRatio: 0.45,
  /** Высота мини-карты на экране объекта */
  miniMapHeight: 180,
  /** Высота превью генплана и рендеров ЖК */
  masterPlanHeight: 220,
  /** Доля ширины экрана под карточку рендера в карусели ЖК */
  renderCardRatio: 0.72,
  /** Отступ карты от краёв при fitToCoordinates */
  mapEdgePadding: 64,
  /** Ширина колонки дня в календаре слотов продавца */
  slotDayWidth: 64,
  /** Максимум строк в превью сообщения/уведомления */
  previewLines: 2,
  /** Сколько дней показывать в ленте выбора даты */
  bookingDays: 14,
  /** Высота столбцов мини-графика статистики продавца */
  statsChartHeight: 96,
  /** Свайп вниз на эту дистанцию закрывает полноэкранную галерею */
  dismissDistance: 120,
  /** …или с такой скоростью (px/s) */
  dismissVelocity: 900,
  /** Порог активации вертикального свайпа (чтобы не мешать горизонтальному листанию) */
  swipeActivation: 12,
} as const;

export const motion = {
  instant: 90,
  fast: 160,
  base: 240,
  slow: 420,
  slower: 700,
  heroLoop: 24000,
  shimmer: 1200,
  toast: 3200,
  typing: 900,
  spring: { damping: 18, stiffness: 220, mass: 0.9 },
  springSoft: { damping: 22, stiffness: 140, mass: 1 },
  pressScale: 0.97,
  pressScaleSubtle: 0.985,
  heroZoom: 1.18,
  heroBaseZoom: 1.04,
  heroPan: 26,
  /** Скорость параллакса фона hero относительно скролла */
  heroParallax: 0.45,
  /** Максимальное приближение в галерее */
  zoomMax: 4,
  /** Насколько можно «пережать» фото меньше исходного во время щипка (потом пружинит обратно) */
  zoomUndershoot: 0.85,
  /** Приближение по двойному тапу */
  zoomDoubleTap: 2.5,
  /** Задержка поиска при вводе (debounce) */
  searchDebounce: 350,
  /** Анимация камеры карты */
  mapCamera: 450,
  /** Масштаб выбранного маркера на карте */
  markerSelectedScale: 1.12,
  /** Длительность подсветки элемента после действия */
  highlight: 1600,
  /** Частота событий скролла для анимаций (≈60 fps) */
  scrollThrottle: 16,
  /** Сколько маркер карты перерисовывается после смены состояния (Android snapshot) */
  markerSnapshot: 500,
} as const;

export const opacity = {
  disabled: 0.45,
  pressed: 0.82,
  muted: 0.64,
  overlay: 0.55,
  scrim: 0.62,
  glass: 0.72,
  faint: 0.25,
} as const;

/** Визуальные эффекты (blur, тени поверх фото). */
export const effects = {
  blur: 40,
  blurStrong: 70,
} as const;

export const zIndex = {
  base: 0,
  raised: 1,
  sticky: 10,
  header: 20,
  overlay: 30,
  toast: 50,
  max: 100,
} as const;

/** Тени. На Android используется elevation, на iOS — shadow*. */
export const elevation = {
  none: { shadowOpacity: 0, elevation: 0 },
  card: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },
  floating: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 10,
  },
  gold: {
    shadowColor: palette.gold[500],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 8,
  },
} as const;

export const tokens = {
  palette,
  spacing,
  radii,
  fontFamily,
  typography,
  sizes,
  layout,
  motion,
  opacity,
  zIndex,
  elevation,
  effects,
} as const;
