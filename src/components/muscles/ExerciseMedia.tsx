import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { EXERCISE_IMAGES } from '../../data/exerciseImages';
import type { Exercise } from '../../data/types';
import { useT } from '../../i18n';
import { colors, radius, space, type } from '../../theme/tokens';
import { MuscleBody, MuscleRing, MUSCLE_TONE } from './MuscleMap';

/** Photo (or dark gradient) behind the exercise, with the muscle ring in the corner. */
function Backdrop({ id, shade }: { id: string; shade: boolean }) {
  const image = EXERCISE_IMAGES[id];
  return (
    <>
      {image ? <Image source={image} style={styles.fill} resizeMode="cover" /> : null}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <LinearGradient id={`exShade-${id}-${shade ? 1 : 0}`} x1="0" y1="0" x2="1" y2="1">
            {image
              ? [
                  <Stop key="a" offset="0" stopColor={colors.bg} stopOpacity="0" />,
                  <Stop key="b" offset={shade ? '0.45' : '1'} stopColor={colors.bg} stopOpacity={shade ? '0' : '0.15'} />,
                ]
              : [<Stop key="a" offset="0" stopColor="#1B2631" />, <Stop key="b" offset="1" stopColor="#0E161E" />]}
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#exShade-${id}-${shade ? 1 : 0})`} />
      </Svg>
    </>
  );
}

/** Hero card at the top of the exercise screen. */
export function ExerciseHero({ exercise }: { exercise: Exercise }) {
  const { t, L } = useT();
  return (
    <View style={styles.hero}>
      <Backdrop id={exercise.id} shade />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <LinearGradient id="exHeroBottom" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.4" stopColor={colors.bg} stopOpacity="0" />
            <Stop offset="1" stopColor={colors.bg} stopOpacity="0.95" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#exHeroBottom)" />
      </Svg>
      <View style={styles.heroBody}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.kicker} numberOfLines={1}>
            {`${t(`muscle.${exercise.muscle}`)} · ${t(`equipment.${exercise.equipment}`)}`.toUpperCase()}
          </Text>
          <Text style={styles.title} accessibilityRole="header">
            {L(exercise.name)}
          </Text>
        </View>
        <MuscleRing primary={exercise.muscle} secondary={exercise.secondary} size={76} />
      </View>
    </View>
  );
}

/** Square thumbnail for exercise rows: photo or gradient, muscle ring bottom right. */
export function ExerciseThumb({ exercise, size, label }: { exercise: Exercise; size: number; label?: string }) {
  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.thumb, { width: size, height: size }]}>
        <Backdrop id={exercise.id} shade={false} />
        {label && !EXERCISE_IMAGES[exercise.id] ? <Text style={styles.thumbLabel}>{label}</Text> : null}
      </View>
      <View style={styles.thumbRing}>
        <MuscleRing primary={exercise.muscle} secondary={exercise.secondary} size={Math.round(size * 0.46)} />
      </View>
    </View>
  );
}

/** "Muscles worked": front and back figure with a legend. */
export function MusclesWorked({ exercise }: { exercise: Exercise }) {
  const { t } = useT();
  return (
    <View style={styles.card}>
      <MuscleBody primary={exercise.muscle} secondary={exercise.secondary} height={210} />
      <View style={styles.legend}>
        <View>
          <View style={styles.legendHead}>
            <View style={[styles.dot, { backgroundColor: MUSCLE_TONE.primary }]} />
            <Text style={styles.legendLabel}>{t('exercise.primary')}</Text>
          </View>
          <Text style={styles.legendValue}>{t(`muscle.${exercise.muscle}`)}</Text>
        </View>
        {exercise.secondary.length > 0 && (
          <View>
            <View style={styles.legendHead}>
              <View style={[styles.dot, { backgroundColor: MUSCLE_TONE.secondary }]} />
              <Text style={styles.legendLabel}>{t('exercise.secondary')}</Text>
            </View>
            <Text style={styles.legendValue}>{exercise.secondary.map((m) => t(`muscle.${m}`)).join(', ')}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  hero: {
    height: 320,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    marginTop: space.sm,
    justifyContent: 'flex-end',
  },
  heroBody: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md, padding: space.lg },
  kicker: { ...type.caption, color: colors.accent, letterSpacing: 1 },
  title: { ...type.heroTitle, fontSize: 26, lineHeight: 30, color: colors.textPrimary, marginTop: space.xs },
  thumb: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface },
  thumbLabel: { position: 'absolute', top: 7, left: 9, ...type.caption, color: colors.textSecondary },
  thumbRing: { position: 'absolute', right: -6, bottom: -6 },
  card: {
    marginTop: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
  },
  legend: { flex: 1, gap: space.lg },
  legendHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { ...type.caption, color: colors.textSecondary },
  legendValue: { ...type.body, color: colors.textPrimary, marginTop: 2 },
});
