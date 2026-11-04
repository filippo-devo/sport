import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EXERCISE_BY_ID } from '../../data/exercises';
import { useT, type TKey } from '../../i18n';
import { formatNumber, formatWeight } from '../../lib/units';
import { useStore } from '../../store';
import { daysAgo, STRENGTH_LIFTS, strengthScore } from '../../store/progress';
import { colors, fonts, space, statusColor, type } from '../../theme/tokens';
import { InfoIcon } from '../icons';
import { Card, Divider, ProgressBar } from '../ui/controls';
import { Ring } from '../ui/Ring';

/** Strength score: the main lifts' estimated 1RM relative to body weight, 0–100. */
export function StrengthScore({ onLogWeight }: { onLogWeight: () => void }) {
  const { t, L } = useT();
  const sessions = useStore((s) => s.sessions);
  const weighIns = useStore((s) => s.weighIns);
  const units = useStore((s) => s.settings.units);
  const [info, setInfo] = useState(false);

  const { now, before } = useMemo(
    () => ({ now: strengthScore(sessions, weighIns), before: strengthScore(sessions, weighIns, daysAgo(30)) }),
    [sessions, weighIns],
  );
  const score = now.score;
  const delta = score != null && before.score != null ? score - before.score : null;
  const color = score == null ? colors.track : statusColor(score);

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Ring value={(score ?? 0) / 100} size={92} stroke={8} color={color}>
          <Text style={styles.score}>{score ?? '—'}</Text>
        </Ring>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={styles.titleRow}>
            <Text style={styles.title} accessibilityRole="header">
              {t('progress.strengthScore')}
            </Text>
            <Pressable onPress={() => setInfo((v) => !v)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('progress.scoreInfo')}>
              <InfoIcon size={18} color={info ? colors.textPrimary : colors.textSecondary} />
            </Pressable>
          </View>
          <Text style={styles.sub}>{t('progress.scoreSub')}</Text>
          {delta != null && delta !== 0 && (
            <Text style={[styles.delta, { color: delta > 0 ? colors.success : colors.danger }]}>
              {t('progress.scoreDelta', { d: `${delta > 0 ? '+' : '−'}${Math.abs(delta)}` })}
            </Text>
          )}
        </View>
      </View>

      {info && <Text style={styles.info}>{t('progress.scoreInfo')}</Text>}

      {now.needsWeight ? (
        <Pressable onPress={onLogWeight} accessibilityRole="button">
          <Text style={styles.hint}>
            {t('progress.scoreNeedsWeight')} <Text style={styles.link}>{t('quick.logWeight')}</Text>
          </Text>
        </Pressable>
      ) : now.lifts.length === 0 ? (
        <Text style={styles.hint}>{t('progress.scoreNeedsLifts')}</Text>
      ) : (
        <View>
          {STRENGTH_LIFTS.map((lift, i) => {
            const s = now.lifts.find((l) => l.id === lift.id);
            const ex = s ? EXERCISE_BY_ID[s.exerciseId] : undefined;
            return (
              <View key={lift.id}>
                {i > 0 && <Divider />}
                <Pressable
                  style={styles.lift}
                  disabled={!ex}
                  onPress={() => ex && router.push(`/exercise/${ex.id}`)}
                  accessibilityRole={ex ? 'button' : undefined}
                >
                  <View style={styles.liftHead}>
                    <Text style={styles.liftName} numberOfLines={1}>
                      {ex && s?.exerciseId !== lift.variants[0][0] ? L(ex.name) : t(`lift.${lift.id}` as TKey)}
                    </Text>
                    <Text style={styles.liftValue}>
                      {s ? `${formatWeight(s.e1rm, units)} · ${t('progress.bwRatio', { r: formatNumber(s.ratio, 2) })}` : '—'}
                    </Text>
                  </View>
                  <ProgressBar value={(s?.score ?? 0) / 100} color={s ? statusColor(s.score) : colors.track} height={5} />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: space.xl, gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  score: { fontFamily: fonts.bold, fontSize: 30, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  title: { ...type.sectionTitle, color: colors.textPrimary, flexShrink: 1 },
  sub: { ...type.caption, color: colors.textSecondary },
  delta: { ...type.caption, fontFamily: fonts.semibold, marginTop: 2 },
  info: { ...type.caption, color: colors.textSecondary, lineHeight: 17 },
  hint: { ...type.body, color: colors.textSecondary },
  link: { color: colors.accent, fontFamily: fonts.semibold },
  lift: { paddingVertical: space.sm + 2, gap: space.xs },
  liftHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.sm },
  liftName: { ...type.body, color: colors.textPrimary, flex: 1 },
  liftValue: { ...type.caption, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
});
