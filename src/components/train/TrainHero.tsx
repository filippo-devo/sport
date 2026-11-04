import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { Muscle } from '../../data/types';
import { TRAIN_IMAGES, WORKOUT_IMAGES } from '../../data/workoutImages';
import { useT } from '../../i18n';
import { formatVolume } from '../../lib/units';
import { useStore } from '../../store';
import { routineMinutes, routineSets, sessionVolume, type PlanDay } from '../../store/derived';
import { colors, fonts, radius, space, statusColor, type } from '../../theme/tokens';
import { BarbellIcon, CheckIcon, MoonIcon, PencilSimpleIcon, PlayIcon, StackIcon, TimerIcon, type Icon } from '../icons';
import { Button, IconButton } from '../ui/controls';

type Props = {
  day: PlanDay;
  muscles: { muscle: Muscle; recovery: number }[];
  /** The selected day is today and its workout isn't logged yet: show Start. */
  startable: boolean;
  resumable: boolean;
  onStart: () => void;
  onOpen?: () => void;
  onEdit?: () => void;
};

/**
 * Selected day on Train as a photo hero (Ladder / Centr pattern). Target muscles and
 * their recovery sit on the card as chips; Start and Edit live on the card, so the
 * screen has no floating CTA.
 */
export function TrainHero({ day, muscles, startable, resumable, onStart, onOpen, onEdit }: Props) {
  const { t, tn, L, weekdayShort, dateShort } = useT();
  const units = useStore((s) => s.settings.units);
  const r = day.routine;
  const s = day.session;
  const image = r ? (TRAIN_IMAGES[r.id] ?? WORKOUT_IMAGES[r.id]) : undefined;
  const when = `${weekdayShort(day.date)} ${dateShort(day.date)}`.toUpperCase();

  const badge =
    day.status === 'today'
      ? { label: t('train.badgeToday'), bg: colors.accent, fg: colors.textOnAccent }
      : day.status === 'done'
        ? { label: t('train.badgeDone'), bg: colors.success, fg: colors.textOnAccent, icon: CheckIcon }
        : day.status === 'missed'
          ? { label: t('train.badgeMissed', { day: when }), bg: colors.control, fg: colors.textSecondary }
          : day.status === 'rest'
            ? { label: t('train.badgeRest', { day: when }), bg: colors.control, fg: colors.textSecondary }
            : { label: t('train.badgePlanned', { day: when }), bg: colors.control, fg: colors.textPrimary };

  return (
    <Pressable
      onPress={onOpen}
      disabled={!onOpen}
      accessibilityRole={onOpen ? 'button' : undefined}
      style={({ pressed }) => [styles.card, (r || s) && styles.cardTall, !!image && styles.cardPhoto, pressed && { opacity: 0.95 }]}
    >
      {image ? <Image source={image} style={styles.photo} resizeMode="cover" /> : <Backdrop muted={!r || day.status === 'done'} />}
      {!image && (r || s) && (
        <View style={styles.glyph} pointerEvents="none">
          <BarbellIcon size={150} color="rgba(255,255,255,0.07)" weight="fill" />
        </View>
      )}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <LinearGradient id="trainShade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset={image ? 0.35 : 0.2} stopColor={colors.bg} stopOpacity="0" />
            <Stop offset="0.8" stopColor={colors.bg} stopOpacity="0.88" />
            <Stop offset="1" stopColor={colors.bg} stopOpacity="0.96" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#trainShade)" />
      </Svg>

      <View style={styles.body}>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          {badge.icon && <badge.icon size={12} color={badge.fg} weight="bold" />}
          <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text>
        </View>

        {s ? (
          <>
            <Text style={styles.title}>{L(s.name)}</Text>
            <View style={styles.meta}>
              <Meta icon={TimerIcon} text={t('unit.min', { n: Math.round((s.endedAt - s.startedAt) / 60000) })} />
              <Meta icon={BarbellIcon} text={tn('unit.exercises', s.exercises.length)} />
              <Meta icon={StackIcon} text={formatVolume(sessionVolume(s), units)} />
            </View>
            <Button label={t('train.viewSummary')} variant="secondary" onPress={onOpen ?? (() => {})} style={styles.cta} />
          </>
        ) : r ? (
          <>
            <Text style={styles.title}>{L(r.name)}</Text>
            <View style={styles.meta}>
              <Meta icon={TimerIcon} text={t('unit.min', { n: routineMinutes(r) })} />
              <Meta icon={BarbellIcon} text={tn('unit.exercises', r.items.length)} />
              <Meta icon={StackIcon} text={tn('unit.sets', routineSets(r))} />
            </View>
            {muscles.length > 0 && (
              <View style={styles.chips}>
                {muscles.map((m) => (
                  <View key={m.muscle} style={styles.chip} accessible accessibilityLabel={`${t(`muscle.${m.muscle}`)}: ${t('train.recovered')} ${m.recovery}%`}>
                    <View style={[styles.chipDot, { backgroundColor: statusColor(m.recovery) }]} />
                    <Text style={styles.chipText}>
                      {t(`muscle.${m.muscle}`)} {m.recovery}%
                    </Text>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.actions}>
              {startable ? (
                <Button label={resumable ? t('train.resume') : t('train.start')} icon={PlayIcon} onPress={onStart} style={styles.start} />
              ) : (
                <Button label={t('train.viewWorkout')} variant="secondary" onPress={onOpen ?? (() => {})} style={styles.start} />
              )}
              {onEdit && <IconButton icon={PencilSimpleIcon} label={t('train.editWorkout')} onPress={onEdit} size={52} style={styles.round} />}
            </View>
          </>
        ) : (
          <>
            <View style={styles.rest}>
              <MoonIcon size={22} color={colors.textPrimary} weight="fill" />
            </View>
            <Text style={styles.title}>{t('train.restDay')}</Text>
            <Text style={styles.restBody}>{t('train.restBody')}</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

function Meta({ icon: Glyph, text }: { icon: Icon; text: string }) {
  return (
    <View style={styles.metaItem}>
      <Glyph size={16} color={colors.textSecondary} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

function Backdrop({ muted }: { muted: boolean }) {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <RadialGradient id="trainGlow" cx="78%" cy="18%" rx="85%" ry="75%">
          <Stop offset="0" stopColor={muted ? '#2A3542' : '#3B4D24'} stopOpacity="1" />
          <Stop offset="0.5" stopColor="#17212C" stopOpacity="1" />
          <Stop offset="1" stopColor={colors.surface} stopOpacity="1" />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#trainGlow)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 240,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardStroke,
    justifyContent: 'flex-end',
  },
  cardTall: { minHeight: 320 },
  cardPhoto: { minHeight: 440 },
  photo: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  glyph: { position: 'absolute', right: -18, top: 6, transform: [{ rotate: '-18deg' }] },
  body: { padding: space.xl },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm + 2,
    paddingVertical: 5,
    marginBottom: space.sm + 2,
  },
  badgeText: { ...type.badge },
  title: { ...type.heroTitle, fontSize: 30, lineHeight: 34, color: colors.textPrimary },
  meta: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.md + 2, rowGap: 4, marginTop: space.xs },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { ...type.meta, color: colors.textSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  chipDot: { width: 7, height: 7, borderRadius: 3.5 },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textPrimary },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, marginTop: space.lg },
  start: { flex: 1 },
  round: { backgroundColor: 'rgba(255,255,255,0.12)' },
  cta: { marginTop: space.lg },
  rest: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.control, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  restBody: { ...type.meta, color: colors.textSecondary, marginTop: space.xs },
});
