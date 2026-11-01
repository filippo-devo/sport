import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSession } from '../../backend/auth';
import { backendConfigured } from '../../backend/supabase';
import { useClients } from '../../components/coach/useClients';
import { CaretRightIcon, UsersIcon } from '../../components/icons';
import { Button, Card, Divider, Notice } from '../../components/ui/controls';
import { NavBar } from '../../components/ui/headers';
import { Screen } from '../../components/ui/layout';
import { useT } from '../../i18n';
import { addDays, startOfDay, startOfWeek } from '../../lib/date';
import { periodTotals } from '../../store/stats';
import { colors, fonts, space, statusColor, type } from '../../theme/tokens';

/** Personal-trainer dashboard: every client with this week's activity and 4-week regularity. */
export default function TrainerScreen() {
  const { t } = useT();
  const { session, ready } = useSession();

  if (!backendConfigured || (ready && !session)) {
    return (
      <Screen top={<NavBar title={t('trainer.title')} />}>
        <Notice icon={UsersIcon} text={backendConfigured ? t('trainer.signIn') : t('account.notConfigured')} />
        {backendConfigured && <Button label={t('account.signIn')} onPress={() => router.push('/account')} style={{ marginTop: space.md }} />}
      </Screen>
    );
  }
  return <Dashboard />;
}

function Dashboard() {
  const { t, tn, dateShort } = useT();
  const { clients, workouts, error } = useClients();
  const now = new Date();
  const week = startOfWeek(now).getTime();
  const fourWeeks = addDays(startOfWeek(now), -21).getTime();
  const tomorrow = addDays(startOfDay(now), 1).getTime();

  const rows = (clients ?? []).map((c) => {
    const list = workouts[c.id] ?? [];
    const thisWeek = periodTotals(list, week, tomorrow);
    const last4 = periodTotals(list, fourWeeks, tomorrow);
    // Weeks with at least one workout out of the last four.
    const activeWeeks = new Set(list.filter((s) => s.startedAt >= fourWeeks).map((s) => startOfWeek(new Date(s.startedAt)).getTime())).size;
    return { c, thisWeek, last4, activeWeeks, last: list[0] };
  });
  const totalWeek = rows.reduce((n, r) => n + r.thisWeek.workouts, 0);
  const activeClients = rows.filter((r) => r.thisWeek.workouts > 0).length;

  return (
    <Screen top={<NavBar title={t('trainer.title')} />}>
      {clients == null ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: space.xxl }} />
      ) : (
        <>
          {error && <Notice icon={UsersIcon} text={t('trainer.loadError')} />}
          <View style={styles.tiles}>
            <Tile value={String(rows.length)} label={t('trainer.clients')} />
            <Tile value={`${activeClients}/${rows.length}`} label={t('trainer.activeThisWeek')} />
            <Tile value={String(totalWeek)} label={t('trainer.workoutsThisWeek')} />
          </View>

          <Card style={styles.list}>
            {rows.length === 0 && (
              <View style={{ paddingVertical: space.md, gap: space.sm }}>
                <Text style={styles.name}>{t('trainer.noClients')}</Text>
                <Text style={styles.meta}>{t('trainer.noClientsBody')}</Text>
                <Button label={t('trainer.inviteCode')} variant="secondary" size="sm" onPress={() => router.push('/account')} />
              </View>
            )}
            {rows.map((r, i) => (
              <View key={r.c.id}>
                {i > 0 && <Divider />}
                <Pressable style={styles.row} onPress={() => router.push({ pathname: '/trainer/[id]', params: { id: r.c.id, name: r.c.name } })} accessibilityRole="button">
                  <View style={[styles.dot, { backgroundColor: statusColor((r.activeWeeks / 4) * 100) }]} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {r.c.name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {tn('unit.workouts', r.thisWeek.workouts)} {t('trainer.thisWeekShort')} · {t('trainer.activeWeeks', { n: r.activeWeeks })}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {r.last ? t('trainer.lastWorkout', { date: dateShort(new Date(r.last.startedAt)) }) : t('trainer.noWorkouts')}
                    </Text>
                  </View>
                  <CaretRightIcon size={14} color={colors.textSecondary} weight="bold" />
                </Pressable>
              </View>
            ))}
          </Card>
          <Text style={[styles.meta, { marginTop: space.sm }]}>{t('trainer.liveNote')}</Text>
        </>
      )}
    </Screen>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <Card style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.meta}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: space.sm },
  tile: { flex: 1, padding: space.md, gap: 2 },
  tileValue: { fontFamily: fonts.bold, fontSize: 22, color: colors.textPrimary },
  list: { marginTop: space.md, paddingVertical: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { ...type.itemTitle, fontFamily: fonts.semibold, color: colors.textPrimary },
  meta: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
});
