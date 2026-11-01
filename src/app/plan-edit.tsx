import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { CaretRightIcon, CheckIcon, MoonIcon, PlusIcon, TrashIcon, XIcon } from '../components/icons';
import { Button, Card, Divider, IconButton } from '../components/ui/controls';
import { NavBar } from '../components/ui/headers';
import { BottomFade, Screen, useLayout } from '../components/ui/layout';
import { ConfirmSheet, Sheet } from '../components/ui/sheets';
import { useT } from '../i18n';
import { useStore } from '../store';
import { getRoutine, isCustom, routineMinutes } from '../store/derived';
import { useAllRoutines, useProgramById } from '../store/plans';
import { colors, fonts, layout, radius, space, type } from '../theme/tokens';

const MONDAY = new Date(2024, 0, 1);
const dayDate = (i: number) => new Date(MONDAY.getTime() + i * 86400000);

/** Create or edit a weekly plan: name, description and a workout (or rest) for each weekday. */
export default function PlanEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t, tn, L, weekdayLong } = useT();
  const { insets, gutter } = useLayout();
  const existing = useProgramById(id);
  const editing = existing && isCustom(existing) ? existing : undefined;
  const routines = useAllRoutines();
  const custom = useStore((s) => s.routines);
  const activeId = useStore((s) => s.activeProgramId);
  const saveProgram = useStore((s) => s.saveProgram);
  const deleteProgram = useStore((s) => s.deleteProgram);
  const setActive = useStore((s) => s.setActiveProgram);

  const [name, setName] = useState(editing ? L(editing.name) : '');
  const [description, setDescription] = useState(editing ? L(editing.description) : '');
  const [schedule, setSchedule] = useState<(string | null)[]>(editing?.schedule ?? [null, null, null, null, null, null, null]);
  const [makeActive, setMakeActive] = useState(!editing || editing.id === activeId);
  const [picking, setPicking] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);

  const hasWorkout = schedule.some(Boolean);
  const valid = name.trim().length > 0 && hasWorkout;
  const bottom = Math.max(insets.bottom, space.lg);

  const save = () => {
    const n = name.trim();
    const d = description.trim();
    const pid = saveProgram({
      id: editing?.id ?? '',
      name: { en: n, pl: n },
      description: { en: d, pl: d },
      schedule,
      source: editing?.source ?? 'user',
    });
    if (makeActive) setActive(pid);
    router.replace(`/plans/${pid}`);
  };

  return (
    <Screen
      top={<NavBar title={editing ? t('plans.edit') : t('plans.create')} left={<IconButton icon={XIcon} label={t('common.close')} onPress={() => router.back()} />} />}
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
      <Text style={styles.label}>{t('plans.name')}</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t('plans.namePlaceholder')}
        placeholderTextColor={colors.textSecondary}
        style={styles.nameInput}
        maxLength={48}
        accessibilityLabel={t('plans.name')}
      />
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder={t('plans.description')}
        placeholderTextColor={colors.textSecondary}
        style={styles.descInput}
        maxLength={160}
        multiline
        accessibilityLabel={t('plans.description')}
      />

      <Text style={[styles.section]}>{t('plans.schedule')}</Text>
      <Card style={styles.schedule}>
        {schedule.map((rid, i) => {
          const r = getRoutine(rid, custom);
          return (
            <View key={i}>
              {i > 0 && <Divider />}
              <Pressable style={styles.dayRow} onPress={() => setPicking(i)} accessibilityRole="button" accessibilityLabel={t('plans.pickDay', { day: weekdayLong(dayDate(i)) })}>
                <Text style={styles.dayName}>{weekdayLong(dayDate(i))}</Text>
                <Text style={[styles.dayValue, !r && { color: colors.textSecondary }]} numberOfLines={1}>
                  {r ? L(r.name) : t('plans.rest')}
                </Text>
                <CaretRightIcon size={14} color={colors.textSecondary} weight="bold" />
              </Pressable>
            </View>
          );
        })}
      </Card>
      {!hasWorkout && <Text style={styles.hint}>{t('plans.needsWorkout')}</Text>}

      <View style={styles.activeRow}>
        <Text style={styles.activeLabel}>{t('plans.setActive')}</Text>
        <Switch
          value={makeActive}
          onValueChange={setMakeActive}
          trackColor={{ true: colors.accent, false: colors.track }}
          thumbColor={makeActive ? colors.textOnAccent : colors.textPrimary}
          accessibilityLabel={t('plans.setActive')}
        />
      </View>

      {editing && <Button label={t('plans.delete')} variant="danger" icon={TrashIcon} onPress={() => setConfirm(true)} style={{ marginTop: space.xl }} />}

      <Sheet visible={picking != null} onClose={() => setPicking(null)} title={picking != null ? t('plans.pickDay', { day: weekdayLong(dayDate(picking)) }) : undefined}>
        <ScrollView style={{ maxHeight: 420 }}>
          <PickRow
            label={t('plans.rest')}
            icon={<MoonIcon size={18} color={colors.textSecondary} weight="fill" />}
            selected={picking != null && !schedule[picking]}
            onPress={() => {
              setSchedule(schedule.map((x, j) => (j === picking ? null : x)));
              setPicking(null);
            }}
          />
          {routines.map((r) => (
            <PickRow
              key={r.id}
              label={L(r.name)}
              meta={`${t('unit.min', { n: routineMinutes(r) })} · ${tn('unit.exercises', r.items.length)}${isCustom(r) ? ` · ${t(`plans.source.${r.source as 'user'}`)}` : ''}`}
              selected={picking != null && schedule[picking] === r.id}
              onPress={() => {
                setSchedule(schedule.map((x, j) => (j === picking ? r.id : x)));
                setPicking(null);
              }}
            />
          ))}
        </ScrollView>
        <Button
          label={t('plans.newWorkout')}
          icon={PlusIcon}
          variant="secondary"
          onPress={() => {
            setPicking(null);
            router.push('/routine-edit');
          }}
        />
      </Sheet>

      <ConfirmSheet
        visible={confirm}
        title={t('plans.delete')}
        body={t('plans.deleteBody')}
        confirmLabel={t('common.delete')}
        destructive
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          if (editing) deleteProgram(editing.id);
          router.replace('/plans');
        }}
      />
    </Screen>
  );
}

function PickRow({ label, meta, icon, selected, onPress }: { label: string; meta?: string; icon?: React.ReactNode; selected: boolean; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.pick, pressed && { opacity: 0.7 }]} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}>
      {icon}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.pickLabel} numberOfLines={1}>
          {label}
        </Text>
        {meta ? <Text style={styles.pickMeta}>{meta}</Text> : null}
      </View>
      {selected && <CheckIcon size={18} color={colors.accent} weight="bold" />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { ...type.caption, color: colors.textSecondary, marginTop: space.sm },
  nameInput: { ...type.heroTitle, color: colors.textPrimary, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardStroke },
  descInput: { ...type.meta, color: colors.textPrimary, paddingVertical: space.md, minHeight: 44 },
  section: { ...type.sectionTitle, color: colors.textPrimary, marginTop: space.xl },
  schedule: { marginTop: space.md, paddingVertical: space.xs },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  dayName: { fontFamily: fonts.medium, fontSize: 15, color: colors.textSecondary, textTransform: 'capitalize', width: 110 },
  dayValue: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textPrimary, flex: 1, textAlign: 'right' },
  hint: { ...type.caption, color: colors.warning, marginTop: space.sm },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.xl },
  activeLabel: { ...type.body, color: colors.textPrimary, flex: 1 },
  pick: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, borderRadius: radius.sm },
  pickLabel: { ...type.body, color: colors.textPrimary },
  pickMeta: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  cta: { position: 'absolute' },
});
