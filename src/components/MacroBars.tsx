import { StyleSheet, Text, View } from 'react-native';

import type { Goals } from '../data/types';
import { useT } from '../i18n';
import type { Nutrients } from '../store/derived';
import { colors, fonts, space } from '../theme/tokens';
import { ProgressBar } from './ui/controls';
import { Ring } from './ui/Ring';

const MACROS = [
  { key: 'protein', label: 'macro.protein', color: colors.protein },
  { key: 'carbs', label: 'macro.carbs', color: colors.carbs },
  { key: 'fat', label: 'macro.fat', color: colors.fat },
] as const;

/** Three macro progress bars with "eaten / goal g" (MacroFactor-style). */
export function MacroBars({ totals, goals }: { totals: Nutrients; goals: Goals }) {
  const { t } = useT();
  return (
    <View style={styles.row}>
      {MACROS.map((m) => (
        <View key={m.key} style={styles.item}>
          <Text style={styles.label} numberOfLines={1}>
            {t(m.label)}
          </Text>
          <ProgressBar value={totals[m.key] / goals[m.key]} color={m.color} />
          <Text style={styles.value}>
            <Text style={styles.strong}>{Math.round(totals[m.key])}</Text> / {goals[m.key]} g
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Three macro rings with grams left inside (Cal AI-style). */
export function MacroRings({ totals, goals, size }: { totals: Nutrients; goals: Goals; size: number }) {
  const { t } = useT();
  return (
    <View style={styles.rings}>
      {MACROS.map((m) => {
        const left = goals[m.key] - totals[m.key];
        return (
          <View key={m.key} style={styles.ringItem} accessible accessibilityLabel={`${t(m.label)}: ${Math.round(totals[m.key])} / ${goals[m.key]} g`}>
            <Ring value={totals[m.key] / goals[m.key]} size={size} stroke={7} color={m.color}>
              <Text style={styles.ringValue}>{Math.round(Math.abs(left))}</Text>
              <Text style={styles.ringUnit}>g</Text>
            </Ring>
            <Text style={styles.ringLabel} numberOfLines={1}>
              {t(m.label)}
            </Text>
            <Text style={styles.ringSub}>
              {Math.round(totals[m.key])} / {goals[m.key]} g
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md },
  item: { flex: 1, gap: space.xs, minWidth: 0 },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  value: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
  strong: { fontFamily: fonts.semibold, color: colors.textPrimary },
  rings: { flexDirection: 'row', justifyContent: 'space-between' },
  ringItem: { alignItems: 'center', flex: 1, gap: 4 },
  ringValue: { fontFamily: fonts.bold, fontSize: 18, color: colors.textPrimary, lineHeight: 20 },
  ringUnit: { fontFamily: fonts.medium, fontSize: 11, color: colors.textSecondary, lineHeight: 12 },
  ringLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textPrimary, marginTop: 4 },
  ringSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
});
