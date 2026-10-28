import Constants from 'expo-constants';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { CaretRightIcon, TrashIcon, UserIcon } from '../components/icons';
import { Button, Card, Divider, Segmented, SectionTitle } from '../components/ui/controls';
import { NavBar } from '../components/ui/headers';
import { Screen } from '../components/ui/layout';
import { ConfirmSheet, NumberSheet } from '../components/ui/sheets';
import type { Goals, Lang, Units } from '../data/types';
import { useT, type TKey } from '../i18n';
import { clock } from '../lib/date';
import { formatVolume, formatWeight, fromDisplayWeight, toDisplayWeight } from '../lib/units';
import { useStore } from '../store';
import { sessionVolume, weekStreak } from '../store/derived';
import { colors, fonts, space, type } from '../theme/tokens';

type GoalKey = keyof Goals;

const GOAL_ROWS: { key: GoalKey; label: TKey; unit: string; step: number; min: number; max: number }[] = [
  { key: 'kcal', label: 'profile.kcal', unit: 'kcal', step: 50, min: 1000, max: 6000 },
  { key: 'protein', label: 'macro.protein', unit: 'g', step: 5, min: 20, max: 400 },
  { key: 'carbs', label: 'macro.carbs', unit: 'g', step: 5, min: 20, max: 800 },
  { key: 'fat', label: 'macro.fat', unit: 'g', step: 5, min: 20, max: 300 },
  { key: 'targetWeight', label: 'profile.targetWeight', unit: '', step: 0.5, min: 30, max: 300 },
  { key: 'workoutsPerWeek', label: 'profile.workoutsPerWeek', unit: '', step: 1, min: 1, max: 7 },
  { key: 'steps', label: 'profile.steps', unit: '', step: 500, min: 1000, max: 40000 },
];

export default function ProfileScreen() {
  const { t, tn } = useT();
  const s = useStore();
  const [editing, setEditing] = useState<GoalKey | null>(null);
  const [confirm, setConfirm] = useState<'sample' | 'reset' | null>(null);
  const units = s.settings.units;

  const initials = s.settings.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  const totalVolume = s.sessions.reduce((n, x) => n + sessionVolume(x), 0);
  const macroKcal = s.goals.protein * 4 + s.goals.carbs * 4 + s.goals.fat * 9;

  const display = (key: GoalKey) => {
    const v = s.goals[key];
    if (key === 'targetWeight') return formatWeight(v, units);
    if (key === 'kcal') return `${v} kcal`;
    if (key === 'workoutsPerWeek') return String(v);
    if (key === 'steps') return v.toLocaleString();
    return `${v} g`;
  };
  const row = GOAL_ROWS.find((r) => r.key === editing);

  return (
    <Screen top={<NavBar title={t('profile.title')} />}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          {initials ? <Text style={styles.avatarText}>{initials}</Text> : <UserIcon size={38} color={colors.textOnAccent} weight="fill" />}
        </View>
        <TextInput
          value={s.settings.name}
          onChangeText={(name) => s.setSettings({ name })}
          placeholder={t('profile.namePlaceholder')}
          placeholderTextColor={colors.textSecondary}
          style={styles.name}
          accessibilityLabel={t('profile.name')}
          maxLength={40}
          returnKeyType="done"
        />
      </View>

      <Card style={styles.stats}>
        <Stat label={t('profile.workouts')} value={String(s.sessions.length)} />
        <Stat label={t('profile.totalVolume')} value={formatVolume(totalVolume, units)} />
        <Stat label={t('today.streak')} value={tn('unit.weeks', weekStreak(s.sessions))} />
      </Card>

      <SectionTitle style={styles.section} title={t('profile.goals')} />
      <Card style={styles.list}>
        {GOAL_ROWS.map((r, i) => (
          <View key={r.key}>
            {i > 0 && <Divider />}
            <Pressable
              style={styles.row}
              onPress={() => setEditing(r.key)}
              accessibilityRole="button"
              accessibilityLabel={t('profile.edit', { label: t(r.label) })}
            >
              <Text style={styles.rowLabel}>{t(r.label)}</Text>
              <Text style={styles.rowValue}>{display(r.key)}</Text>
              <CaretRightIcon size={14} color={colors.textSecondary} weight="bold" />
            </Pressable>
            {r.key === 'fat' && (
              <Text style={[styles.hint, Math.abs(macroKcal - s.goals.kcal) > 100 && { color: colors.carbs }]}>
                {t('profile.macroCheck', { n: macroKcal })}
              </Text>
            )}
          </View>
        ))}
      </Card>

      <SectionTitle style={styles.section} title={t('profile.settings')} />
      <Card style={styles.list}>
        <View style={styles.settingRow}>
          <Text style={styles.rowLabel}>{t('profile.language')}</Text>
          <View style={styles.control}>
            <Segmented<Lang>
              value={s.settings.lang}
              onChange={(lang) => s.setSettings({ lang })}
              options={[
                { value: 'en', label: 'English' },
                { value: 'pl', label: 'Polski' },
              ]}
            />
          </View>
        </View>
        <Divider />
        <View style={styles.settingRow}>
          <Text style={styles.rowLabel}>{t('profile.units')}</Text>
          <View style={styles.control}>
            <Segmented<Units>
              value={units}
              onChange={(u) => s.setSettings({ units: u })}
              options={[
                { value: 'kg', label: 'kg' },
                { value: 'lb', label: 'lb' },
              ]}
            />
          </View>
        </View>
        <Divider />
        <View style={styles.settingCol}>
          <Text style={styles.rowLabel}>{t('profile.restTimer')}</Text>
          <Segmented
            value={String(s.settings.restSec)}
            onChange={(v) => s.setSettings({ restSec: Number(v) })}
            options={['60', '90', '120', '180'].map((v) => ({ value: v, label: clock(Number(v)) }))}
          />
        </View>
        <Divider />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('profile.haptics')}</Text>
          <Switch
            value={s.settings.haptics}
            onValueChange={(haptics) => s.setSettings({ haptics })}
            trackColor={{ true: colors.accent, false: colors.track }}
            thumbColor={s.settings.haptics ? colors.textOnAccent : colors.textPrimary}
            accessibilityLabel={t('profile.haptics')}
          />
        </View>
      </Card>

      <SectionTitle style={styles.section} title={t('profile.data')} />
      {s.hasSampleData && <Text style={styles.note}>{t('profile.sampleNote')}</Text>}
      <View style={styles.dataButtons}>
        {s.hasSampleData && <Button label={t('profile.clearSample')} variant="secondary" onPress={() => setConfirm('sample')} />}
        <Button label={t('profile.reset')} variant="danger" icon={TrashIcon} onPress={() => setConfirm('reset')} />
      </View>
      <Text style={styles.version}>GameChanger · {t('profile.version', { v: Constants.expoConfig?.version ?? '1.0.0' })}</Text>

      {row && (
        <NumberSheet
          visible={!!editing}
          onClose={() => setEditing(null)}
          title={t(row.label)}
          value={row.key === 'targetWeight' ? toDisplayWeight(s.goals.targetWeight, units) : s.goals[row.key]}
          unit={row.key === 'targetWeight' ? units : row.unit}
          step={row.step}
          decimals={row.key === 'targetWeight' ? 1 : 0}
          min={row.key === 'targetWeight' ? toDisplayWeight(row.min, units) : row.min}
          max={row.key === 'targetWeight' ? toDisplayWeight(row.max, units) : row.max}
          onSave={(v) => s.setGoals({ [row.key]: row.key === 'targetWeight' ? Math.round(fromDisplayWeight(v, units) * 10) / 10 : v })}
        />
      )}

      <ConfirmSheet
        visible={confirm === 'sample'}
        title={t('profile.clearSample')}
        body={t('profile.clearSampleBody')}
        confirmLabel={t('common.delete')}
        destructive
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          s.clearSampleData();
          setConfirm(null);
        }}
      />
      <ConfirmSheet
        visible={confirm === 'reset'}
        title={t('profile.reset')}
        body={t('profile.resetBody')}
        confirmLabel={t('common.delete')}
        destructive
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          s.resetAll();
          setConfirm(null);
        }}
      />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.md, marginTop: space.sm },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.bold, fontSize: 30, color: colors.textOnAccent },
  name: { ...type.display, fontSize: 26, color: colors.textPrimary, textAlign: 'center', minWidth: 200, paddingVertical: 4 },
  stats: { flexDirection: 'row', marginTop: space.xl },
  stat: { flex: 1, gap: 2, minWidth: 0 },
  statLabel: { ...type.caption, color: colors.textSecondary },
  statValue: { fontFamily: fonts.bold, fontSize: 18, color: colors.textPrimary },
  section: { marginTop: space.xxl },
  list: { marginTop: space.md, paddingVertical: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52, paddingVertical: space.sm },
  rowLabel: { ...type.body, color: colors.textPrimary, flex: 1 },
  rowValue: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textPrimary },
  hint: { ...type.caption, color: colors.textSecondary, paddingBottom: space.md, marginTop: -space.xs },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  settingCol: { gap: space.md, paddingVertical: space.md },
  control: { width: 170 },
  note: { ...type.body, fontFamily: fonts.regular, color: colors.textSecondary, marginTop: space.sm, lineHeight: 21 },
  dataButtons: { gap: space.sm, marginTop: space.lg },
  version: { ...type.caption, color: colors.textSecondary, textAlign: 'center', marginTop: space.xxl },
});
