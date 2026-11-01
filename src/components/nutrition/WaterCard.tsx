import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useT } from '../../i18n';
import { useStore } from '../../store';
import { colors, fonts, radius, space, type } from '../../theme/tokens';
import { DropIcon } from '../icons';
import { Card, ProgressBar } from '../ui/controls';

const SIZES = [
  { ml: 250, label: 'water.glass' },
  { ml: 500, label: 'water.bottle' },
  { ml: 750, label: 'water.large' },
] as const;

/** Daily water with one-tap amounts (Cal AI "Log water" pattern). */
export function WaterCard({ date }: { date: string }) {
  const { t } = useT();
  const water = useStore((s) => s.water);
  const goal = useStore((s) => s.goals.waterMl);
  const addWater = useStore((s) => s.addWater);
  const deleteWater = useStore((s) => s.deleteWater);
  const entries = water.filter((w) => w.date === date);
  const total = entries.reduce((n, w) => n + w.ml, 0);
  const last = entries[entries.length - 1];

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <DropIcon size={20} color={WATER} weight="fill" />
        <Text style={styles.title}>{t('water.title')}</Text>
        <Text style={styles.value}>{t('water.today', { n: total, goal })}</Text>
      </View>
      <ProgressBar value={total / goal} color={WATER} height={8} />
      <View style={styles.row}>
        {SIZES.map((s) => (
          <Pressable
            key={s.ml}
            style={({ pressed }) => [styles.add, pressed && { opacity: 0.8 }]}
            onPress={() => addWater(s.ml, date)}
            accessibilityRole="button"
            accessibilityLabel={t('water.add', { n: s.ml })}
          >
            <Text style={styles.addMl}>+{s.ml} ml</Text>
            <Text style={styles.addLabel}>{t(s.label)}</Text>
          </Pressable>
        ))}
      </View>
      {last && (
        <Pressable onPress={() => deleteWater(last.id)} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.undo}>
            {t('water.undo')} ({last.ml} ml, {last.time})
          </Text>
        </Pressable>
      )}
    </Card>
  );
}

export const WATER = colors.fat;

const styles = StyleSheet.create({
  card: { gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { ...type.itemTitle, fontFamily: fonts.semibold, color: colors.textPrimary, flex: 1 },
  value: { ...type.body, color: colors.textSecondary },
  row: { flexDirection: 'row', gap: space.sm },
  add: { flex: 1, paddingVertical: space.sm, borderRadius: radius.md, backgroundColor: colors.control, alignItems: 'center', gap: 2 },
  addMl: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textPrimary },
  addLabel: { ...type.caption, color: colors.textSecondary },
  undo: { ...type.caption, color: colors.textSecondary, textAlign: 'center' },
});
