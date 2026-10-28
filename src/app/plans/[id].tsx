import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { CaretRightIcon, CheckIcon } from '../../components/icons';
import { Badge, Button, Card, Divider, SectionTitle } from '../../components/ui/controls';
import { NavBar } from '../../components/ui/headers';
import { Screen } from '../../components/ui/layout';
import { PROGRAMS } from '../../data/programs';
import { useT } from '../../i18n';
import { useStore } from '../../store';
import { getRoutine, routineMinutes } from '../../store/derived';
import { colors, fonts, space, type } from '../../theme/tokens';

export default function PlanDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, tn, L, weekdayLong } = useT();
  const activeId = useStore((s) => s.activeProgramId);
  const setActive = useStore((s) => s.setActiveProgram);
  const program = PROGRAMS.find((p) => p.id === id);
  if (!program) return <Screen top={<NavBar />}>{null}</Screen>;
  const monday = new Date(2024, 0, 1);
  const routines = [...new Set(program.schedule.filter(Boolean) as string[])].map((r) => getRoutine(r)!);

  return (
    <Screen top={<NavBar title={t('plans.title')} />}>
      <Text style={styles.title}>{L(program.name)}</Text>
      <Text style={styles.desc}>{L(program.description)}</Text>
      {program.id === activeId ? (
        <View style={{ marginTop: space.lg }}>
          <Badge label={t('plans.active').toUpperCase()} icon={CheckIcon} />
        </View>
      ) : (
        <Button label={t('plans.use')} onPress={() => setActive(program.id)} style={{ marginTop: space.lg }} />
      )}

      <SectionTitle style={styles.section} title={t('plans.schedule')} />
      <Card style={styles.schedule}>
        {program.schedule.map((rid, i) => {
          const r = getRoutine(rid);
          return (
            <View key={i}>
              {i > 0 && <Divider />}
              <View style={styles.dayRow}>
                <Text style={styles.dayName}>{weekdayLong(new Date(monday.getTime() + i * 86400000))}</Text>
                <Text style={[styles.dayValue, !r && { color: colors.textSecondary }]} numberOfLines={1}>
                  {r ? L(r.name) : t('plans.rest')}
                </Text>
              </View>
            </View>
          );
        })}
      </Card>

      <SectionTitle style={styles.section} title={t('plans.workouts')} />
      <View style={styles.routines}>
        {routines.map((r) => (
          <Card key={r.id} onPress={() => router.push(`/routine/${r.id}`)} accessibilityLabel={L(r.name)} style={styles.routine}>
            <View style={{ flex: 1 }}>
              <Text style={styles.routineName}>{L(r.name)}</Text>
              <Text style={styles.routineMeta}>
                {t('unit.min', { n: routineMinutes(r) })} · {tn('unit.exercises', r.items.length)}
              </Text>
            </View>
            <CaretRightIcon size={18} color={colors.textSecondary} weight="bold" />
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.display, color: colors.textPrimary, marginTop: space.sm },
  desc: { ...type.meta, fontSize: 16, lineHeight: 22, color: colors.textSecondary, marginTop: space.sm },
  section: { marginTop: space.xxl },
  schedule: { marginTop: space.md, paddingVertical: space.xs },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md, paddingVertical: space.md },
  dayName: { fontFamily: fonts.medium, fontSize: 15, color: colors.textSecondary, textTransform: 'capitalize' },
  dayValue: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textPrimary, flexShrink: 1, textAlign: 'right' },
  routines: { gap: space.md, marginTop: space.md },
  routine: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  routineName: { ...type.itemTitle, fontFamily: fonts.semibold, color: colors.textPrimary },
  routineMeta: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
});
