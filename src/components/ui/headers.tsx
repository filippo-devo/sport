import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useT } from '../../i18n';
import { colors, layout, space, type } from '../../theme/tokens';
import { CaretLeftIcon } from '../icons';
import { IconButton } from './controls';
import { useLayout } from './layout';

/** Large title header for tab screens: eyebrow, title and an optional right-hand control. */
export function TabHeader({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  return (
    <View style={styles.tabHeader}>
      <View style={{ flex: 1, minWidth: 0 }}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

/** Compact bar for pushed screens: back control, centred title, optional right control. */
export function NavBar({ title, right, onBack, left }: { title?: string; right?: ReactNode; onBack?: () => void; left?: ReactNode }) {
  const t = useT();
  const { insets, gutter } = useLayout();
  return (
    <View style={[styles.nav, { paddingTop: insets.top + space.xs, paddingHorizontal: gutter }]}>
      <View style={styles.navSide}>
        {left ?? (
          <IconButton icon={CaretLeftIcon} label={t.t('common.back')} onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))} />
        )}
      </View>
      <Text style={styles.navTitle} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      <View style={[styles.navSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  eyebrow: { ...type.body, color: colors.textSecondary },
  title: { ...type.display, color: colors.textPrimary, marginTop: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  nav: { flexDirection: 'row', alignItems: 'center', minHeight: layout.navBar, gap: space.sm, paddingBottom: space.sm },
  navSide: { minWidth: 44, flexDirection: 'row', alignItems: 'center' },
  navTitle: { ...type.navTitle, color: colors.textPrimary, flex: 1, textAlign: 'center' },
});
