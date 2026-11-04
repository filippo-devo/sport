import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { WORKOUT_IMAGES } from '../../data/workoutImages';
import { useT } from '../../i18n';
import { formatVolume } from '../../lib/units';
import { useStore } from '../../store';
import { routineMinutes, routineMuscles, sessionVolume, type PlanDay } from '../../store/derived';
import { colors, radius, space, type } from '../../theme/tokens';
import { BarbellIcon, CheckIcon, MoonIcon, PlayIcon } from '../icons';
import { Button } from '../ui/controls';

/**
 * Today's workout as a full-bleed hero (Tonal / Gymshark pattern): a photo of the workout
 * when one is set in data/workoutImages, otherwise a volt-tinted gradient, with the start
 * button on the card.
 */
export function WorkoutHero({ day, next, active, onStart }: { day: PlanDay; next?: PlanDay; active: boolean; onStart: () => void }) {
  const { t, tn, L, weekdayLong } = useT();
  const units = useStore((s) => s.settings.units);
  const r = day.routine;
  const s = day.session;
  const image = r ? WORKOUT_IMAGES[r.id] : undefined;

  const open = s ? () => router.push(`/session/${s.id}`) : r ? () => router.push(`/routine/${r.id}`) : undefined;

  return (
    <Pressable onPress={open} disabled={!open} accessibilityRole={open ? 'button' : undefined} style={({ pressed }) => [styles.card, pressed && { opacity: 0.94 }]}>
      {image ? <Image source={image} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Backdrop muted={!r || !!s} />}
      {!image && (r || s) && (
        <View style={styles.glyph} pointerEvents="none">
          <BarbellIcon size={150} color="rgba(255,255,255,0.07)" weight="fill" />
        </View>
      )}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.25" stopColor={colors.bg} stopOpacity="0" />
            <Stop offset="1" stopColor={colors.bg} stopOpacity="0.92" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#shade)" />
      </Svg>

      <View style={styles.body}>
        {s ? (
          <>
            <View style={[styles.badge, { backgroundColor: colors.success }]}>
              <CheckIcon size={12} color={colors.textOnAccent} weight="bold" />
              <Text style={styles.badgeText}>{t('today.doneTitle').toUpperCase()}</Text>
            </View>
            <Text style={styles.title}>{L(s.name)}</Text>
            <Text style={styles.meta}>
              {t('today.doneBody', {
                name: tn('unit.exercises', s.exercises.length),
                min: Math.round((s.endedAt - s.startedAt) / 60000),
                volume: formatVolume(sessionVolume(s), units),
              })}
            </Text>
          </>
        ) : r ? (
          <>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t('today.workoutKicker')}</Text>
            </View>
            <Text style={styles.title}>{L(r.name)}</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {[routineMuscles(r).slice(0, 3).map((m) => t(`muscle.${m}`)).join(', '), t('unit.min', { n: routineMinutes(r) }), tn('unit.exercises', r.items.length)]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            <Button label={active ? t('quick.resumeWorkout') : t('train.start')} icon={PlayIcon} onPress={onStart} style={styles.cta} />
          </>
        ) : (
          <>
            <View style={styles.rest}>
              <MoonIcon size={22} color={colors.textPrimary} weight="fill" />
            </View>
            <Text style={styles.title}>{t('today.restDay')}</Text>
            {next?.routine && <Text style={styles.meta}>{t('today.restBody', { name: L(next.routine.name), day: weekdayLong(next.date) })}</Text>}
          </>
        )}
      </View>
    </Pressable>
  );
}

function Backdrop({ muted }: { muted: boolean }) {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="glow" cx="78%" cy="18%" rx="85%" ry="75%">
          <Stop offset="0" stopColor={muted ? '#2A3542' : '#3B4D24'} stopOpacity="1" />
          <Stop offset="0.5" stopColor="#17212C" stopOpacity="1" />
          <Stop offset="1" stopColor={colors.surface} stopOpacity="1" />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#glow)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 280,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardStroke,
    justifyContent: 'flex-end',
  },
  glyph: { position: 'absolute', right: -18, top: 6, transform: [{ rotate: '-18deg' }] },
  body: { padding: space.lg + 2, gap: 2 },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm + 2,
    paddingVertical: 5,
    marginBottom: space.sm,
  },
  badgeText: { ...type.badge, color: colors.textOnAccent },
  title: { ...type.heroTitle, color: colors.textPrimary },
  meta: { ...type.meta, color: colors.textSecondary },
  cta: { marginTop: space.md + 2 },
  rest: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.control, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
});
