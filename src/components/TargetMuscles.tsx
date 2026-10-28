import { StyleSheet, Text, View } from 'react-native';

import type { Muscle } from '../data/types';
import { useT } from '../i18n';
import { colors, radius, space, type } from '../theme/tokens';
import { RecoveryRing } from './RecoveryRing';

export type TargetMuscle = { muscle: Muscle; recovery: number };

// "Target muscles" row from Gravl's workout detail: tile, name, green %.
export function TargetMuscles({ muscles }: { muscles: TargetMuscle[] }) {
  const { t } = useT();
  return (
    <View>
      <Text style={styles.title}>{t('train.targetMuscles')}</Text>
      <View style={styles.row}>
        {muscles.map((m) => (
          <View key={m.muscle} style={styles.item}>
            <View style={styles.tile}>
              <RecoveryRing value={m.recovery} size={26} stroke={2.5} showValue={false} />
            </View>
            <View style={styles.text}>
              <Text style={styles.name} numberOfLines={1}>
                {t(`muscle.${m.muscle}`)}
              </Text>
              <Text style={styles.pct}>{m.recovery}%</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...type.sectionTitle, color: colors.textPrimary },
  row: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  item: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.xs + 1, minWidth: 0 },
  tile: {
    width: 40,
    height: 40,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, minWidth: 0 },
  name: { ...type.body, fontSize: 14, color: colors.textPrimary },
  pct: { ...type.body, fontSize: 14, color: colors.success },
});
