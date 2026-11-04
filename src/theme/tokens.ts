/**
 * Design tokens shared across the app.
 *
 * Colors were sampled pixel-by-pixel from two Gravl reference screenshots
 * (design/reference/gravl-train-home.png, gravl-workout-detail.png, captured at
 * 1206×2622 = 402×874 pt @3x). Each value notes where it was measured.
 * Typography: Gravl's UI is set in Barlow (geometric grotesk, single-storey g,
 * squared-off rounds), loaded from @expo-google-fonts/barlow.
 */

export const palette = {
  // Brand colours set by Filip (2026-11-01): background #091017, accent #D2FE08,
  // stats #21C45C, text #FFFFFF / #AAB7C4. Surfaces keep Gravl's steps above the background.
  ink950: '#091017', // screen background
  ink900: '#0F1821', // flat cards: "6 new exercises", muscle tiles, "+"/"…" buttons
  ink850: '#131D27', // tile edges / raised surface
  ink800: '#141E28', // "Get started challenge" card fill
  ink700: '#26303A', // circular glass controls (back, more, filter), "Gym Profile" pill
  ink650: '#2B343D', // "Recovered" pill on the workout card
  ink600: '#353D46', // inactive week progress segment
  tabBar: '#26303A', // opaque bar surfaces (rest timer)

  white: '#FFFFFF', // primary text, tab labels/icons
  fog400: '#AAB7C4', // secondary text, meta rows, active progress segment

  volt: '#D2FE08', // brand accent: CTA, "NEXT WORKOUT" badge, "+" and "…" glyphs
  navy: '#091017', // text on volt (CTA label, badge label)
  // Status scale for recovery and stats. Green is the given #21C45C; yellow and red
  // share its saturation and weight so the three read as one set on the dark background.
  green: '#21C45C', // recovered / good
  yellow: '#F5B70A', // partly recovered / warning

  // Not in the Gravl references (it has no nutrition UI): chosen to sit with volt
  // on ink — warm/cool/neutral hues at similar lightness so no macro dominates.
  coral: '#FF7A66', // protein
  amber: '#F5C451', // carbs
  sky: '#6FB2FF', // fat
  red: '#EF4444', // not recovered, destructive actions
} as const;

export const colors = {
  bg: palette.ink950,
  surface: palette.ink900,
  surfaceRaised: palette.ink850,
  surfaceAccent: palette.ink800,
  control: palette.ink700,
  pill: palette.ink650,
  track: palette.ink600,

  textPrimary: palette.white,
  textSecondary: palette.fog400,
  textOnAccent: palette.navy,

  accent: palette.volt,
  success: palette.green,
  warning: palette.yellow,
  danger: palette.red,
  protein: palette.coral,
  carbs: palette.amber,
  fat: palette.sky,
  scrim: 'rgba(3,6,10,0.72)',

  hairline: 'rgba(255,255,255,0.08)',
  cardStroke: 'rgba(255,255,255,0.12)', // ≈ #3F4041 measured on the photo card edge
  accentStroke: 'rgba(210,254,8,0.55)', // challenge card outline (volt over ink)

  tabBar: palette.tabBar,
  tabBarGlass: 'rgba(70,80,92,0.42)', // Liquid Glass tint over the blur: soft grey glass, content shows through
  tabBarGlassSolid: 'rgba(22,30,38,0.72)', // Android: no live blur, so a denser tint
  tabActive: 'rgba(8,14,20,0.42)', // selected tab capsule: darker inset glass, white icon and label
  tabLabel: palette.white,
} as const;

export const fonts = {
  regular: 'Barlow_400Regular',
  medium: 'Barlow_500Medium',
  semibold: 'Barlow_600SemiBold',
  bold: 'Barlow_700Bold',
} as const;

// Sizes in pt, derived from the 402 pt-wide reference.
export const type = {
  display: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 34, letterSpacing: -0.2 },
  heroTitle: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 32, letterSpacing: -0.2 },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 21, lineHeight: 26 },
  navTitle: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
  itemTitle: { fontFamily: fonts.medium, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 20 },
  meta: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 20 },
  button: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
  badge: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.6 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  tab: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14 },
} as const;

export const space = {
  xxs: 4,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14, // list thumbnails, flat cards
  lg: 18, // challenge card
  xl: 24, // featured workout card
  pill: 999,
} as const;

export const layout = {
  gutter: 16, // 38 px @ 920-px render ≈ 16 pt
  maxContentWidth: 480, // keeps the phone layout intact on tablets / desktop web
  control: 44, // circular glass buttons (≈ 44 pt)
  tabBarHeight: 66, // floating glass capsule, inset ≈ 20 pt from screen edges
  navBar: 56,
  tabBarInset: 20,
  ctaHeight: 52,
} as const;

/** Status colour for a 0–100 score (recovery): green from 80, yellow from 50, red below. */
export function statusColor(value: number): string {
  if (value >= 80) return colors.success;
  if (value >= 50) return colors.warning;
  return colors.danger;
}
