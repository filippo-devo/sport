import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Supplement, SupplementLog } from '../../data/types';
import { useT } from '../../i18n';
import { useStore } from '../../store';
import { colors, space, type } from '../../theme/tokens';
import { CheckIcon, PillIcon, PlusIcon } from '../icons';
import { Card, Divider, SectionTitle } from '../ui/controls';

/** How many doses a supplement needs on a day (one per reminder time, at least one). */
export const dosesPerDay = (s: Supplement) => Math.max(1, s.times.length);

export function takenOn(logs: SupplementLog[], id: string, date: string) {
  return logs.filter((l) => l.supplementId === id && l.date === date);
}

/** Today's supplement checklist on the Food tab. */
export function SupplementsCard({ date }: { date: string }) {
  const { t } = useT();
  const supplements = useStore((s) => s.supplements).filter((s) => !s.archived);
  const logs = useStore((s) => s.supplementLogs);
  const take = useStore((s) => s.takeSupplement);
  const undo = useStore((s) => s.deleteSupplementLog);
  const total = supplements.reduce((n, s) => n + dosesPerDay(s), 0);
  const done = supplements.reduce((n, s) => n + Math.min(dosesPerDay(s), takenOn(logs, s.id, date).length), 0);

  return (
    <View>
      <SectionTitle title={t('supp.title')} aside={supplements.length ? t('supp.progress', { done, total }) : t('common.seeAll')} onAside={() => router.push('/supplements')} />
      <Card style={styles.card}>
        {supplements.length === 0 && (
          <Pressable style={styles.row} onPress={() => router.push('/supplements')} accessibilityRole="button">
            <View style={styles.icon}>
              <PlusIcon size={14} color={colors.accent} weight="bold" />
            </View>
            <Text style={[styles.meta, { flex: 1 }]}>{t('supp.none')}</Text>
          </Pressable>
        )}
        {supplements.map((s, i) => {
          const taken = takenOn(logs, s.id, date);
          const complete = taken.length >= dosesPerDay(s);
          const last = taken[taken.length - 1];
          return (
            <View key={s.id}>
              {i > 0 && <Divider />}
              <View style={styles.row}>
                <PillIcon size={20} color={complete ? colors.success : colors.textSecondary} weight="fill" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {s.name}
                    {s.dose ? <Text style={styles.meta}> · {s.dose}</Text> : null}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {last ? t('supp.taken', { time: last.time }) : s.times.join(' · ')}
                    {dosesPerDay(s) > 1 ? ` · ${taken.length}/${dosesPerDay(s)}` : ''}
                  </Text>
                </View>
                {complete && last ? (
                  <Pressable onPress={() => undo(last.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${t('supp.undo')}: ${s.name}`}>
                    <View style={[styles.check, styles.checkDone]}>
                      <CheckIcon size={16} color={colors.textOnAccent} weight="bold" />
                    </View>
                  </Pressable>
                ) : (
                  <Pressable onPress={() => take(s.id, date)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${t('supp.take')}: ${s.name}`}>
                    <View style={styles.check}>
                      <CheckIcon size={16} color={colors.textSecondary} weight="bold" />
                    </View>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: space.md, paddingVertical: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  icon: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.control, alignItems: 'center', justifyContent: 'center' },
  name: { ...type.itemTitle, color: colors.textPrimary },
  meta: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  check: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: colors.cardStroke, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: colors.success, borderColor: colors.success },
});
