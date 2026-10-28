import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, fonts } from '../theme/tokens';

type Props = {
  value: number; // 0–100
  size?: number;
  stroke?: number;
  showValue?: boolean;
};

// Circular recovery indicator, modelled on Gravl's "100 Recovered" ring.
export function RecoveryRing({ value, size = 36, stroke = 3, showValue = true }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progress = Math.max(0, Math.min(100, value)) / 100;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.success}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c * progress} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {showValue && (
        <View style={StyleSheet.absoluteFill}>
          <Text style={[styles.value, { fontSize: size * 0.34, lineHeight: size }]}>{value}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  value: {
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
