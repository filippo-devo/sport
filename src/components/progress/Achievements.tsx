import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useT, type TKey } from '../../i18n';
import { useStore } from '../../store';
import { achievements, type Achievement, type AchievementIcon } from '../../store/progress';
import { colors, fonts, radius, space, type } from '../../theme/tokens';
import { BarbellIcon, CalendarCheckIcon, CameraIcon, FireIcon, LightningIcon, LockSimpleIcon, RulerIcon, TrophyIcon, type Icon } from '../icons';
import { Card, ProgressBar, SectionTitle } from '../ui/controls';

const ICONS: Record<AchievementIcon, Icon> = {
  barbell: BarbellIcon,
  fire: FireIcon,
  calendar: CalendarCheckIcon,
  trophy: TrophyIcon,
  lightning: LightningIcon,
  camera: CameraIcon,
  scales: RulerIcon,
};

/** Achievement badges earned from the log, unlocked ones first. */
export function AchievementsSection() {
  const { t } = useT();
  const sessions = useStore((s) => s.sessions);
  const meals = useStore((s) => s.meals);
  const water = useStore((s) => s.water);
  const supplementLogs = useStore((s) => s.supplementLogs);
  const weighIns = useStore((s) => s.weighIns);
  const photos = useStore((s) => s.photos);
  const measurements = useStore((s) => s.measurements);
  const workoutsPerWeek = useStore((s) => s.goals.workoutsPerWeek);
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(() => {
    const all = achievements({ sessions, meals, water, supplementLogs, weighIns, photos, measurements, workoutsPerWeek });
    // Unlocked first, then the closest to unlocking.
    return [...all].sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || b.value / b.target - a.value / a.target);
  }, [sessions, meals, water, supplementLogs, weighIns, photos, measurements, workoutsPerWeek]);
  const unlocked = list.filter((a) => a.unlocked).length;

  return (
    <View>
      <SectionTitle style={styles.section} title={t('progress.achievements')} aside={t('progress.unlocked', { n: unlocked, total: list.length })} />
      <Card style={styles.card}>
        <View style={styles.grid}>
          {list.map((a) => (
            <BadgeTile key={a.id} a={a} open={open === a.id} onPress={() => setOpen(open === a.id ? null : a.id)} />
          ))}
        </View>
      </Card>
    </View>
  );
}

function BadgeTile({ a, open, onPress }: { a: Achievement; open: boolean; onPress: () => void }) {
  const { t } = useT();
  const Glyph = ICONS[a.icon];
  const title = t(`badge.${a.id}.title` as TKey);
  const desc = t(`badge.${a.id}.desc` as TKey);
  return (
    <Pressable onPress={onPress} style={styles.tile} accessibilityRole="button" accessibilityLabel={`${title}. ${desc}`} accessibilityState={{ selected: open }}>
      <View style={[styles.medal, a.unlocked ? styles.medalOn : styles.medalOff]}>
        <Glyph size={24} color={a.unlocked ? colors.textOnAccent : colors.textSecondary} weight={a.unlocked ? 'fill' : 'regular'} />
        {!a.unlocked && (
          <View style={styles.lock}>
            <LockSimpleIcon size={10} color={colors.textPrimary} weight="fill" />
          </View>
        )}
      </View>
      <Text style={[styles.title, !a.unlocked && { color: colors.textSecondary }]} numberOfLines={2}>
        {title}
      </Text>
      {open ? (
        <Text style={styles.desc}>{desc}</Text>
      ) : (
        !a.unlocked &&
        a.value > 0 && (
          <View style={styles.bar}>
            <ProgressBar value={a.value / a.target} color={colors.accent} height={3} />
          </View>
        )
      )}
    </Pressable>
  );
}

const MEDAL = 56;

const styles = StyleSheet.create({
  section: { marginTop: space.xxl + space.xxs },
  card: { marginTop: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.lg },
  tile: { width: '33.33%', alignItems: 'center', gap: space.xs, paddingHorizontal: 4 },
  medal: { width: MEDAL, height: MEDAL, borderRadius: MEDAL / 2, alignItems: 'center', justifyContent: 'center' },
  medalOn: { backgroundColor: colors.accent },
  medalOff: { backgroundColor: colors.surfaceAccent, borderWidth: 1, borderColor: colors.cardStroke, borderStyle: 'dashed' },
  lock: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...type.caption, fontFamily: fonts.semibold, color: colors.textPrimary, textAlign: 'center' },
  desc: { ...type.caption, fontSize: 11, color: colors.textSecondary, textAlign: 'center' },
  bar: { width: '70%' },
});
