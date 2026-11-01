// Local notifications (expo-notifications): planned workouts, missed workouts, water and supplements.
// Everything is scheduled on the device; nothing goes through a server.
// The schedule is rebuilt from scratch whenever the plan, the log or the settings change,
// so a finished workout cancels that evening's "missed workout" reminder.

import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Linking, Platform } from 'react-native';

import { makeT } from '../i18n';
import { useStore, type AppState } from '../store';
import { getProgram, getRoutine } from '../store/derived';
import { addDays, dayKey, startOfDay, weekdayIndex } from './date';

export const remindersSupported = Platform.OS === 'ios' || Platform.OS === 'android';

const HORIZON_DAYS = 14;
const CHANNEL = 'reminders';

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function permissionState(): Promise<PermissionState> {
  if (!remindersSupported) return 'unsupported';
  const p = await Notifications.getPermissionsAsync();
  return p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';
}

/** Asks for permission when it can still be asked; returns the resulting state. */
export async function requestPermission(): Promise<PermissionState> {
  if (!remindersSupported) return 'unsupported';
  const current = await permissionState();
  if (current !== 'undetermined') return current;
  const p = await Notifications.requestPermissionsAsync();
  return p.granted ? 'granted' : 'denied';
}

export const openSystemSettings = () => Linking.openSettings();

const parseTime = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return { hour: h || 0, minute: m || 0 };
};

const at = (day: Date, hhmm: string) => {
  const { hour, minute } = parseTime(hhmm);
  const d = new Date(day);
  d.setHours(hour, minute, 0, 0);
  return d;
};

type Planned = { title: string; body: string; url: string; trigger: Notifications.NotificationTriggerInput };

/** Pure: what should be scheduled for this state (exported for testing). */
export function plannedReminders(s: AppState, now = new Date()): Planned[] {
  const { t, L } = makeT(s.settings.lang);
  const out: Planned[] = [];
  const r = s.reminders;
  const program = getProgram(s.activeProgramId, s.programs);
  const doneDays = new Set(s.sessions.map((x) => dayKey(x.startedAt)));

  if (r.workout.on || r.missed.on) {
    for (let i = 0; i < HORIZON_DAYS; i++) {
      const day = addDays(startOfDay(now), i);
      const routine = getRoutine(program.schedule[weekdayIndex(day)], s.routines);
      if (!routine || doneDays.has(dayKey(day))) continue;
      const name = L(routine.name);
      const url = `/routine/${routine.id}`;
      const workoutAt = at(day, r.workout.time);
      if (r.workout.on && workoutAt > now)
        out.push({ title: t('notify.workoutTitle'), body: t('notify.workoutBody', { name }), url, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: workoutAt, channelId: CHANNEL } });
      const missedAt = at(day, r.missed.time);
      if (r.missed.on && missedAt > now)
        out.push({ title: t('notify.missedTitle'), body: t('notify.missedBody', { name }), url, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: missedAt, channelId: CHANNEL } });
    }
  }

  if (r.water.on) {
    const from = parseTime(r.water.from);
    const to = parseTime(r.water.to);
    const step = Math.max(1, r.water.everyHours);
    for (let h = from.hour; h <= to.hour; h += step) {
      out.push({
        title: t('notify.waterTitle'),
        body: t('notify.waterBody', { goal: s.goals.waterMl }),
        url: '/food',
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: h, minute: from.minute, channelId: CHANNEL },
      });
    }
  }

  if (r.supplements.on) {
    for (const supp of s.supplements) {
      if (supp.archived || !supp.reminders) continue;
      for (const time of supp.times) {
        const { hour, minute } = parseTime(time);
        out.push({
          title: t('notify.suppTitle'),
          body: supp.dose ? `${supp.name} · ${supp.dose}` : supp.name,
          url: '/supplements',
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL },
        });
      }
    }
  }
  // iOS keeps at most 64 pending notifications.
  return out.slice(0, 60);
}

export const anyReminderOn = (s: AppState) =>
  s.reminders.workout.on || s.reminders.missed.on || s.reminders.water.on || (s.reminders.supplements.on && s.supplements.some((x) => x.reminders && !x.archived));

let syncing: Promise<void> = Promise.resolve();

/** Replaces every scheduled notification with the current plan. Serialised so rapid changes don't interleave. */
export function syncReminders(s: AppState) {
  if (!remindersSupported) return syncing;
  syncing = syncing
    .then(async () => {
      await Notifications.cancelAllScheduledNotificationsAsync();
      if (!anyReminderOn(s) || (await permissionState()) !== 'granted') return;
      for (const p of plannedReminders(s)) {
        await Notifications.scheduleNotificationAsync({ content: { title: p.title, body: p.body, data: { url: p.url }, sound: true }, trigger: p.trigger });
      }
    })
    .catch((e) => console.warn('Reminder sync failed', e));
  return syncing;
}

/** Mounted once at the root: keeps the schedule in sync and opens the right screen from a tapped notification. */
export function useReminderSync() {
  useEffect(() => {
    if (!remindersSupported) return;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
    });
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Reminders', importance: AndroidImportance.DEFAULT }).catch(() => {});
    }

    syncReminders(useStore.getState());
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = useStore.subscribe((s, prev) => {
      if (
        s.reminders === prev.reminders &&
        s.sessions === prev.sessions &&
        s.activeProgramId === prev.activeProgramId &&
        s.programs === prev.programs &&
        s.routines === prev.routines &&
        s.supplements === prev.supplements &&
        s.goals.waterMl === prev.goals.waterMl &&
        s.settings.lang === prev.settings.lang
      )
        return;
      clearTimeout(timer);
      timer = setTimeout(() => syncReminders(useStore.getState()), 800);
    });

    const open = (response: Notifications.NotificationResponse | null) => {
      const url = response?.notification.request.content.data?.url;
      if (typeof url === 'string') router.push(url as never);
    };
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => {
      unsub();
      sub.remove();
      clearTimeout(timer);
    };
  }, []);
}
