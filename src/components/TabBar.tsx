import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

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

/** Floating glass tab bar with a dark active capsule (Gravl). */
export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const { t } = useT();
  const { tabBarBottom, frameWidth } = useLayout();
  const width = Math.min(frameWidth - layout.tabBarInset * 2, 420);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <BottomFade height={tabBarBottom + layout.tabBarHeight + 28} />
      <ActiveWorkoutBar bottom={tabBarBottom + layout.tabBarHeight + 10} width={width} />
      <View style={[styles.wrap, { bottom: tabBarBottom, width }]} accessibilityRole="tablist">
        {Platform.OS === 'android' ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBar }]} />
        ) : (
          <>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBarGlass }]} />
          </>
        )}

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
                <Glyph size={24} color={colors.tabLabel} weight={active ? 'fill' : 'regular'} />
                <Text style={styles.label} numberOfLines={1}>
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

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignSelf: 'center',
    height: layout.tabBarHeight,
    borderRadius: radius.pill,
    overflow: 'hidden',
    flexDirection: 'row',
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  item: { flex: 1 },
  capsule: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: radius.pill },
  capsuleActive: { backgroundColor: colors.tabActive },
  label: { ...type.tab, color: colors.tabLabel },
});
