import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors, layout, space } from '../../theme/tokens';

/** Shared measurements: centred phone-width frame, gutter, safe-area-aware tab bar space. */
export function useLayout() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const frameWidth = Math.min(width, layout.maxContentWidth);
  const gutter = frameWidth < 360 ? 14 : layout.gutter;
  const tabBarBottom = Math.max(insets.bottom, 12);
  return {
    insets,
    frameWidth,
    gutter,
    contentWidth: frameWidth - gutter * 2,
    compact: frameWidth < 375,
    short: height < 700,
    tabBarBottom,
    /** Bottom padding that keeps content clear of the floating tab bar. */
    tabBarSpace: tabBarBottom + layout.tabBarHeight + space.xxl,
  };
}

type ScreenProps = {
  children: ReactNode;
  /** Screen sits inside the tab navigator (floating bar at the bottom). */
  tabBar?: boolean;
  /** Extra bottom space for a floating CTA. */
  bottomExtra?: number;
  /** Fixed content rendered above the scroll view (e.g. a nav bar). */
  top?: ReactNode;
  /** Absolute overlays (floating buttons, bars). */
  overlay?: ReactNode;
  scrollProps?: ScrollViewProps;
  /** Skip the top safe-area padding (when `top` already handles it). */
  noTopInset?: boolean;
};

export function Screen({ children, tabBar, bottomExtra = 0, top, overlay, scrollProps, noTopInset }: ScreenProps) {
  const { insets, frameWidth, gutter, tabBarSpace } = useLayout();
  const bottom = (tabBar ? tabBarSpace : Math.max(insets.bottom, 16) + space.xl) + bottomExtra;
  return (
    <View style={styles.screen}>
      <View style={[styles.frame, { width: frameWidth }]}>
        {top}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          {...scrollProps}
          contentContainerStyle={[
            { paddingTop: top || noTopInset ? space.sm : insets.top + space.md, paddingBottom: bottom, paddingHorizontal: gutter },
            scrollProps?.contentContainerStyle,
          ]}
        >
          {children}
        </ScrollView>
        {overlay}
      </View>
    </View>
  );
}

/** Fades content into the background beneath floating bottom controls. */
export function BottomFade({ height }: { height: number }) {
  return (
    <View pointerEvents="none" style={[styles.fade, { height }]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.bg} stopOpacity={0} />
            <Stop offset="0.5" stopColor={colors.bg} stopOpacity={0.85} />
            <Stop offset="1" stopColor={colors.bg} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#bottomFade)" />
      </Svg>
    </View>
  );
}

export function Gap({ size = space.xxl }: { size?: number }) {
  return <View style={{ height: size }} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  frame: { flex: 1 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
