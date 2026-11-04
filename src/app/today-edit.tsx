import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { DotsSixVerticalIcon } from '../components/icons';
import { Card, Segmented } from '../components/ui/controls';
import { DragList } from '../components/ui/DragList';
import { NavBar } from '../components/ui/headers';
import { Screen } from '../components/ui/layout';
import { ConfirmSheet } from '../components/ui/sheets';
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


/** Edit Today (BitePal "Home layout" / WHOOP "Customize dashboard"): pick widgets, show, hide and order cards. */
export default function TodayEditScreen() {
  const { t } = useT();
  const layout = normalizeLayout(useStore((s) => s.todayLayout));
  const setLayout = useStore((s) => s.setTodayLayout);
  const every = useStore((s) => s.settings.photoEveryDays);
  const setSettings = useStore((s) => s.setSettings);
  const [dragging, setDragging] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const save = (patch: Partial<TodayLayout>) => setLayout({ ...layout, ...patch });

  const chosen = layout.widgets.map((id) => WIDGETS.find((w) => w.id === id)!);
  const rest = WIDGETS.filter((w) => !layout.widgets.includes(w.id));
  const full = layout.widgets.length >= MAX_WIDGETS;

  return (
    <Screen
      scrollProps={{ scrollEnabled: !dragging }}
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
        <DragList
          items={chosen}
          keyOf={(w) => w.id}
          rowHeight={ROW}
          onDragChange={setDragging}
          onReorder={(next) => save({ widgets: next.map((w) => w.id) })}
          renderRow={(w) => (
            <Row label={t(w.label)} on draggable first={w.id === chosen[0]?.id} onToggle={() => save({ widgets: layout.widgets.filter((x) => x !== w.id) })} />
          )}
        />
        {rest.map((w, i) => (
          <Row
            key={w.id}
            label={t(w.label)}
            on={false}
            first={chosen.length === 0 && i === 0}
            disabled={full}
            onToggle={() => save({ widgets: [...layout.widgets, w.id] })}
          />
        ))}
      </Card>

      <Text style={styles.group}>{t('todayEdit.cards').toUpperCase()}</Text>
      <Card style={styles.list}>
        <DragList
          items={layout.cards}
          keyOf={(c) => c.id}
          rowHeight={ROW}
          onDragChange={setDragging}
          onReorder={(cards) => save({ cards })}
          renderRow={(c) => (
            <Row
              label={t(CARD_LABEL[c.id])}
              on={c.on}
              draggable
              first={c.id === layout.cards[0].id}
              onToggle={(v) => save({ cards: layout.cards.map((x) => (x.id === c.id ? { ...x, on: v } : x)) })}
            />
          )}
        />
      </Card>
      <Text style={styles.footnote}>{t('todayEdit.dragHint')}</Text>

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

      <Pressable onPress={() => setConfirmReset(true)} style={styles.reset} accessibilityRole="button">
        <Text style={styles.resetText}>{t('todayEdit.reset')}</Text>
      </Pressable>

      <ConfirmSheet
        visible={confirmReset}
        title={t('todayEdit.resetTitle')}
        body={t('todayEdit.resetBody')}
        confirmLabel={t('todayEdit.resetConfirm')}
        destructive
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setLayout(DEFAULT_TODAY_LAYOUT);
          setSettings({ photoEveryDays: 7 });
          setConfirmReset(false);
        }}
      />
    </Screen>
  );
}

const ROW = 56;

function Row({ label, on, disabled, draggable, first, onToggle }: { label: string; on: boolean; disabled?: boolean; draggable?: boolean; first?: boolean; onToggle: (v: boolean) => void }) {
  return (
    <View style={[styles.row, !first && styles.rowBorder, disabled && { opacity: 0.45 }]}>
      <View style={[styles.handle, !draggable && { opacity: 0 }]}>
        <DotsSixVerticalIcon size={20} color={colors.textSecondary} weight="bold" />
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {/* Fixed box so the switch stays vertically centred in the row, also while the row is dragged. */}
      <View style={styles.control}>
        <Switch
          value={on}
          disabled={disabled}
          onValueChange={onToggle}
          trackColor={{ true: colors.accent, false: colors.track }}
          thumbColor={on ? colors.textOnAccent : colors.textPrimary}
          accessibilityLabel={label}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  done: { fontFamily: fonts.semibold, fontSize: 17, color: colors.accent },
  group: { ...type.badge, color: colors.textSecondary, marginTop: space.xl, marginBottom: space.sm, marginLeft: space.xxs },
  hint: { ...type.caption, color: colors.textSecondary, letterSpacing: 0 },
  list: { paddingVertical: 0, paddingHorizontal: 0, overflow: 'visible' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, height: ROW, paddingHorizontal: space.lg },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  handle: { width: 22, alignItems: 'center' },
  control: { width: 64, height: ROW, alignItems: 'flex-end', justifyContent: 'center' },
  label: { ...type.itemTitle, fontFamily: fonts.semibold, color: colors.textPrimary, flex: 1 },
  footnote: { ...type.caption, color: colors.textSecondary, marginTop: space.sm, marginLeft: space.xxs },
  reset: { alignSelf: 'center', marginTop: space.xxl, padding: space.sm },
  resetText: { ...type.body, color: colors.textSecondary },
});
