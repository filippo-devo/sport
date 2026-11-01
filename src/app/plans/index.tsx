import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CaretRightIcon, CheckIcon, PlusIcon } from '../../components/icons';
import { Badge, Card, Divider, SectionTitle } from '../../components/ui/controls';
import { NavBar } from '../../components/ui/headers';
import { Screen } from '../../components/ui/layout';
import type { Program } from '../../data/types';
import { useT } from '../../i18n';
import { useStore } from '../../store';
import { isCustom, routineMinutes } from '../../store/derived';
import { useAllPrograms } from '../../store/plans';
import { colors, fonts, radius, space, type } from '../../theme/tokens';

export default function PlansScreen() {
  const { t, tn, L } = useT();
  const { mine, builtin } = useAllPrograms();
  const routines = useStore((s) => s.routines);

  return (
    <Screen top={<NavBar title={t('plans.title')} />}>
      <SectionTitle title={t('plans.mine')} />
      <View style={styles.list}>
        {mine.map((p) => (
          <ProgramCard key={p.id} program={p} />
        ))}
        <AddCard label={t('plans.create')} body={t('plans.createBody')} onPress={() => router.push('/plan-edit')} />
      </View>

      <SectionTitle style={styles.section} title={t('plans.myWorkouts')} />
      {routines.length > 0 ? (
        <Card style={styles.routines}>
          {routines.map((r, i) => (
            <View key={r.id}>
              {i > 0 && <Divider />}
              <Pressable style={styles.routineRow} onPress={() => router.push(`/routine/${r.id}`)} accessibilityRole="button" accessibilityLabel={L(r.name)}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.routineName} numberOfLines={1}>
                    {L(r.name)}
                  </Text>
                  <Text style={styles.meta}>
                    {t('unit.min', { n: routineMinutes(r) })} · {tn('unit.exercises', r.items.length)}
                    {r.source && r.source !== 'user' ? ` · ${t(`plans.source.${r.source as 'ai'}`)}` : ''}
                  </Text>
                </View>
                <CaretRightIcon size={16} color={colors.textSecondary} weight="bold" />
              </Pressable>
            </View>
          ))}
        </Card>
      ) : (
        <Text style={[styles.desc, { marginTop: space.sm }]}>{t('plans.noWorkouts')}</Text>
      )}
      <View style={styles.list}>
        <AddCard label={t('plans.newWorkout')} body={t('plans.newWorkoutBody')} onPress={() => router.push('/routine-edit')} />
      </View>

      <SectionTitle style={styles.section} title={t('plans.builtin')} />
      <View style={styles.list}>
        {builtin.map((p) => (
          <ProgramCard key={p.id} program={p} />
        ))}
      </View>
    </Screen>
  );
}

function ProgramCard({ program: p }: { program: Program }) {
  const { t, tn, L, weekdayShort } = useT();
  const activeId = useStore((s) => s.activeProgramId);
  // Monday-first labels from any Monday.
  const monday = new Date(2024, 0, 1);
  return (
    <Card onPress={() => router.push(`/plans/${p.id}`)} accessibilityLabel={L(p.name)} style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.name} numberOfLines={1}>
          {L(p.name)}
        </Text>
        {p.id === activeId ? (
          <Badge label={t('plans.active').toUpperCase()} icon={CheckIcon} />
        ) : isCustom(p) && p.source !== 'user' ? (
          <Badge label={t(`plans.source.${p.source as 'ai'}`)} tone="muted" />
        ) : (
          <CaretRightIcon size={18} color={colors.textSecondary} weight="bold" />
        )}
      </View>
      {L(p.description) ? <Text style={styles.desc}>{L(p.description)}</Text> : null}
      <View style={styles.days}>
        {p.schedule.map((r, i) => (
          <View key={i} style={[styles.day, r && styles.dayOn]}>
            <Text style={[styles.dayText, r && styles.dayTextOn]}>{weekdayShort(new Date(monday.getTime() + i * 86400000))}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.metaSmall}>{tn('plans.perWeek', p.schedule.filter(Boolean).length)}</Text>
    </Card>
  );
}

function AddCard({ label, body, onPress }: { label: string; body: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.add, pressed && { opacity: 0.85 }]}>
      <View style={styles.plus}>
        <PlusIcon size={18} color={colors.accent} weight="bold" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.routineName}>{label}</Text>
        <Text style={styles.meta}>{body}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xxl },
  list: { gap: space.md, marginTop: space.md },
  card: { gap: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  name: { ...type.sectionTitle, color: colors.textPrimary, flex: 1 },
  desc: { ...type.meta, color: colors.textSecondary },
  days: { flexDirection: 'row', gap: 6, marginTop: space.xs },
  day: { flex: 1, height: 30, borderRadius: 8, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  dayOn: { backgroundColor: colors.control },
  dayText: { ...type.caption, fontSize: 11, color: colors.textSecondary },
  dayTextOn: { color: colors.accent },
  metaSmall: { ...type.caption, color: colors.textSecondary },
  routines: { marginTop: space.md, paddingVertical: space.xs },
  routineRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  routineName: { ...type.itemTitle, fontFamily: fonts.semibold, color: colors.textPrimary },
  meta: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.cardStroke,
  },
  plus: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
});
