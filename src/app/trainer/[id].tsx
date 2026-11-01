import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSession } from '../../backend/auth';
import { assignPlan, clientPlans, deleteAssignedPlan, disconnect } from '../../backend/coach';
import type { CoachPlanRow } from '../../backend/sync';
import { useClients } from '../../components/coach/useClients';
import { ClipboardTextIcon, PlusIcon, TrashIcon, UsersIcon } from '../../components/icons';
import { BarChart, ChartHeadline } from '../../components/ui/charts';
import { Button, Card, Divider, Notice, SectionTitle } from '../../components/ui/controls';
import { NavBar } from '../../components/ui/headers';
import { Screen } from '../../components/ui/layout';
import { ConfirmSheet, Sheet } from '../../components/ui/sheets';
import { useT } from '../../i18n';
import { addDays, startOfDay, startOfWeek } from '../../lib/date';
import { formatNumber, formatVolume } from '../../lib/units';
import { useStore } from '../../store';
import { doneSets, sessionVolume } from '../../store/derived';
import { periodTotals, workoutsPerWeek } from '../../store/stats';
import { colors, fonts, space, type } from '../../theme/tokens';

/** One client: live stats from their synced workouts, plans assigned to them, and assigning a plan. */
export default function ClientScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { t, tn, L, dateShort } = useT();
  const { session } = useSession();
  const { workouts, weeks } = useClients();
  const units = useStore((s) => s.settings.units);
  const lang = useStore((s) => s.settings.lang);
  const myPlans = useStore((s) => s.programs.filter((p) => p.source === 'user' || p.source === 'ai'));
  const routines = useStore((s) => s.routines);
  const [plans, setPlans] = useState<CoachPlanRow[]>([]);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [confirm, setConfirm] = useState<'disconnect' | CoachPlanRow | null>(null);

  const loadPlans = useCallback(async () => {
    try {
      setPlans(await clientPlans(id));
    } catch {
      setError(true);
    }
  }, [id]);
  useEffect(() => {
    Promise.resolve().then(loadPlans);
  }, [loadPlans]);

  const list = workouts[id] ?? [];
  const now = new Date();
  const tomorrow = addDays(startOfDay(now), 1).getTime();
  const week = periodTotals(list, startOfWeek(now).getTime(), tomorrow);
  const four = periodTotals(list, addDays(startOfWeek(now), -21).getTime(), tomorrow);
  const perWeek = workoutsPerWeek(list, weeks, now);

  return (
    <Screen top={<NavBar title={name || t('trainer.client')} />}>
      {error && <Notice icon={UsersIcon} text={t('trainer.loadError')} />}
      <View style={styles.tiles}>
        <Tile value={String(week.workouts)} label={t('stats.weekGoal')} />
        <Tile value={String(four.workouts)} label={t('trainer.last4Weeks')} />
        <Tile value={formatVolume(four.volume, units)} label={t('trainer.volume4w')} />
      </View>

      <SectionTitle style={styles.section} title={t('stats.perWeek')} aside={t('stats.lastWeeks', { n: weeks })} />
      <Card style={styles.card}>
        <ChartHeadline value={t('stats.avgPerWeek', { n: formatNumber(perWeek.slice(0, -1).reduce((n, w) => n + w.count, 0) / Math.max(1, weeks - 1), 1) })} />
        <BarChart values={perWeek.map((w) => w.count)} color={colors.success} labels={perWeek.map((w, i) => (i % 3 === 2 ? dateShort(w.week) : ''))} />
      </Card>

      <SectionTitle style={styles.section} title={t('trainer.assignedPlans')} />
      <Card style={styles.list}>
        {plans.length === 0 && <Text style={[styles.meta, { paddingVertical: space.md }]}>{t('trainer.noPlans')}</Text>}
        {plans.map((p, i) => (
          <View key={p.id}>
            {i > 0 && <Divider />}
            <View style={styles.row}>
              <ClipboardTextIcon size={20} color={colors.accent} weight="fill" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.meta}>{t('trainer.updated', { date: dateShort(new Date(p.updated_at)) })}</Text>
              </View>
              <Pressable onPress={() => setConfirm(p)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.delete')}>
                <TrashIcon size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>
        ))}
      </Card>
      <Button label={t('trainer.assign')} icon={PlusIcon} variant="secondary" onPress={() => setPicking(true)} style={{ marginTop: space.md }} />
      <Text style={[styles.meta, { marginTop: space.sm }]}>{t('trainer.assignNote')}</Text>

      <SectionTitle style={styles.section} title={t('trainer.recent')} />
      <Card style={styles.list}>
        {list.length === 0 && <Text style={[styles.meta, { paddingVertical: space.md }]}>{t('trainer.noWorkouts')}</Text>}
        {list.slice(0, 15).map((s, i) => (
          <View key={s.id}>
            {i > 0 && <Divider />}
            <View style={styles.row}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {L(s.name)}
                </Text>
                <Text style={styles.meta}>
                  {dateShort(new Date(s.startedAt))} · {t('unit.min', { n: Math.round((s.endedAt - s.startedAt) / 60000) })} · {tn('unit.sets', doneSets(s.exercises))}
                </Text>
              </View>
              <Text style={styles.value}>{formatVolume(sessionVolume(s), units)}</Text>
            </View>
          </View>
        ))}
      </Card>

      <Button label={t('trainer.removeClient')} variant="danger" onPress={() => setConfirm('disconnect')} style={{ marginTop: space.xxl }} />

      <Sheet visible={picking} onClose={() => setPicking(false)} title={t('trainer.pickPlan')}>
        {myPlans.length === 0 && (
          <>
            <Text style={styles.meta}>{t('trainer.noOwnPlans')}</Text>
            <Button
              label={t('plans.create')}
              variant="secondary"
              onPress={() => {
                setPicking(false);
                router.push('/plan-edit');
              }}
            />
          </>
        )}
        {myPlans.map((p) => (
          <Button
            key={p.id}
            label={L(p.name)}
            variant="secondary"
            loading={busy === p.id}
            onPress={async () => {
              setBusy(p.id);
              try {
                await assignPlan(id, p, routines, lang);
                await loadPlans();
                setPicking(false);
              } catch {
                setError(true);
              } finally {
                setBusy(null);
              }
            }}
          />
        ))}
      </Sheet>

      <ConfirmSheet
        visible={!!confirm}
        title={confirm === 'disconnect' ? t('trainer.removeClient') : t('trainer.deletePlan')}
        body={confirm === 'disconnect' ? t('trainer.removeClientBody') : t('trainer.deletePlanBody')}
        confirmLabel={t('common.delete')}
        destructive
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          const c = confirm;
          setConfirm(null);
          if (c === 'disconnect') {
            if (session) await disconnect(session.user.id, id).catch(() => setError(true));
            router.back();
          } else if (c) {
            await deleteAssignedPlan(c.id).catch(() => setError(true));
            loadPlans();
          }
        }}
      />
    </Screen>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <Card style={styles.tile}>
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.meta}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: space.sm },
  tile: { flex: 1, padding: space.md, gap: 2 },
  tileValue: { fontFamily: fonts.bold, fontSize: 20, color: colors.textPrimary },
  section: { marginTop: space.xxl },
  card: { marginTop: space.md, gap: space.md },
  list: { marginTop: space.md, paddingVertical: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  name: { ...type.itemTitle, color: colors.textPrimary },
  meta: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  value: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textPrimary },
});
