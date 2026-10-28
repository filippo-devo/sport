import { StyleSheet, Text, View } from 'react-native';

import { SessionRow } from '../components/SessionRow';
import { Divider } from '../components/ui/controls';
import { NavBar } from '../components/ui/headers';
import { Screen } from '../components/ui/layout';
import { useT } from '../i18n';
import { useStore } from '../store';
import { sortedSessions } from '../store/derived';
import { colors, space, type } from '../theme/tokens';

/** All finished workouts, grouped by month. */
export default function HistoryScreen() {
  const { t, tn, monthYear } = useT();
  const sessions = useStore((s) => s.sessions);
  const units = useStore((s) => s.settings.units);
  const sorted = sortedSessions(sessions);

  const groups: { label: string; items: typeof sorted }[] = [];
  for (const s of sorted) {
    const label = monthYear(new Date(s.startedAt));
    const g = groups[groups.length - 1];
    if (g && g.label === label) g.items.push(s);
    else groups.push({ label, items: [s] });
  }

  return (
    <Screen top={<NavBar title={t('history.title')} />}>
      {sorted.length === 0 && <Text style={styles.empty}>{t('history.empty')}</Text>}
      {groups.map((g) => (
        <View key={g.label} style={styles.group}>
          <View style={styles.groupHead}>
            <Text style={styles.groupTitle}>{g.label}</Text>
            <Text style={styles.groupCount}>{tn('unit.workouts', g.items.length)}</Text>
          </View>
          {g.items.map((s, i) => (
            <View key={s.id}>
              {i > 0 && <Divider inset={48 + space.md} />}
              <SessionRow session={s} units={units} />
            </View>
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { ...type.body, color: colors.textSecondary, textAlign: 'center', marginTop: space.xxxl },
  group: { marginTop: space.lg },
  groupHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  groupTitle: { ...type.sectionTitle, fontSize: 18, color: colors.textPrimary, textTransform: 'capitalize' },
  groupCount: { ...type.caption, color: colors.textSecondary },
});
