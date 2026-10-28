import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Session, Units } from '../data/types';
import { useT } from '../i18n';
import { formatVolume } from '../lib/units';
import { doneSets, sessionVolume } from '../store/derived';
import { colors, fonts, radius, space, type } from '../theme/tokens';
import { CaretRightIcon } from './icons';

/** History row: date block, name, duration · volume · sets. */
export function SessionRow({ session, units }: { session: Session; units: Units }) {
  const { t, tn, L, weekdayShort, monthShort } = useT();
  const d = new Date(session.startedAt);
  const minutes = Math.round((session.endedAt - session.startedAt) / 60000);
  return (
    <Pressable
      onPress={() => router.push(`/session/${session.id}`)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={L(session.name)}
    >
      <View style={styles.date}>
        <Text style={styles.dateDay}>{d.getDate()}</Text>
        <Text style={styles.dateMonth}>{monthShort(d)}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.name} numberOfLines={1}>
          {L(session.name)}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {weekdayShort(d)} · {t('unit.min', { n: minutes })} · {formatVolume(sessionVolume(session), units)} · {tn('unit.sets', doneSets(session.exercises))}
        </Text>
      </View>
      <CaretRightIcon size={16} color={colors.textSecondary} weight="bold" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  date: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDay: { fontFamily: fonts.bold, fontSize: 18, color: colors.textPrimary, lineHeight: 20 },
  dateMonth: { fontFamily: fonts.medium, fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase' },
  name: { ...type.itemTitle, color: colors.textPrimary },
  meta: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
});
