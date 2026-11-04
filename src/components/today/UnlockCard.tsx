import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useT } from '../../i18n';
import { unlockSlots } from '../../lib/today';
import { useNow } from '../../lib/useNow';
import { useStore } from '../../store';
import { colors, fonts, radius, space, type } from '../../theme/tokens';
import { CheckIcon, LockSimpleIcon, LockSimpleOpenIcon } from '../icons';
import { Button, Card } from '../ui/controls';

/** "Unlock your phone" on Today (Opal-style rule card): today's slots and a one-tap "done". */
export function UnlockCard() {
  const { t, tn } = useT();
  const u = useStore((s) => s.unlock);
  const logs = useStore((s) => s.unlockLogs);
  const logUnlock = useStore((s) => s.logUnlock);
  const now = useNow(60_000);

  if (!u.on) {
    return (
      <Card style={[styles.card, styles.accent]} onPress={() => router.push('/unlock')} accessibilityLabel={t('unlock.setupTitle')}>
        <View style={styles.head}>
          <View style={styles.icon}>
            <LockSimpleIcon size={20} color={colors.accent} weight="fill" />
          </View>
          <View style={styles.grow}>
            <Text style={styles.title}>{t('unlock.setupTitle')}</Text>
            <Text style={styles.sub}>{t('unlock.setupBody')}</Text>
          </View>
        </View>
        <Button label={t('unlock.setup')} variant="secondary" size="sm" onPress={() => router.push('/unlock')} />
      </Card>
    );
  }

  const task = tn(u.exercise === 'squats' ? 'unlock.squats' : 'unlock.pushups', u.reps);
  const slots = unlockSlots(u, logs, new Date(now));
  const due = slots.filter((x) => x.due);
  const upcoming = slots.find((x) => !x.done && !x.due);
  const allDone = slots.length > 0 && slots.every((x) => x.done);
  const status = due.length ? t('unlock.dueBody', { time: due[0].time }) : allDone ? t('unlock.doneBody') : upcoming ? t('unlock.next', { time: upcoming.time }) : '';

  return (
    <Card style={[styles.card, due.length > 0 && styles.accent]} onPress={() => router.push('/unlock')} accessibilityLabel={t('unlock.title')}>
      <View style={styles.head}>
        <View style={[styles.icon, !due.length && { backgroundColor: colors.control }]}>
          {due.length ? (
            <LockSimpleIcon size={20} color={colors.accent} weight="fill" />
          ) : (
            <LockSimpleOpenIcon size={20} color={allDone ? colors.success : colors.textPrimary} weight="fill" />
          )}
        </View>
        <View style={styles.grow}>
          <Text style={styles.title}>{task}</Text>
          <Text style={styles.sub}>{status}</Text>
        </View>
        {due.length > 0 ? (
          <View style={[styles.badge, { backgroundColor: 'rgba(239,68,68,0.16)' }]}>
            <Text style={[styles.badgeText, { color: colors.danger }]}>{t('unlock.due')}</Text>
          </View>
        ) : allDone ? (
          <View style={[styles.badge, { backgroundColor: 'rgba(33,196,92,0.16)' }]}>
            <Text style={[styles.badgeText, { color: colors.success }]}>{t('unlock.allDone')}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.slots}>
        {slots.map((x) => (
          <View key={x.time} style={[styles.slot, x.done && styles.slotDone, x.due && styles.slotDue]}>
            {x.done && <CheckIcon size={12} color={colors.success} weight="bold" />}
            <Text style={[styles.slotText, x.done && { color: colors.success }, x.due && { color: colors.textOnAccent }]}>{x.time}</Text>
          </View>
        ))}
      </View>

      {due.length > 0 && <Button label={t('unlock.markDone', { task })} onPress={logUnlock} size="sm" />}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  accent: { borderColor: colors.accentStroke },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(210,254,8,0.12)', alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1, minWidth: 0 },
  title: { ...type.itemTitle, fontFamily: fonts.semibold, color: colors.textPrimary },
  sub: { ...type.caption, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  badge: { borderRadius: radius.pill, paddingHorizontal: space.sm + 1, paddingVertical: 4 },
  badgeText: { ...type.badge, letterSpacing: 0.2 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, backgroundColor: colors.control, paddingHorizontal: space.md, paddingVertical: 5 },
  slotDone: { backgroundColor: 'rgba(33,196,92,0.14)' },
  slotDue: { backgroundColor: colors.accent },
  slotText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary },
});
