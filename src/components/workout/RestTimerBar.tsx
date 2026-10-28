import { StyleSheet, Text, View } from 'react-native';

import type { RestTimer } from '../../data/types';
import { useT } from '../../i18n';
import { clock } from '../../lib/date';
import { colors, fonts, radius, space } from '../../theme/tokens';
import { TimerIcon } from '../icons';
import { Button, ProgressBar } from '../ui/controls';

type Props = {
  rest: RestTimer;
  now: number;
  bottom: number;
  onAdjust: (delta: number) => void;
  onSkip: () => void;
};

/** Floating rest countdown with −15 / +15 / Skip (Hevy's rest timer, in Gravl colours). */
export function RestTimerBar({ rest, now, bottom, onAdjust, onSkip }: Props) {
  const { t } = useT();
  const left = Math.max(0, (rest.endsAt - now) / 1000);
  return (
    <View style={[styles.bar, { bottom }]} accessibilityLiveRegion="polite">
      <View style={styles.top}>
        <TimerIcon size={18} color={colors.accent} weight="bold" />
        <Text style={styles.time} accessibilityLabel={`${t('workout.rest')} ${clock(left)}`}>
          {clock(left)}
        </Text>
        <View style={{ flex: 1 }} />
        <Button label="−15" size="sm" variant="secondary" onPress={() => onAdjust(-15)} accessibilityLabel="−15 s" />
        <Button label="+15" size="sm" variant="secondary" onPress={() => onAdjust(15)} accessibilityLabel="+15 s" />
        <Button label={t('workout.skip')} size="sm" onPress={onSkip} />
      </View>
      <ProgressBar value={left / rest.duration} color={colors.accent} height={4} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    padding: space.md,
    gap: space.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.tabBar,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardStroke,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  time: { fontFamily: fonts.bold, fontSize: 22, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
});
