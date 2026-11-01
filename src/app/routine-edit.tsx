import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ArrowDownIcon, ArrowUpIcon, MinusIcon, PlusIcon, TrashIcon, XIcon } from '../components/icons';
import { Button, Card, IconButton, Segmented } from '../components/ui/controls';
import { NavBar } from '../components/ui/headers';
import { BottomFade, Screen, useLayout } from '../components/ui/layout';
import { ConfirmSheet } from '../components/ui/sheets';
import { EXERCISE_BY_ID } from '../data/exercises';
import type { RoutineItem } from '../data/types';
import { useT } from '../i18n';
import { clock } from '../lib/date';
import { formatNumber, fromDisplayWeight, roundWeight, toDisplayWeight } from '../lib/units';
import { useStore } from '../store';
import { isCustom } from '../store/derived';
import { useRoutine } from '../store/plans';
import { useUi } from '../store/ui';
import { colors, fonts, layout, radius, space, type } from '../theme/tokens';

const RESTS = [60, 90, 120, 180];

/**
 * Create or edit one of the user's workouts (WHOOP / Fitbit custom workout pattern):
 * name, then per exercise sets, target reps or seconds, planned weight and rest.
 * `copy=<id>` starts from a copy of any routine, including built-in ones.
 */
export default function RoutineEditScreen() {
  const { id, copy } = useLocalSearchParams<{ id?: string; copy?: string }>();
  const { t, L } = useT();
  const { insets, gutter } = useLayout();
  const units = useStore((s) => s.settings.units);
  const saveRoutine = useStore((s) => s.saveRoutine);
  const deleteRoutine = useStore((s) => s.deleteRoutine);
  const existing = useRoutine(id);
  const source = useRoutine(copy);
  const editing = existing && isCustom(existing) ? existing : undefined;
  const items = useUi((s) => s.routineDraft);
  const setItems = useUi((s) => s.setRoutineDraft);
  const [name, setName] = useState(() =>
    editing ? L(editing.name) : source ? t('routineEdit.copyName', { name: L(source.name) }) : '',
  );
  const [confirm, setConfirm] = useState(false);

  // Load the draft once per opened routine; the picker appends to it while this screen stays mounted.
  useEffect(() => {
    setItems((editing ?? source)?.items.map((i) => ({ ...i })) ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, copy]);

  const patch = (i: number, p: Partial<RoutineItem>) => setItems(items.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  };

  const valid = name.trim().length > 0 && items.length > 0;
  const save = () => {
    const n = name.trim();
    const rid = saveRoutine({ id: editing?.id ?? '', name: { en: n, pl: n }, items, source: editing?.source ?? 'user' });
    setItems([]);
    router.replace(`/routine/${rid}`);
  };
  const bottom = Math.max(insets.bottom, space.lg);

  return (
    <Screen
      top={
        <NavBar
          title={editing ? t('routineEdit.edit') : t('routineEdit.new')}
          left={<IconButton icon={XIcon} label={t('common.close')} onPress={() => router.back()} />}
        />
      }
      bottomExtra={layout.ctaHeight + space.lg}
      overlay={
        <>
          <BottomFade height={bottom + layout.ctaHeight + 40} />
          <View style={[styles.cta, { bottom, left: gutter, right: gutter }]}>
            <Button label={t('common.save')} disabled={!valid} onPress={save} />
          </View>
        </>
      }
    >
      <Text style={styles.label}>{t('routineEdit.name')}</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t('routineEdit.namePlaceholder')}
        placeholderTextColor={colors.textSecondary}
        style={styles.nameInput}
        maxLength={48}
        accessibilityLabel={t('routineEdit.name')}
      />

      <View style={styles.list}>
        {items.length === 0 && <Text style={styles.empty}>{t('routineEdit.empty')}</Text>}
        {items.map((item, i) => {
          const ex = EXERCISE_BY_ID[item.exerciseId];
          if (!ex) return null;
          const timed = ex.tracking === 'time';
          return (
            <Card key={`${item.exerciseId}-${i}`} style={styles.card}>
              <View style={styles.cardHead}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.kicker} numberOfLines={1}>
                    {t(`muscle.${ex.muscle}`)} · {t(`equipment.${ex.equipment}`)}
                  </Text>
                  <Text style={styles.exName} numberOfLines={2}>
                    {L(ex.name)}
                  </Text>
                </View>
                <IconButton icon={ArrowUpIcon} label={t('routineEdit.moveUp')} size={34} tone="plain" onPress={() => move(i, -1)} />
                <IconButton icon={ArrowDownIcon} label={t('routineEdit.moveDown')} size={34} tone="plain" onPress={() => move(i, 1)} />
                <IconButton
                  icon={TrashIcon}
                  label={t('routineEdit.remove')}
                  size={34}
                  tone="plain"
                  iconColor={colors.danger}
                  onPress={() => setItems(items.filter((_, j) => j !== i))}
                />
              </View>

              <View style={styles.fields}>
                <Field label={t('routineEdit.sets')}>
                  <View style={styles.stepper}>
                    <IconButton icon={MinusIcon} label="−" size={30} onPress={() => patch(i, { sets: Math.max(1, item.sets - 1) })} />
                    <Text style={styles.stepValue}>{item.sets}</Text>
                    <IconButton icon={PlusIcon} label="+" size={30} onPress={() => patch(i, { sets: Math.min(12, item.sets + 1) })} />
                  </View>
                </Field>
                <Field label={timed ? t('routineEdit.seconds') : t('routineEdit.reps')}>
                  <TextInput
                    value={item.target}
                    onChangeText={(v) => patch(i, { target: v.replace(/[^0-9–\-]/g, '').replace('-', '–') })}
                    keyboardType="numbers-and-punctuation"
                    style={styles.field}
                    maxLength={7}
                    accessibilityLabel={timed ? t('routineEdit.seconds') : t('routineEdit.reps')}
                  />
                </Field>
                {ex.tracking === 'weightReps' && (
                  <Field label={t('routineEdit.weight', { unit: units })}>
                    <WeightInput kg={item.weight} units={units} onChange={(kg) => patch(i, { weight: kg })} label={t('routineEdit.weight', { unit: units })} />
                  </Field>
                )}
              </View>

              <Text style={styles.fieldLabel}>{t('routineEdit.rest')}</Text>
              <Segmented
                value={String(RESTS.includes(item.restSec) ? item.restSec : 90)}
                onChange={(v) => patch(i, { restSec: Number(v) })}
                options={RESTS.map((r) => ({ value: String(r), label: clock(r) }))}
              />
            </Card>
          );
        })}

        <Pressable
          style={({ pressed }) => [styles.add, pressed && { opacity: 0.8 }]}
          onPress={() => router.push({ pathname: '/exercise-picker', params: { for: 'routine' } })}
          accessibilityRole="button"
        >
          <PlusIcon size={18} color={colors.accent} weight="bold" />
          <Text style={styles.addText}>{t('routineEdit.addExercise')}</Text>
        </Pressable>

        {editing && <Button label={t('routineEdit.delete')} variant="danger" icon={TrashIcon} onPress={() => setConfirm(true)} style={{ marginTop: space.lg }} />}
      </View>

      <ConfirmSheet
        visible={confirm}
        title={t('routineEdit.delete')}
        body={t('routineEdit.deleteBody')}
        confirmLabel={t('common.delete')}
        destructive
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          if (editing) deleteRoutine(editing.id);
          setItems([]);
          router.replace('/plans');
        }}
      />
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel} numberOfLines={1}>
        {label}
      </Text>
      {children}
    </View>
  );
}

/** Weight field in the user's unit; stores kilograms. Empty means "no planned weight". */
function WeightInput({ kg, units, onChange, label }: { kg?: number; units: 'kg' | 'lb'; onChange: (kg?: number) => void; label: string }) {
  const [text, setText] = useState(kg ? formatNumber(roundWeight(toDisplayWeight(kg, units), units)) : '');
  return (
    <TextInput
      value={text}
      onChangeText={(v) => {
        setText(v);
        const n = parseFloat(v.replace(',', '.'));
        onChange(Number.isFinite(n) && n > 0 ? Math.round(fromDisplayWeight(n, units) * 100) / 100 : undefined);
      }}
      keyboardType="decimal-pad"
      placeholder="—"
      placeholderTextColor={colors.textSecondary}
      style={styles.field}
      maxLength={6}
      accessibilityLabel={label}
    />
  );
}

const styles = StyleSheet.create({
  label: { ...type.caption, color: colors.textSecondary, marginTop: space.sm },
  nameInput: { ...type.heroTitle, color: colors.textPrimary, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardStroke },
  list: { gap: space.md, marginTop: space.xl },
  empty: { ...type.meta, color: colors.textSecondary },
  card: { gap: space.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.xxs },
  kicker: { ...type.caption, color: colors.textSecondary },
  exName: { ...type.itemTitle, fontFamily: fonts.semibold, color: colors.textPrimary, marginTop: 2 },
  fields: { flexDirection: 'row', gap: space.sm },
  fieldWrap: { flex: 1, gap: space.xs, minWidth: 0 },
  fieldLabel: { ...type.caption, color: colors.textSecondary },
  field: {
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardStroke,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: space.xs,
  },
  stepper: { height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepValue: { fontFamily: fonts.bold, fontSize: 18, color: colors.textPrimary, minWidth: 22, textAlign: 'center' },
  add: {
    height: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.cardStroke,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  addText: { ...type.button, fontSize: 16, color: colors.accent },
  cta: { position: 'absolute' },
});
