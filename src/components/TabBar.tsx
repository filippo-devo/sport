import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useT, type TKey } from '../i18n';
import { colors, fonts, layout, radius } from '../theme/tokens';
import { ActiveWorkoutBar } from './ActiveWorkoutBar';
import { BarbellIcon, ChartLineUpIcon, ForkKnifeIcon, SunIcon, UserIcon, type Icon } from './icons';
import { useLayout } from './ui/layout';

// Route name → label and icon. Order follows the Tabs layout.
// `fill` is the selected look; ChartLineUp's fill variant is a solid tile, so it uses `bold` instead.
const TABS: Record<string, { label: TKey; icon: Icon; activeWeight?: 'fill' | 'bold' }> = {
  index: { label: 'tabs.today', icon: SunIcon },
  train: { label: 'tabs.train', icon: BarbellIcon },
  food: { label: 'tabs.food', icon: ForkKnifeIcon },
  progress: { label: 'tabs.progress', icon: ChartLineUpIcon, activeWeight: 'bold' },
  profile: { label: 'tabs.profile', icon: UserIcon },
};

const ICON = 27;

// iOS 26+ renders Apple's own Liquid Glass material; everywhere else the bar is
// approximated with a light blur, a thin tint and a hairline specular rim.
const NATIVE_GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

/**
 * Floating Liquid Glass tab bar (iOS 26 style). No fade behind it: content scrolls
 * under the glass and shows through, which is what makes it read as glass.
 */
export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const { t } = useT();
  const { tabBarBottom, frameWidth } = useLayout();
  const width = Math.min(frameWidth - layout.tabBarInset * 2, 400);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <ActiveWorkoutBar bottom={tabBarBottom + layout.tabBarHeight + 10} width={width} />
      <View style={[styles.wrap, { bottom: tabBarBottom, width }]} accessibilityRole="tablist">
        <GlassBackground />

        {state.routes.map((route, i) => {
          const tab = TABS[route.name];
          if (!tab) return null;
          const active = i === state.index;
          const Glyph = tab.icon;
          return (
            <Pressable
              key={route.key}
              style={styles.item}
              accessibilityRole="tab"
              accessibilityLabel={t(tab.label)}
              accessibilityState={{ selected: active }}
              onPress={() => {
                if (!active) navigateToTab(route.key);
              }}
            >
              {({ pressed }) => (
                <View style={[styles.capsule, active && styles.capsuleActive, pressed && !active && styles.capsulePressed]}>
                  <Glyph size={ICON} color={colors.tabLabel} weight={active ? (tab.activeWeight ?? 'fill') : 'regular'} />
                  <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
                    {t(tab.label)}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function GlassBackground() {
  if (NATIVE_GLASS) {
    return <GlassView glassEffectStyle="regular" colorScheme="dark" isInteractive style={StyleSheet.absoluteFill} />;
  }
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Platform.OS === 'android' ? (
        // expo-blur on Android needs a BlurTargetView around the screen content; a denser tint stands in.
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBarGlassSolid }]} />
      ) : (
        <BlurView intensity={40} tint="systemChromeMaterialDark" style={StyleSheet.absoluteFill} />
      )}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBarGlass }]} />
      {/* Faint sheen on the upper edge only. */}
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.08} />
            <Stop offset="0.35" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#sheen)" />
      </Svg>
      <View style={styles.rim} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignSelf: 'center',
    height: layout.tabBarHeight,
    borderRadius: radius.pill,
    overflow: 'hidden',
    flexDirection: 'row',
    padding: 5,
    ...(NATIVE_GLASS ? null : { boxShadow: '0 10px 30px rgba(0,0,0,0.30)' }),
  },
  // Hairline rim, a touch brighter on top where the light catches the glass.
  rim: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    borderTopColor: 'rgba(255,255,255,0.24)',
  },
  item: { flex: 1 },
  capsule: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: radius.pill },
  capsuleActive: { backgroundColor: colors.tabActive },
  capsulePressed: { backgroundColor: 'rgba(255,255,255,0.05)' },
  label: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 15, color: colors.tabLabel },
  labelActive: { fontFamily: fonts.bold },
});
