import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useT } from '../i18n';
import { routineMinutes, routineMuscles, routineSets, type PlanDay } from '../store/derived';
import { colors, fonts, radius, space, type } from '../theme/tokens';
import { CheckIcon, MoonIcon } from './icons';
import { RecoveryRing } from './RecoveryRing';

type Props = {
  day: PlanDay;
  /** Average recovery of the routine's muscles, 0–100. */
  recovery?: number;
  compact: boolean; // narrow phones get a slightly smaller hero title
  short: boolean; // short phones (SE-class) get a tighter card
  onPress?: () => void;
};

// Featured card for the selected day. Gravl uses a full-bleed trainer photo
// here; without licensed imagery we keep the same frame (24 pt radius,
// hairline stroke, volt badge, recovery pill) over a layered volt glow.
export function WorkoutCard({ day, recovery, compact, short, onPress }: Props) {
  const { t, tn, L, weekdayShort, dateShort } = useT();
  const r = day.routine;
  const s = day.session;
  const label = `${weekdayShort(day.date)} ${dateShort(day.date)}`;
  const minutes = s ? Math.round((s.endedAt - s.startedAt) / 60000) : r ? routineMinutes(r) : 0;
  const exercises = s ? s.exercises.length : r?.items.length ?? 0;
  const sets = s ? s.exercises.reduce((n, e) => n + e.sets.length, 0) : r ? routineSets(r) : 0;

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.card, short && styles.cardShort, pressed && { opacity: 0.92 }]}
    >
      <CardBackdrop muted={!r && !s ? true : day.status === 'done'} />

      <Badge status={day.status} label={label} />

      {r || s ? (
        <View style={[styles.body, short && styles.bodyShort]}>
          <Text style={[styles.title, compact && styles.titleCompact]}>{L(s?.name ?? r!.name)}</Text>
          {r && <Text style={styles.muscles}>{routineMuscles(r).slice(0, 3).map((m) => t(`muscle.${m}`)).join(', ')}</Text>}
          <Text style={styles.meta}>
            {t('unit.min', { n: minutes })}  •  {tn('unit.exercises', exercises)}  •  {tn('unit.sets', sets)}
          </Text>
          {recovery != null && day.status !== 'done' && <RecoveredPill value={recovery} />}
        </View>
      ) : (
        <View style={[styles.body, short && styles.bodyShort]}>
          <View style={styles.restIcon}>
            <MoonIcon size={22} color={colors.textPrimary} weight="fill" />
          </View>
          <Text style={[styles.title, compact && styles.titleCompact]}>{t('train.restDay')}</Text>
          <Text style={styles.meta}>{t('train.restBody')}</Text>
        </View>
      )}
    </Pressable>
  );
}

function Badge({ status, label }: { status: PlanDay['status']; label: string }) {
  const { t } = useT();
  if (status === 'today') {
    return (
      <View style={[styles.badge, styles.badgeAccent]}>
        <Text style={[styles.badgeText, { color: colors.textOnAccent }]}>{t('train.badgeToday')}</Text>
      </View>
    );
  }
  if (status === 'done') {
    return (
      <View style={[styles.badge, styles.badgeMuted]}>
        <CheckIcon size={13} color={colors.success} weight="bold" />
        <Text style={[styles.badgeText, { color: colors.success }]}>{t('train.badgeDone')}</Text>
      </View>
    );
  }
  const key = status === 'rest' ? 'train.badgeRest' : status === 'missed' ? 'train.badgeMissed' : 'train.badgePlanned';
  return (
    <View style={[styles.badge, styles.badgeMuted]}>
      <Text style={[styles.badgeText, { color: colors.textPrimary }]}>{t(key, { day: label.toUpperCase() })}</Text>
    </View>
  );
}

function RecoveredPill({ value }: { value: number }) {
  const { t } = useT();
  return (
    <View style={styles.pill}>
      <RecoveryRing value={value} size={34} stroke={2.5} />
      <Text style={styles.pillText}>{value === 100 ? t('train.fullyRecovered') : t('train.recovered')}</Text>
    </View>
  );
}

function CardBackdrop({ muted }: { muted: boolean }) {
  const glow = muted ? 0.07 : 0.2;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="base" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.surfaceAccent} />
            <Stop offset="1" stopColor={colors.surface} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#base)" />
      </Svg>
      {/* Weight-plate rings + volt glow anchored to the top-right corner. */}
      <Svg width={300} height={300} style={styles.plates}>
        <Defs>
          <RadialGradient id="glow" cx="210" cy="90" r="190" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={colors.accent} stopOpacity={glow} />
            <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={300} height={300} fill="url(#glow)" />
        {[150, 118, 88, 58].map((r, i) => (
          <Circle key={r} cx={210} cy={90} r={r} fill="none" stroke="#FFFFFF" strokeOpacity={0.05 + i * 0.012} />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.cardStroke,
    overflow: 'hidden',
    padding: space.xl,
    minHeight: 280,
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
  },
  cardShort: { minHeight: 0, padding: space.lg },
  plates: { position: 'absolute', top: -30, right: -60 },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md + 2,
    height: 30,
    borderRadius: radius.pill,
  },
  badgeAccent: { backgroundColor: colors.accent },
  badgeMuted: { backgroundColor: colors.control },
  badgeText: { ...type.badge },
  body: { marginTop: space.xxxl + space.lg },
  bodyShort: { marginTop: space.xxl },
  title: { ...type.heroTitle, color: colors.textPrimary },
  titleCompact: { fontSize: 25, lineHeight: 29 },
  muscles: { ...type.body, color: colors.textPrimary, opacity: 0.86, marginTop: space.xxs },
  meta: { ...type.meta, color: colors.textSecondary, marginTop: space.sm },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 2,
    marginTop: space.lg,
    paddingLeft: space.xs,
    paddingRight: space.lg,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  pillText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textPrimary },
  restIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.control,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
});
