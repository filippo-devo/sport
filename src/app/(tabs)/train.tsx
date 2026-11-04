import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ExerciseRow } from '../../components/ExerciseRow';
import { BooksIcon, CalendarBlankIcon, CaretDownIcon, CaretRightIcon, CheckIcon, ListChecksIcon, PlusIcon, SparkleIcon, type Icon } from '../../components/icons';
import { TrainHero } from '../../components/train/TrainHero';
import { TrainWeek } from '../../components/train/TrainWeek';
import { Divider, IconButton, SectionTitle } from '../../components/ui/controls';
import { TabHeader } from '../../components/ui/headers';
import { Screen, useLayout } from '../../components/ui/layout';
import { useStartWorkout } from '../../components/useStartWorkout';
import { useT } from '../../i18n';
import { dayKey } from '../../lib/date';
import { formatVolume } from '../../lib/units';
import { useStore } from '../../store';
import { useActiveProgram } from '../../store/plans';
import { isCustom, lastPerformance, muscleRecovery, planWeek, routineMinutes, routineMuscles, routineSets, sessionVolume, sortedSessions } from '../../store/derived';
import { colors, fonts, radius, space, type } from '../../theme/tokens';

const COLLAPSED = 3;

export default function TrainScreen() {
  const { t, tn, L, weekdayShort, dateShort } = useT();
  const { contentWidth, gutter } = useLayout();
  const sessions = useStore((s) => s.sessions);
  const customRoutines = useStore((s) => s.routines);
  const units = useStore((s) => s.settings.units);
  const { start, sheet, active } = useStartWorkout();

  const program = useActiveProgram();
  const days = useMemo(() => planWeek(program, sessions, new Date(), customRoutines), [program, sessions, customRoutines]);
  const todayKey = dayKey();
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [expanded, setExpanded] = useState(false);
  const day = days.find((d) => d.key === selectedKey) ?? days[0];
  const routine = day.routine;

  const muscles = routine ? routineMuscles(routine).slice(0, 3).map((m) => ({ muscle: m, recovery: muscleRecovery(sessions, m) })) : [];
  const startable = day.key === todayKey && !!routine && day.status !== 'done';
  const resumable = !!active && active.routineId === routine?.id;

  const upcoming = days.filter((d) => d.key > todayKey && d.key !== day.key);
  const last = useMemo(() => sortedSessions(sessions)[0], [sessions]);
  const items = routine?.items ?? [];
  const shown = expanded ? items : items.slice(0, COLLAPSED);

  const select = (key: string) => {
    setSelectedKey(key);
    setExpanded(false);
  };

  return (
    <Screen tabBar>
      <TabHeader
        title={t('train.title')}
        right={
          <>
            <IconButton icon={CalendarBlankIcon} label={L(program.name)} onPress={() => router.push(`/plans/${program.id}`)} />
            <IconButton icon={BooksIcon} label={t('library.title')} onPress={() => router.push('/library')} />
          </>
        }
      />

      <View style={styles.first}>
        <TrainWeek days={days} selectedKey={day.key} onSelect={select} width={contentWidth} />
      </View>

      <View style={styles.hero}>
        <TrainHero
          day={day}
          muscles={day.status === 'done' ? [] : muscles}
          startable={startable}
          resumable={resumable}
          onStart={() => start(routine!.id)}
          onOpen={day.session ? () => router.push(`/session/${day.session!.id}`) : routine ? () => router.push(`/routine/${routine.id}`) : undefined}
          onEdit={
            routine && day.status !== 'done'
              ? () => router.push({ pathname: '/routine-edit', params: isCustom(routine) ? { id: routine.id } : { copy: routine.id } })
              : undefined
          }
        />
      </View>

      {routine && day.status !== 'done' && items.length > 0 && (
        <>
          <SectionTitle style={styles.section} title={t('train.exercises')} aside={`${items.length} · ${tn('unit.sets', routineSets(routine))}`} />
          <View style={styles.list}>
            {shown.map((item, i) => (
              <View key={`${item.exerciseId}-${i}`}>
                {i > 0 && <Divider inset={64 + space.lg} />}
                <ExerciseRow
                  item={item}
                  index={i}
                  units={units}
                  weight={item.weight ?? lastPerformance(sessions, item.exerciseId)?.sets.find((s) => s.weight)?.weight}
                  onPress={() => router.push(`/exercise/${item.exerciseId}`)}
                />
              </View>
            ))}
            {items.length > COLLAPSED && (
              <Pressable
                onPress={() => setExpanded((v) => !v)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.more, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.moreText}>{expanded ? t('train.showLess') : t('train.showMore', { n: items.length - COLLAPSED })}</Text>
                <CaretDownIcon size={14} color={colors.textSecondary} weight="bold" style={expanded ? { transform: [{ rotate: '180deg' }] } : undefined} />
              </Pressable>
            )}
          </View>
        </>
      )}

      <SectionTitle style={styles.section} title={t('train.restOfWeek')} aside={t('train.plans')} onAside={() => router.push('/plans')} />
      {upcoming.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.rail, { marginHorizontal: -gutter }]}
          contentContainerStyle={{ paddingHorizontal: gutter, gap: space.sm + 2 }}
        >
          {upcoming.map((d) => {
            const r = d.routine;
            return (
              <Pressable
                key={d.key}
                onPress={() => select(d.key)}
                accessibilityRole="button"
                accessibilityLabel={`${weekdayShort(d.date)} ${dateShort(d.date)}, ${r ? L(r.name) : t('train.restDay')}`}
                style={({ pressed }) => [styles.dayCard, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.dayWhen}>
                  {weekdayShort(d.date)} · {dateShort(d.date)}
                </Text>
                <View>
                  <Text style={[styles.dayName, !r && { color: colors.textSecondary }]} numberOfLines={2}>
                    {r ? L(r.name) : t('train.restDay')}
                  </Text>
                  <Text style={styles.dayMeta} numberOfLines={1}>
                    {r ? `${t('unit.min', { n: routineMinutes(r) })} · ${tn('unit.exercises', r.items.length)}` : t('train.recovery')}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={styles.empty}>{t('train.noMoreThisWeek')}</Text>
      )}

      <SectionTitle style={styles.section} title={t('train.quickStart')} />
      <View style={styles.grid}>
        <Tile icon={PlusIcon} title={t('train.emptyWorkout')} body={t('train.emptyWorkoutBody')} onPress={() => start()} />
        <Tile icon={ListChecksIcon} title={t('train.plans')} body={L(program.name)} onPress={() => router.push('/plans')} />
        <Tile icon={SparkleIcon} title={t('coach.title')} body={t('train.coachShort')} onPress={() => router.push('/coach')} />
      </View>

      {last && (
        <>
          <SectionTitle style={styles.section} title={t('train.lastWorkout')} aside={t('train.history')} onAside={() => router.push('/history')} />
          <Pressable
            onPress={() => router.push(`/session/${last.id}`)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.last, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.lastIcon}>
              <CheckIcon size={18} color={colors.success} weight="bold" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.lastName} numberOfLines={1}>
                {L(last.name)}
              </Text>
              <Text style={styles.lastMeta} numberOfLines={1}>
                {[
                  `${weekdayShort(new Date(last.startedAt))} ${dateShort(new Date(last.startedAt))}`,
                  t('unit.min', { n: Math.round((last.endedAt - last.startedAt) / 60000) }),
                  formatVolume(sessionVolume(last), units),
                ].join(' · ')}
              </Text>
            </View>
            <CaretRightIcon size={16} color={colors.textSecondary} weight="bold" />
          </Pressable>
        </>
      )}
      {sheet}
    </Screen>
  );
}

function Tile({ icon: Glyph, title, body, onPress }: { icon: Icon; title: string; body: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}>
      <Glyph size={24} color={colors.accent} weight="bold" />
      <View>
        <Text style={styles.tileTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.tileBody} numberOfLines={2}>
          {body}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  first: { marginTop: space.xl },
  hero: { marginTop: space.lg },
  section: { marginTop: space.xxl + space.xs },
  list: {
    marginTop: space.sm,
    paddingHorizontal: space.md + 2,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, paddingVertical: space.md + 2, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  moreText: { ...type.body, color: colors.textSecondary },
  rail: { marginTop: space.sm, flexGrow: 0 },
  dayCard: {
    width: 152,
    minHeight: 112,
    padding: space.md + 2,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    justifyContent: 'space-between',
  },
  dayWhen: { ...type.caption, color: colors.textSecondary },
  dayName: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20, color: colors.textPrimary },
  dayMeta: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  empty: { ...type.meta, color: colors.textSecondary, marginTop: space.sm },
  grid: { flexDirection: 'row', gap: space.sm + 2, marginTop: space.sm },
  tile: {
    flex: 1,
    minHeight: 112,
    padding: space.md + 2,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    justifyContent: 'space-between',
  },
  tileTitle: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 19, color: colors.textPrimary },
  tileBody: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  last: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.sm,
    padding: space.md + 2,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  lastIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: 'rgba(33,196,92,0.14)', alignItems: 'center', justifyContent: 'center' },
  lastName: { ...type.itemTitle, color: colors.textPrimary },
  lastMeta: { ...type.caption, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
});
