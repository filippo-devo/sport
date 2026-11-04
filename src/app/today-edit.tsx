import { router } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { ArrowDownIcon, ArrowUpIcon } from '../components/icons';
import { Card, Divider, Segmented } from '../components/ui/controls';
import { NavBar } from '../components/ui/headers';
import { Screen } from '../components/ui/layout';
import type { TodayCard, TodayLayout, TodayWidget } from '../data/types';
import { useT, type TKey } from '../i18n';
import { MAX_WIDGETS, normalizeLayout } from '../lib/today';
import { DEFAULT_TODAY_LAYOUT, useStore } from '../store';
import { colors, fonts, space, type } from '../theme/tokens';

const WIDGETS: { id: TodayWidget; label: TKey }[] = [
  { id: 'kcal', label: 'today.calories' },
  { id: 'workouts', label: 'today.workouts' },
  { id: 'steps', label: 'today.steps' },
  { id: 'water', label: 'today.water' },
  { id: 'protein', label: 'today.protein' },
  { id: 'weight', label: 'today.weight' },
];

const CARD_LABEL: Record<TodayCard, TKey> = {
  workout: 'today.workout',
  nutrition: 'today.nutrition',
  water: 'water.title',
  supplements: 'supp.title',
  unlock: 'unlock.title',
  photo: 'photo.titleProgress',
  quick: 'today.quick',
};

const move = <T,>(list: T[], i: number, d: number) => {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
};

/** Edit Today (BitePal "Home layout" / WHOOP "Customize dashboard"): pick widgets, show, hide and order cards. */
export default function TodayEditScreen() {
  const { t } = useT();
  const layout = normalizeLayout(useStore((s) => s.todayLayout));
  const setLayout = useStore((s) => s.setTodayLayout);
  const every = useStore((s) => s.settings.photoEveryDays);
  const setSettings = useStore((s) => s.setSettings);
  const save = (patch: Partial<TodayLayout>) => setLayout({ ...layout, ...patch });

  // Chosen widgets first, in their order, then the rest.
  const widgetRows = [...layout.widgets.map((id) => WIDGETS.find((w) => w.id === id)!), ...WIDGETS.filter((w) => !layout.widgets.includes(w.id))];
  const full = layout.widgets.length >= MAX_WIDGETS;

  return (
    <Screen
      top={
        <NavBar
          title={t('today.edit')}
          right={
            <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={8} accessibilityRole="button">
              <Text style={styles.done}>{t('common.done')}</Text>
            </Pressable>
          }
        />
      }
    >
      <Text style={styles.group}>
        {t('todayEdit.widgets').toUpperCase()} <Text style={styles.hint}>· {t('todayEdit.widgetsHint')}</Text>
      </Text>
      <Card style={styles.list}>
        {widgetRows.map((w, i) => {
          const on = layout.widgets.includes(w.id);
          const idx = layout.widgets.indexOf(w.id);
          return (
            <View key={w.id}>
              {i > 0 && <Divider />}
              <Row
                label={t(w.label)}
                on={on}
                disabled={!on && full}
                onToggle={(v) => save({ widgets: v ? [...layout.widgets, w.id] : layout.widgets.filter((x) => x !== w.id) })}
                onUp={on && idx > 0 ? () => save({ widgets: move(layout.widgets, idx, -1) }) : undefined}
                onDown={on && idx < layout.widgets.length - 1 ? () => save({ widgets: move(layout.widgets, idx, 1) }) : undefined}
              />
            </View>
          );
        })}
      </Card>

      <Text style={styles.group}>{t('todayEdit.cards').toUpperCase()}</Text>
      <Card style={styles.list}>
        {layout.cards.map((c, i) => (
          <View key={c.id}>
            {i > 0 && <Divider />}
            <Row
              label={t(CARD_LABEL[c.id])}
              on={c.on}
              onToggle={(v) => save({ cards: layout.cards.map((x) => (x.id === c.id ? { ...x, on: v } : x)) })}
              onUp={i > 0 ? () => save({ cards: move(layout.cards, i, -1) }) : undefined}
              onDown={i < layout.cards.length - 1 ? () => save({ cards: move(layout.cards, i, 1) }) : undefined}
            />
          </View>
        ))}
      </Card>

      <Text style={styles.group}>{t('photo.every').toUpperCase()}</Text>
      <Segmented
        value={String(every)}
        onChange={(v) => setSettings({ photoEveryDays: Number(v) })}
        options={[
          { value: '7', label: t('photo.every7') },
          { value: '14', label: t('photo.every14') },
          { value: '30', label: t('photo.every30') },
        ]}
      />

      <Pressable onPress={() => setLayout(DEFAULT_TODAY_LAYOUT)} style={styles.reset} accessibilityRole="button">
        <Text style={styles.resetText}>{t('todayEdit.reset')}</Text>
      </Pressable>
    </Screen>
  );
}

function Row({ label, on, disabled, onToggle, onUp, onDown }: { label: string; on: boolean; disabled?: boolean; onToggle: (v: boolean) => void; onUp?: () => void; onDown?: () => void }) {
  const { t } = useT();
  return (
    <View style={[styles.row, disabled && { opacity: 0.45 }]}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Arrow icon="up" onPress={onUp} label={t('todayEdit.moveUp', { name: label })} />
      <Arrow icon="down" onPress={onDown} label={t('todayEdit.moveDown', { name: label })} />
      <Switch
        value={on}
        disabled={disabled}
        onValueChange={onToggle}
        trackColor={{ true: colors.accent, false: colors.track }}
        thumbColor={on ? colors.textOnAccent : colors.textPrimary}
        accessibilityLabel={label}
      />
    </View>
  );
}

function Arrow({ icon, onPress, label }: { icon: 'up' | 'down'; onPress?: () => void; label: string }) {
  const Glyph = icon === 'up' ? ArrowUpIcon : ArrowDownIcon;
  return (
    <Pressable onPress={onPress} disabled={!onPress} hitSlop={6} style={[styles.arrow, !onPress && { opacity: 0.2 }]} accessibilityRole="button" accessibilityLabel={label}>
      <Glyph size={16} color={colors.textSecondary} weight="bold" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  done: { fontFamily: fonts.semibold, fontSize: 17, color: colors.accent },
  group: { ...type.badge, color: colors.textSecondary, marginTop: space.xl, marginBottom: space.sm, marginLeft: space.xxs },
  hint: { ...type.caption, color: colors.textSecondary, letterSpacing: 0 },
  list: { paddingVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 56 },
  label: { ...type.itemTitle, fontFamily: fonts.semibold, color: colors.textPrimary, flex: 1 },
  arrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.control, alignItems: 'center', justifyContent: 'center' },
  reset: { alignSelf: 'center', marginTop: space.xxl, padding: space.sm },
  resetText: { ...type.body, color: colors.textSecondary },
});
