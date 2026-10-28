import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useT } from '../i18n';
import { useNow } from '../lib/useNow';
import { clock } from '../lib/date';
import { useStore } from '../store';
import { colors, fonts, radius, space } from '../theme/tokens';
import { CaretRightIcon, TimerIcon } from './icons';

/** "Workout in progress" pill shown above the tab bar while a workout is running (Hevy). */
export function ActiveWorkoutBar({ bottom, width }: { bottom: number; width: number }) {
  const { t, L } = useT();
  const active = useStore((s) => s.active);
  const now = useNow(active ? 1000 : 0);
  if (!active) return null;
  const resting = active.rest && active.rest.endsAt > now;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('workout.inProgress')}: ${L(active.name)}`}
      onPress={() => router.push('/workout')}
      style={({ pressed }) => [styles.bar, { bottom, width }, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.dot} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.title} numberOfLines={1}>
          {L(active.name)}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {resting ? `${t('workout.rest')} ${clock((active.rest!.endsAt - now) / 1000)}` : t('workout.inProgress')}
        </Text>
      </View>
      <TimerIcon size={16} color={colors.textOnAccent} weight="bold" />
      <Text style={styles.clock}>{clock((now - active.startedAt) / 1000)}</Text>
      <CaretRightIcon size={16} color={colors.textOnAccent} weight="bold" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    alignSelf: 'center',
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingLeft: space.lg,
    paddingRight: space.md,
    shadowColor: colors.accent,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textOnAccent },
  title: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textOnAccent },
  meta: { fontFamily: fonts.medium, fontSize: 12, color: colors.textOnAccent, opacity: 0.75 },
  clock: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textOnAccent, fontVariant: ['tabular-nums'] },
});
