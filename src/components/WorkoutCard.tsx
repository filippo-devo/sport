// Deep imports keep the other ~9k Phosphor icons out of the bundle.
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { MoonIcon } from 'phosphor-react-native/src/icons/Moon';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { totalSets, type TrainingDay } from '../data/training';
import { colors, fonts, radius, space, type } from '../theme/tokens';
import { RecoveryRing } from './RecoveryRing';

type Props = {
  day: TrainingDay;
  compact: boolean; // narrow phones get a slightly smaller hero title
  short: boolean; // short phones (SE-class) get a tighter card
};

// Featured card for the selected day. Gravl uses a full-bleed trainer photo
// here; without licensed imagery we keep the same frame (24 pt radius,
// hairline stroke, volt badge, recovery pill) over a layered volt glow.
export function WorkoutCard({ day, compact, short }: Props) {
  const w = day.workout;

  return (
    <View style={[styles.card, short && styles.cardShort]}>
      <CardBackdrop muted={!w || day.status === 'done'} />

      <Badge status={day.status} label={`${day.weekday} ${day.date}`} />

      {w ? (
        <View style={[styles.body, short && styles.bodyShort]}>
          <Text style={[styles.title, compact && styles.titleCompact]}>{w.name}</Text>
          <Text style={styles.muscles}>{w.muscles.map((m) => m.name).join(', ')}</Text>
          <Text style={styles.meta}>
            {w.durationMin} mins  •  {w.exercises.length} exercises  •  {totalSets(w)} sets
          </Text>
          <RecoveredPill value={Math.round(w.muscles.reduce((s, m) => s + m.recovery, 0) / w.muscles.length)} />
        </View>
      ) : (
        <View style={[styles.body, short && styles.bodyShort]}>
          <View style={styles.restIcon}>
            <MoonIcon size={22} color={colors.textPrimary} weight="fill" />
          </View>
          <Text style={[styles.title, compact && styles.titleCompact]}>Rest day</Text>
          <Text style={styles.meta}>Recovery is part of the plan. Light walking and mobility are fine.</Text>
        </View>
      )}
    </View>
  );
}

function Badge({ status, label }: { status: TrainingDay['status']; label: string }) {
  if (status === 'today') {
    return (
      <View style={[styles.badge, styles.badgeAccent]}>
        <Text style={[styles.badgeText, { color: colors.textOnAccent }]}>TODAY'S WORKOUT</Text>
      </View>
    );
  }
  if (status === 'done') {
    return (
      <View style={[styles.badge, styles.badgeMuted]}>
        <CheckIcon size={13} color={colors.success} weight="bold" />
        <Text style={[styles.badgeText, { color: colors.success }]}>COMPLETED</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, styles.badgeMuted]}>
      <Text style={[styles.badgeText, { color: colors.textPrimary }]}>
        {status === 'rest' ? 'RECOVERY' : 'PLANNED'} · {label.toUpperCase()}
      </Text>
    </View>
  );
}

function RecoveredPill({ value }: { value: number }) {
  return (
    <View style={styles.pill}>
      <RecoveryRing value={value} size={34} stroke={2.5} />
      <Text style={styles.pillText}>{value === 100 ? 'Fully recovered' : 'Recovered'}</Text>
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
