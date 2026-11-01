import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AppState as RNAppState, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { BellIcon, CaretRightIcon } from '../components/icons';
import { Button, Card, Divider, Notice, Segmented } from '../components/ui/controls';
import { NavBar } from '../components/ui/headers';
import { Screen } from '../components/ui/layout';
import { TimeSheet } from '../components/ui/TimeSheet';
import type { ReminderSettings } from '../data/types';
import { useT, type TKey } from '../i18n';
import { openSystemSettings, permissionState, remindersSupported, requestPermission, syncReminders, type PermissionState } from '../lib/reminders';
import { useStore } from '../store';
import { colors, fonts, space, type } from '../theme/tokens';

type TimeField = { label: TKey; get: (r: ReminderSettings) => string; set: (r: ReminderSettings, v: string) => Partial<ReminderSettings> };

/** Reminder settings (Lifesum "My notifications" pattern): one switch per kind, with its times. */
export default function NotificationsScreen() {
  const { t, tn } = useT();
  const r = useStore((s) => s.reminders);
  const setReminders = useStore((s) => s.setReminders);
  const [perm, setPerm] = useState<PermissionState>(remindersSupported ? 'undetermined' : 'unsupported');
  const [scheduled, setScheduled] = useState<number | null>(null);
  const [editing, setEditing] = useState<TimeField | null>(null);

  const refresh = useCallback(async () => {
    setPerm(await permissionState());
    if (remindersSupported) setScheduled((await Notifications.getAllScheduledNotificationsAsync()).length);
  }, []);

  useEffect(() => {
    // Deferred so the first read doesn't set state synchronously inside the effect.
    Promise.resolve().then(refresh);
    // Coming back from system settings may have changed the permission.
    const sub = RNAppState.addEventListener('change', (st) => {
      if (st === 'active') syncReminders(useStore.getState()).then(refresh);
    });
    return () => sub.remove();
  }, [refresh]);

  // Refresh the count after the debounced sync has run.
  useEffect(() => {
    const id = setTimeout(refresh, 1500);
    return () => clearTimeout(id);
  }, [r, refresh]);

  const toggle = async (patch: Partial<ReminderSettings>, turningOn: boolean) => {
    if (turningOn) setPerm(await requestPermission());
    setReminders(patch);
  };

  const timeRow = (field: TimeField) => (
    <Pressable style={styles.timeRow} onPress={() => setEditing(field)} accessibilityRole="button" accessibilityLabel={t(field.label)}>
      <Text style={styles.timeLabel}>{t(field.label)}</Text>
      <Text style={styles.timeValue}>{field.get(r)}</Text>
      <CaretRightIcon size={14} color={colors.textSecondary} weight="bold" />
    </Pressable>
  );

  return (
    <Screen top={<NavBar title={t('notifySettings.title')} />}>
      <Text style={styles.intro}>{t('notifySettings.intro')}</Text>

      {perm === 'unsupported' && (
        <View style={styles.notice}>
          <Notice icon={BellIcon} text={t('notifySettings.unsupported')} />
        </View>
      )}
      {perm === 'denied' && (
        <View style={styles.notice}>
          <Notice icon={BellIcon} text={t('notifySettings.denied')} />
          <Button label={t('notifySettings.openSettings')} variant="secondary" size="sm" onPress={openSystemSettings} style={{ marginTop: space.sm }} />
        </View>
      )}

      <Section title={t('notifySettings.workout')} body={t('notifySettings.workoutBody')} value={r.workout.on} onChange={(on) => toggle({ workout: { ...r.workout, on } }, on)}>
        {r.workout.on && timeRow({ label: 'notifySettings.time', get: (x) => x.workout.time, set: (x, v) => ({ workout: { ...x.workout, time: v } }) })}
      </Section>

      <Section title={t('notifySettings.missed')} body={t('notifySettings.missedBody')} value={r.missed.on} onChange={(on) => toggle({ missed: { ...r.missed, on } }, on)}>
        {r.missed.on && timeRow({ label: 'notifySettings.time', get: (x) => x.missed.time, set: (x, v) => ({ missed: { ...x.missed, time: v } }) })}
      </Section>

      <Section title={t('notifySettings.water')} body={t('notifySettings.waterBody')} value={r.water.on} onChange={(on) => toggle({ water: { ...r.water, on } }, on)}>
        {r.water.on && (
          <>
            {timeRow({ label: 'notifySettings.from', get: (x) => x.water.from, set: (x, v) => ({ water: { ...x.water, from: v } }) })}
            <Divider />
            {timeRow({ label: 'notifySettings.to', get: (x) => x.water.to, set: (x, v) => ({ water: { ...x.water, to: v } }) })}
            <Divider />
            <View style={styles.everyRow}>
              <Text style={styles.timeLabel}>{t('notifySettings.every')}</Text>
              <View style={{ width: 180 }}>
                <Segmented
                  value={String(r.water.everyHours)}
                  onChange={(v) => setReminders({ water: { ...r.water, everyHours: Number(v) } })}
                  options={['1', '2', '3'].map((v) => ({ value: v, label: t('notifySettings.hours', { n: v }) }))}
                />
              </View>
            </View>
          </>
        )}
      </Section>

      <Section title={t('notifySettings.supplements')} body={t('notifySettings.supplementsBody')} value={r.supplements.on} onChange={(on) => toggle({ supplements: { on } }, on)}>
        <Pressable style={styles.timeRow} onPress={() => router.push('/supplements')} accessibilityRole="button">
          <Text style={[styles.timeLabel, { color: colors.accent }]}>{t('notifySettings.manageSupps')}</Text>
          <CaretRightIcon size={14} color={colors.textSecondary} weight="bold" />
        </Pressable>
      </Section>

      {perm === 'granted' && scheduled != null && <Text style={styles.count}>{tn('notifySettings.scheduled', scheduled)}</Text>}

      <TimeSheet
        visible={!!editing}
        title={editing ? t(editing.label) : ''}
        value={editing ? editing.get(r) : '08:00'}
        onClose={() => setEditing(null)}
        onSave={(v) => editing && setReminders(editing.set(useStore.getState().reminders, v))}
      />
    </Screen>
  );
}

function Section({ title, body, value, onChange, children }: { title: string; body: string; value: boolean; onChange: (v: boolean) => void; children?: ReactNode }) {
  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ true: colors.accent, false: colors.track }}
          thumbColor={value ? colors.textOnAccent : colors.textPrimary}
          accessibilityLabel={title}
        />
      </View>
      {children ? (
        <>
          <Divider />
          {children}
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  intro: { ...type.meta, color: colors.textSecondary },
  notice: { marginTop: space.lg },
  card: { marginTop: space.md, paddingVertical: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  title: { ...type.itemTitle, fontFamily: fonts.semibold, color: colors.textPrimary },
  body: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48 },
  timeLabel: { ...type.body, color: colors.textPrimary, flex: 1 },
  timeValue: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textPrimary },
  everyRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  count: { ...type.caption, color: colors.textSecondary, textAlign: 'center', marginTop: space.lg },
});
