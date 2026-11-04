import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { LockSimpleIcon, PlusIcon, XIcon } from '../components/icons';
import { UnlockCard } from '../components/today/UnlockCard';
import { Card, Divider, Notice, Segmented } from '../components/ui/controls';
import { NavBar } from '../components/ui/headers';
import { Screen } from '../components/ui/layout';
import { NumberSheet } from '../components/ui/sheets';
import { TimeSheet } from '../components/ui/TimeSheet';
import type { UnlockExercise } from '../data/types';
import { useT } from '../i18n';
import { requestPermission } from '../lib/reminders';
import { useStore } from '../store';
import { colors, fonts, radius, space, type } from '../theme/tokens';

/** Settings for "Unlock your phone" (Opal rule-editor pattern): exercise, reps, times, reminders. */
export default function UnlockScreen() {
  const { t } = useT();
  const u = useStore((s) => s.unlock);
  const setUnlock = useStore((s) => s.setUnlock);
  const [repsOpen, setRepsOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);

  const turnOn = async (on: boolean) => {
    setUnlock({ on });
    if (on && u.reminders) await requestPermission();
  };

  return (
    <Screen top={<NavBar title={t('unlock.title')} />}>
      <Text style={styles.intro}>{t('unlock.intro')}</Text>

      <Card style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>{t('unlock.enabled')}</Text>
          <Toggle value={u.on} onChange={turnOn} label={t('unlock.enabled')} />
        </View>
      </Card>

      {u.on && (
        <View style={{ marginTop: space.lg }}>
          <UnlockCard />
        </View>
      )}

      <Text style={styles.group}>{t('unlock.exercise').toUpperCase()}</Text>
      <Segmented<UnlockExercise>
        value={u.exercise}
        onChange={(exercise) => setUnlock({ exercise })}
        options={[
          { value: 'pushups', label: t('unlock.exPushups') },
          { value: 'squats', label: t('unlock.exSquats') },
        ]}
      />

      <Card style={[styles.card, { marginTop: space.md }]} onPress={() => setRepsOpen(true)} accessibilityLabel={t('unlock.reps')}>
        <View style={styles.row}>
          <Text style={styles.label}>{t('unlock.reps')}</Text>
          <Text style={styles.value}>{u.reps}</Text>
        </View>
      </Card>

      <Text style={styles.group}>{t('unlock.times').toUpperCase()}</Text>
      <View style={styles.times}>
        {[...u.times].sort().map((time) => (
          <View key={time} style={styles.time}>
            <Text style={styles.timeText}>{time}</Text>
            {u.times.length > 1 && (
              <Pressable onPress={() => setUnlock({ times: u.times.filter((x) => x !== time) })} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('unlock.removeTime', { time })}>
                <XIcon size={14} color={colors.textSecondary} weight="bold" />
              </Pressable>
            )}
          </View>
        ))}
        {u.times.length < 6 && (
          <Pressable onPress={() => setTimeOpen(true)} style={[styles.time, styles.addTime]} accessibilityRole="button">
            <PlusIcon size={14} color={colors.accent} weight="bold" />
            <Text style={[styles.timeText, { color: colors.accent }]}>{t('unlock.addTime')}</Text>
          </Pressable>
        )}
      </View>

      <Card style={[styles.card, { marginTop: space.xl }]}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{t('unlock.reminders')}</Text>
            <Text style={styles.sub}>{t('unlock.remindersBody')}</Text>
          </View>
          <Toggle
            value={u.reminders}
            label={t('unlock.reminders')}
            onChange={async (reminders) => {
              setUnlock({ reminders });
              if (reminders && u.on) await requestPermission();
            }}
          />
        </View>
        <Divider />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{t('unlock.apps')}</Text>
          </View>
          <LockSimpleIcon size={18} color={colors.textSecondary} weight="fill" />
        </View>
        <Notice text={t('unlock.appsSoon')} />
      </Card>

      <NumberSheet visible={repsOpen} title={t('unlock.reps')} value={u.reps} step={5} min={1} max={500} onSave={(reps) => setUnlock({ reps })} onClose={() => setRepsOpen(false)} />
      <TimeSheet
        visible={timeOpen}
        title={t('unlock.time')}
        value="12:00"
        onClose={() => setTimeOpen(false)}
        onSave={(v) => !u.times.includes(v) && setUnlock({ times: [...u.times, v].sort() })}
      />
    </Screen>
  );
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ true: colors.accent, false: colors.track }}
      thumbColor={value ? colors.textOnAccent : colors.textPrimary}
      accessibilityLabel={label}
    />
  );
}

const styles = StyleSheet.create({
  intro: { ...type.meta, color: colors.textSecondary, marginTop: space.sm, marginBottom: space.lg },
  card: { gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 32 },
  label: { ...type.itemTitle, fontFamily: fonts.semibold, color: colors.textPrimary, flex: 1 },
  sub: { ...type.caption, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  value: { fontFamily: fonts.bold, fontSize: 17, color: colors.textPrimary },
  group: { ...type.badge, color: colors.textSecondary, marginTop: space.xl, marginBottom: space.sm, marginLeft: space.xxs },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  time: { flexDirection: 'row', alignItems: 'center', gap: space.sm, height: 40, paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: colors.control },
  timeText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textPrimary },
  addTime: { backgroundColor: 'transparent', borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(210,254,8,0.45)' },
});
