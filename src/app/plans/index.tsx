import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { CaretRightIcon, CheckIcon } from '../../components/icons';
import { Badge, Card } from '../../components/ui/controls';
import { NavBar } from '../../components/ui/headers';
import { Screen } from '../../components/ui/layout';
import { PROGRAMS } from '../../data/programs';
import { useT } from '../../i18n';
import { useStore } from '../../store';
import { colors, space, type } from '../../theme/tokens';

export default function PlansScreen() {
  const { t, tn, L, weekdayShort } = useT();
  const activeId = useStore((s) => s.activeProgramId);
  // Monday-first labels from any Monday.
  const monday = new Date(2024, 0, 1);
  return (
    <Screen top={<NavBar title={t('plans.title')} />}>
      <View style={styles.list}>
        {PROGRAMS.map((p) => (
          <Card key={p.id} onPress={() => router.push(`/plans/${p.id}`)} accessibilityLabel={L(p.name)} style={styles.card}>
            <View style={styles.head}>
              <Text style={styles.name}>{L(p.name)}</Text>
              {p.id === activeId ? <Badge label={t('plans.active').toUpperCase()} icon={CheckIcon} /> : <CaretRightIcon size={18} color={colors.textSecondary} weight="bold" />}
            </View>
            <Text style={styles.desc}>{L(p.description)}</Text>
            <View style={styles.days}>
              {p.schedule.map((r, i) => (
                <View key={i} style={[styles.day, r && styles.dayOn]}>
                  <Text style={[styles.dayText, r && styles.dayTextOn]}>{weekdayShort(new Date(monday.getTime() + i * 86400000))}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.meta}>{tn('plans.perWeek', p.schedule.filter(Boolean).length)}</Text>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md },
  card: { gap: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  name: { ...type.sectionTitle, color: colors.textPrimary, flex: 1 },
  desc: { ...type.meta, color: colors.textSecondary },
  days: { flexDirection: 'row', gap: 6, marginTop: space.xs },
  day: { flex: 1, height: 30, borderRadius: 8, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  dayOn: { backgroundColor: colors.control },
  dayText: { ...type.caption, fontSize: 11, color: colors.textSecondary },
  dayTextOn: { color: colors.accent },
  meta: { ...type.caption, color: colors.textSecondary },
});
