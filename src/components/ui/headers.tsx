import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useT } from '../../i18n';
import { useStore } from '../../store';
import { colors, fonts, layout, space, type } from '../../theme/tokens';
import { CaretLeftIcon, UserIcon } from '../icons';
import { IconButton, pressedStyle } from './controls';
import { useLayout } from './layout';

export function Avatar({ size = layout.control }: { size?: number }) {
  const t = useT();
  const name = useStore((s) => s.settings.name.trim());
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.t('common.profile')}
      onPress={() => router.push('/profile')}
      hitSlop={6}
      style={({ pressed }) => [styles.avatar, { width: size, height: size, borderRadius: size / 2 }, pressed && pressedStyle]}
    >
      {initials ? <Text style={styles.initials}>{initials}</Text> : <UserIcon size={20} color={colors.textPrimary} weight="fill" />}
    </Pressable>
  );
}

/** Large title header for tab screens: eyebrow, title and the profile avatar. */
export function TabHeader({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  return (
    <View style={styles.tabHeader}>
      <View style={{ flex: 1, minWidth: 0 }}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View style={styles.right}>
        {right}
        <Avatar />
      </View>
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
  avatar: {
    backgroundColor: colors.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textPrimary },
  tabHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  eyebrow: { ...type.body, color: colors.textSecondary },
  title: { ...type.display, color: colors.textPrimary, marginTop: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  nav: { flexDirection: 'row', alignItems: 'center', minHeight: layout.navBar, gap: space.sm, paddingBottom: space.sm },
  navSide: { minWidth: 44, flexDirection: 'row', alignItems: 'center' },
  navTitle: { ...type.navTitle, color: colors.textPrimary, flex: 1, textAlign: 'center' },
});
