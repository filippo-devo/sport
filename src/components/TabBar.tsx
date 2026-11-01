import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useT, type TKey } from '../i18n';
import { colors, layout, radius, type } from '../theme/tokens';
import { ActiveWorkoutBar } from './ActiveWorkoutBar';
import { BarbellIcon, BooksIcon, ChartLineUpIcon, ForkKnifeIcon, HouseSimpleIcon, type Icon } from './icons';
import { BottomFade, useLayout } from './ui/layout';

// Route name → label and icon. Order follows the Tabs layout.
const TABS: Record<string, { label: TKey; icon: Icon }> = {
  index: { label: 'tabs.today', icon: HouseSimpleIcon },
  train: { label: 'tabs.train', icon: BarbellIcon },
  progress: { label: 'tabs.progress', icon: ChartLineUpIcon },
  food: { label: 'tabs.food', icon: ForkKnifeIcon },
  library: { label: 'tabs.library', icon: BooksIcon },
};

// iOS 26+ renders Apple's own Liquid Glass material; everywhere else the bar is
// approximated with a blur, a translucent tint and a specular top edge.
const NATIVE_GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

/** Floating Liquid Glass tab bar (iOS 26 style): glass capsule, lighter capsule on the selected tab. */
export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const { t } = useT();
  const { tabBarBottom, frameWidth } = useLayout();
  const width = Math.min(frameWidth - layout.tabBarInset * 2, 420);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <BottomFade height={tabBarBottom + layout.tabBarHeight + 28} />
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
              <View style={[styles.capsule, active && styles.capsuleActive]}>
                <Glyph size={24} color={active ? colors.accent : colors.tabLabel} weight={active ? 'fill' : 'regular'} />
                <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
                  {t(tab.label)}
                </Text>
              </View>
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
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
      )}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBarGlass }]} />
      {/* Specular sheen: light catches the top of the glass and fades out by mid-height. */}
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.16} />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.02} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.05} />
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
    padding: 4,
    ...(NATIVE_GLASS ? null : { boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }),
  },
  // Bright upper rim, dimmer lower rim: how Liquid Glass edges catch light.
  rim: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.28)',
    borderLeftColor: 'rgba(255,255,255,0.14)',
    borderRightColor: 'rgba(255,255,255,0.14)',
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  item: { flex: 1 },
  capsule: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: radius.pill },
  capsuleActive: { backgroundColor: colors.tabActive },
  label: { ...type.tab, color: colors.tabLabel },
  labelActive: { color: colors.accent },
});
