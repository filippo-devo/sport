import { forwardRef, type ComponentRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { EXERCISE_BY_ID } from '../../data/exercises';
import type { Session, SessionExercise } from '../../data/types';
import { useT } from '../../i18n';
import { SHARE_BRAND, type ShareFormat } from '../../lib/share';
import { formatVolume, formatWeight } from '../../lib/units';
import { useStore } from '../../store';
import { sessionVolume } from '../../store/derived';
import { colors, fonts } from '../../theme/tokens';
import { BarbellIcon } from '../icons';

type Props = {
  session: Session;
  kcal: number;
  photo: string | null;
  format: ShareFormat;
  showExercises: boolean;
  /** On-screen width in points; everything inside scales from it so the export looks the same. */
  width: number;
};

/** Base width the sizes below were designed at. */
const BASE = 360;

/**
 * Post-workout share graphic: the user's photo full-bleed, workout name, time, calories,
 * optional exercise list and the app name at the bottom. Captured to a JPEG by the share screen.
 */
export const ShareCard = forwardRef<ComponentRef<typeof View>, Props>(function ShareCard({ session, kcal, photo, format, showExercises, width }, ref) {
  const { t, tn, L, dateShort } = useT();
  const units = useStore((s) => s.settings.units);
  const k = width / BASE;
  const height = format === 'story' ? (width * 16) / 9 : (width * 5) / 4;
  const minutes = Math.max(1, Math.round((session.endedAt - session.startedAt) / 60000));
  const volume = sessionVolume(session);
  const done = session.exercises.filter((e) => e.sets.some((s) => s.done));
  const maxRows = format === 'story' ? 5 : 3;
  const rows = done.slice(0, maxRows);
  const more = done.length - rows.length;
  const z = (n: number) => n * k;

  const exLine = (e: SessionExercise) => {
    const sets = e.sets.filter((s) => s.done);
    const tracking = EXERCISE_BY_ID[e.exerciseId]?.tracking;
    if (tracking === 'time') return `${sets.length} × ${Math.max(...sets.map((s) => s.seconds ?? 0))} s`;
    const reps = Math.max(...sets.map((s) => s.reps ?? 0));
    if (tracking === 'reps') return `${sets.length} × ${reps}`;
    const top = Math.max(...sets.map((s) => s.weight ?? 0));
    return top > 0 ? `${sets.length} × ${reps} · ${formatWeight(top, units)}` : `${sets.length} × ${reps}`;
  };

  return (
    <View ref={ref} collapsable={false} style={[styles.card, { width, height }]}>
      {photo ? (
        <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <>
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
            <Defs>
              <RadialGradient id="shareGlow" cx="0.85" cy="0.1" r="0.9">
                <Stop offset="0" stopColor={colors.accent} stopOpacity="0.22" />
                <Stop offset="1" stopColor={colors.accent} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={colors.bg} />
            <Rect width="100%" height="100%" fill="url(#shareGlow)" />
          </Svg>
          <View style={[styles.glyph, { top: z(70) }]}>
            <BarbellIcon size={z(220)} color="rgba(255,255,255,0.06)" weight="fill" />
          </View>
        </>
      )}

      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="shareShade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000" stopOpacity="0.35" />
            <Stop offset="0.16" stopColor="#000" stopOpacity="0" />
            <Stop offset={showExercises ? (format === 'post' ? 0.22 : 0.38) : 0.5} stopColor={colors.bg} stopOpacity="0" />
            <Stop offset="0.78" stopColor={colors.bg} stopOpacity="0.86" />
            <Stop offset="1" stopColor={colors.bg} stopOpacity="0.97" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#shareShade)" />
      </Svg>

      <View style={[styles.top, { padding: z(20) }]}>
        <Text style={[styles.date, { fontSize: z(12), letterSpacing: z(1.2) }]}>{dateShort(new Date(session.startedAt)).toUpperCase()}</Text>
        <View style={[styles.pill, { paddingHorizontal: z(9), paddingVertical: z(4), borderRadius: z(99) }]}>
          <Text style={[styles.pillText, { fontSize: z(10.5), letterSpacing: z(0.8) }]}>{t('share.badge').toUpperCase()}</Text>
        </View>
      </View>

      <View style={[styles.bottom, { paddingHorizontal: z(20), paddingBottom: z(format === 'story' ? 26 : 18) }]}>
        <Text style={[styles.title, { fontSize: z(34), lineHeight: z(36), marginBottom: z(14) }]} numberOfLines={2}>
          {L(session.name)}
        </Text>

        <View style={[styles.stats, { gap: z(10) }]}>
          <Stat k={k} label={t('workout.duration')} value={String(minutes)} unit="min" />
          <Stat k={k} label={t('share.kcal')} value={`~${kcal}`} unit="kcal" accent />
          {volume > 0 && <Stat k={k} label={t('workout.volume')} value={formatVolume(volume, units)} />}
        </View>

        {showExercises && rows.length > 0 && (
          <View style={{ marginTop: z(16), gap: z(7) }}>
            {rows.map((e, i) => (
              <View key={`${e.exerciseId}-${i}`} style={styles.exRow}>
                <Text style={[styles.exName, { fontSize: z(13.5) }]} numberOfLines={1}>
                  {L(EXERCISE_BY_ID[e.exerciseId]?.name ?? { en: '', pl: '' })}
                </Text>
                <Text style={[styles.exSets, { fontSize: z(13.5) }]}>{exLine(e)}</Text>
              </View>
            ))}
            {more > 0 && <Text style={[styles.exMore, { fontSize: z(12) }]}>+ {tn('unit.exercises', more)}</Text>}
          </View>
        )}

        <View style={[styles.brandRow, { marginTop: z(format === 'story' ? 22 : 16), paddingTop: z(12) }]}>
          <View style={[styles.brandDot, { width: z(7), height: z(7), borderRadius: z(4) }]} />
          <Text style={[styles.brand, { fontSize: z(13), letterSpacing: z(3) }]}>{SHARE_BRAND}</Text>
        </View>
      </View>
    </View>
  );
});

function Stat({ k, label, value, unit, accent }: { k: number; label: string; value: string; unit?: string; accent?: boolean }) {
  return (
    <View style={[styles.stat, { paddingVertical: k * 9, paddingHorizontal: k * 11, borderRadius: k * 12 }]}>
      <Text style={[styles.statLabel, { fontSize: k * 10, letterSpacing: k * 0.8 }]} numberOfLines={1}>
        {label.toUpperCase()}
      </Text>
      <Text style={[styles.statValue, { fontSize: k * 22, marginTop: k * 2 }, accent && { color: colors.accent }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
        {unit ? <Text style={[styles.statUnit, { fontSize: k * 12 }]}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', backgroundColor: colors.bg },
  glyph: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { fontFamily: fonts.semibold, color: colors.textPrimary },
  pill: { backgroundColor: colors.accent },
  pillText: { fontFamily: fonts.bold, color: colors.textOnAccent },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  title: { fontFamily: fonts.bold, color: colors.textPrimary, letterSpacing: -0.3 },
  stats: { flexDirection: 'row' },
  stat: { flex: 1, minWidth: 0, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)' },
  statLabel: { fontFamily: fonts.semibold, color: colors.textSecondary },
  statValue: { fontFamily: fonts.bold, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  statUnit: { fontFamily: fonts.medium, color: colors.textSecondary },
  exRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  exName: { flex: 1, fontFamily: fonts.medium, color: colors.textPrimary },
  exSets: { fontFamily: fonts.semibold, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  exMore: { fontFamily: fonts.medium, color: colors.textSecondary },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.18)' },
  brandDot: { backgroundColor: colors.accent },
  brand: { fontFamily: fonts.bold, color: colors.textPrimary },
});
