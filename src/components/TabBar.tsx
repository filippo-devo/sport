import { BlurView } from 'expo-blur';
// Deep imports keep the other ~9k Phosphor icons out of the bundle.
import { BarbellIcon } from 'phosphor-react-native/src/icons/Barbell';
import { BooksIcon } from 'phosphor-react-native/src/icons/Books';
import { ChartLineUpIcon } from 'phosphor-react-native/src/icons/ChartLineUp';
import { ForkKnifeIcon } from 'phosphor-react-native/src/icons/ForkKnife';
import { UserIcon } from 'phosphor-react-native/src/icons/User';
import { type Icon } from 'phosphor-react-native';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { colors, layout, radius, type } from '../theme/tokens';

type Tab = { key: string; label: string; icon: Icon; enabled: boolean };

// Order is fixed: Train is the only screen that exists for now. The other
// four are rendered for layout only — no press handler, no route.
const TABS: Tab[] = [
  { key: 'train', label: 'Train', icon: BarbellIcon, enabled: true },
  { key: 'progress', label: 'Progress', icon: ChartLineUpIcon, enabled: false },
  { key: 'food', label: 'Food', icon: ForkKnifeIcon, enabled: false },
  { key: 'library', label: 'Library', icon: BooksIcon, enabled: false },
  { key: 'profile', label: 'Profile', icon: UserIcon, enabled: false },
];

type Props = { active: string; bottomInset: number; width: number };

export function TabBar({ active, bottomInset, width }: Props) {
  return (
    <View
      style={[styles.wrap, { bottom: Math.max(bottomInset, 12), width }]}
      accessibilityRole="tablist"
    >
      {Platform.OS === 'android' ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBar }]} />
      ) : (
        <>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBarGlass }]} />
        </>
      )}

      {TABS.map(({ key, label, icon: Glyph, enabled }) => {
        const isActive = key === active;
        return (
          <View
            key={key}
            style={styles.item}
            accessible
            accessibilityRole="tab"
            accessibilityLabel={enabled ? label : `${label}, unavailable`}
            accessibilityState={{ selected: isActive, disabled: !enabled }}
          >
            <View style={[styles.capsule, isActive && styles.capsuleActive]}>
              <Glyph size={25} color={colors.tabLabel} weight={isActive ? 'fill' : 'regular'} />
              <Text style={styles.label} numberOfLines={1}>
                {label}
              </Text>
            </View>
          </View>
        );
      })}
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
  capsule: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: radius.pill,
  },
  capsuleActive: { backgroundColor: colors.tabActive },
  label: { ...type.tab, color: colors.tabLabel },
});
