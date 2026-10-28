import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ExerciseTile } from '../../components/EquipmentGlyph';
import { TrashIcon, TrophyIcon } from '../../components/icons';
import { Button, Card, Divider, SectionTitle } from '../../components/ui/controls';
import { NavBar } from '../../components/ui/headers';
import { Screen } from '../../components/ui/layout';
import { ConfirmSheet } from '../../components/ui/sheets';
import { EXERCISE_BY_ID } from '../../data/exercises';
import type { SetEntry } from '../../data/types';
import { useT } from '../../i18n';
import { hhmm } from '../../lib/date';
import { formatVolume, formatWeight } from '../../lib/units';
import { useStore } from '../../store';
import { doneSets, sessionPRs, sessionVolume } from '../../store/derived';
import { colors, fonts, space, type } from '../../theme/tokens';

/** Post-workout summary (fresh=1) and history detail for a finished session. */
export default function SessionScreen() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const { t, tn, L, dateLong } = useT();
  const sessions = useStore((s) => s.sessions);
  const units = useStore((s) => s.settings.units);
  const deleteSession = useStore((s) => s.deleteSession);
  const [confirm, setConfirm] = useState(false);
  const session = sessions.find((s) => s.id === id);
  if (!session) return <Screen top={<NavBar />}>{null}</Screen>;

  const prs = sessionPRs(sessions, session);
  const isFresh = fresh === '1';
  const minutes = Math.round((session.endedAt - session.startedAt) / 60000);

  const setText = (exerciseId: string, s: SetEntry) => {
    const tracking = EXERCISE_BY_ID[exerciseId]?.tracking;
    if (tracking === 'time') return `${s.seconds ?? 0} s`;
    if (tracking === 'reps') return `× ${s.reps ?? 0}`;
    return `${formatWeight(s.weight ?? 0, units)} × ${s.reps ?? 0}`;
  };

  const prText = (exerciseId: string) => {
    const pr = prs.find((p) => p.exerciseId === exerciseId)!.best;
    const tracking = EXERCISE_BY_ID[exerciseId]?.tracking;
    if (tracking === 'time') return `${pr.seconds} s`;
    if (tracking === 'reps') return `${pr.reps}`;
    return `${formatWeight(pr.weight, units)} × ${pr.reps} · 1RM ${formatWeight(pr.e1rm, units)}`;
  };

  return (
    <Screen
      top={
        <NavBar
          title={isFresh ? undefined : L(session.name)}
          onBack={isFresh ? () => router.replace('/train') : undefined}
        />
      }
    >
      {isFresh && (
        <View style={styles.hero}>
          <View style={styles.trophy}>
            <TrophyIcon size={34} color={colors.textOnAccent} weight="fill" />
          </View>
          <Text style={styles.heroKicker}>{t('summary.complete')}</Text>
          <Text style={styles.heroTitle}>{L(session.name)}</Text>
        </View>
      )}
      <Text style={[styles.date, isFresh && { textAlign: 'center' }]}>
        {dateLong(new Date(session.startedAt))} · {hhmm(session.startedAt)}
      </Text>

      <Card style={styles.stats}>
        <Stat label={t('workout.duration')} value={t('unit.min', { n: minutes })} />
        <Stat label={t('workout.volume')} value={formatVolume(sessionVolume(session), units)} />
        <Stat label={t('workout.sets')} value={String(doneSets(session.exercises))} />
        <Stat label={t('summary.prsShort')} value={String(prs.length)} accent={prs.length > 0} />
      </Card>

      {prs.length > 0 && (
        <>
          <SectionTitle style={styles.section} title={t('summary.prs')} />
          <View style={styles.prs}>
            {prs.map((p) => (
              <View key={p.exerciseId} style={styles.pr}>
                <TrophyIcon size={18} color={colors.accent} weight="fill" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.prName} numberOfLines={1}>
                    {L(EXERCISE_BY_ID[p.exerciseId].name)}
                  </Text>
                  <Text style={styles.prValue}>{prText(p.exerciseId)}</Text>
                </View>
                <Text style={styles.prBadge}>{t('summary.newPr')}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <SectionTitle style={styles.section} title={t('summary.exercises')} aside={tn('unit.exercises', session.exercises.length)} />
      <View style={styles.exList}>
        {session.exercises.map((e, i) => {
          const ex = EXERCISE_BY_ID[e.exerciseId];
          if (!ex) return null;
          return (
            <Card key={`${e.exerciseId}-${i}`} onPress={() => router.push(`/exercise/${ex.id}`)} accessibilityLabel={L(ex.name)}>
              <View style={styles.exHead}>
                <ExerciseTile equipment={ex.equipment} size={40} />
                <Text style={styles.exName} numberOfLines={2}>
                  {L(ex.name)}
                </Text>
              </View>
              {e.sets.map((s, j) => (
                <View key={j}>
                  <Divider />
                  <View style={styles.setRow}>
                    <Text style={styles.setNo}>{j + 1}</Text>
                    <Text style={styles.setText}>{setText(e.exerciseId, s)}</Text>
                  </View>
                </View>
              ))}
            </Card>
          );
        })}
      </View>

      {isFresh ? (
        <Button label={t('common.done')} onPress={() => router.replace('/train')} style={styles.section} />
      ) : (
        <Button label={t('summary.delete')} variant="danger" icon={TrashIcon} onPress={() => setConfirm(true)} style={styles.section} />
      )}

      <ConfirmSheet
        visible={confirm}
        title={t('summary.delete')}
        body={t('summary.deleteBody')}
        confirmLabel={t('common.delete')}
        destructive
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          router.back();
          deleteSession(session.id);
        }}
      />
    </Screen>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.statValue, accent && { color: colors.accent }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.sm, marginTop: space.md },
  trophy: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  heroKicker: { ...type.badge, color: colors.accent, fontSize: 13 },
  heroTitle: { ...type.heroTitle, color: colors.textPrimary, textAlign: 'center' },
  date: { ...type.body, color: colors.textSecondary, marginTop: space.sm },
  stats: { flexDirection: 'row', marginTop: space.xl, paddingHorizontal: space.md },
  stat: { flex: 1, gap: 2, minWidth: 0 },
  statLabel: { ...type.caption, color: colors.textSecondary },
  statValue: { fontFamily: fonts.bold, fontSize: 19, color: colors.textPrimary },
  section: { marginTop: space.xxl },
  prs: { gap: space.sm, marginTop: space.md },
  pr: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.accentStroke,
    backgroundColor: colors.surfaceAccent,
  },
  prName: { ...type.itemTitle, color: colors.textPrimary },
  prValue: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  prBadge: { ...type.badge, fontSize: 11, color: colors.accent },
  exList: { gap: space.md, marginTop: space.md },
  exHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm },
  exName: { ...type.itemTitle, fontFamily: fonts.semibold, color: colors.textPrimary, flex: 1 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  setNo: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textSecondary, width: 20 },
  setText: { fontFamily: fonts.medium, fontSize: 15, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
});
