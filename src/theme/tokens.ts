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
  ink950: '#0A0F16', // screen background (both screens)
  ink900: '#10171F', // flat cards: "6 new exercises", muscle tiles, "+"/"…" buttons
  ink850: '#141C25', // tile edges / raised surface
  ink800: '#151C23', // "Get started challenge" card fill
  ink700: '#282F37', // circular glass controls (back, more, filter), "Gym Profile" pill
  ink650: '#2D3239', // "Recovered" pill on the workout card
  ink600: '#373C42', // inactive week progress segment
  tabBar: '#2A323A', // floating tab bar (sampled over dark content)
  tabActive: '#141E29', // active tab capsule

  white: '#FFFFFF', // tab labels/icons
  fog100: '#EAEEF3', // primary text (titles, exercise names)
  fog400: '#ACB6C3', // secondary text, meta rows, active progress segment

  volt: '#DBFD52', // brand accent: CTA, "NEXT WORKOUT" badge, "+" and "…" glyphs
  navy: '#091634', // text on volt (CTA label, badge label)
  green: '#5EC269', // recovery %, recovery ring

  // Not in the Gravl references (it has no nutrition UI): chosen to sit with volt
  // on ink — warm/cool/neutral hues at similar lightness so no macro dominates.
  coral: '#FF7A66', // protein
  amber: '#F5C451', // carbs
  sky: '#6FB2FF', // fat
  red: '#FF5A5F', // destructive actions
} as const;

export const colors = {
  bg: palette.ink950,
  surface: palette.ink900,
  surfaceRaised: palette.ink850,
  surfaceAccent: palette.ink800,
  control: palette.ink700,
  pill: palette.ink650,
  track: palette.ink600,

  textPrimary: palette.fog100,
  textSecondary: palette.fog400,
  textOnAccent: palette.navy,

  accent: palette.volt,
  success: palette.green,
  danger: palette.red,
  protein: palette.coral,
  carbs: palette.amber,
  fat: palette.sky,
  scrim: 'rgba(3,6,10,0.72)',

  hairline: 'rgba(255,255,255,0.08)',
  cardStroke: 'rgba(255,255,255,0.12)', // ≈ #3F4041 measured on the photo card edge
  accentStroke: 'rgba(219,253,82,0.55)', // challenge card outline (volt over ink)

  tabBar: palette.tabBar,
  tabBarGlass: 'rgba(42,50,58,0.78)', // tabBar color, translucent over a blur
  tabActive: palette.tabActive,
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
  tabBarHeight: 62, // floating bar ≈ 60 pt, inset ≈ 21 pt from screen edges
  navBar: 56,
  tabBarInset: 20,
  ctaHeight: 52,
} as const;
