import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { StyleSheet, View } from 'react-native';

import type { Equipment } from '../data/types';
import { colors, radius } from '../theme/tokens';

// Line glyphs on a 24-unit grid, 1.8 stroke — drawn to match Phosphor's regular weight.
export function EquipmentGlyph({ equipment, size = 24, color = colors.textPrimary }: { equipment: Equipment; size?: number; color?: string }) {
  const p = { stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {equipment === 'barbell' && (
        <>
          <Line x1={2} y1={12} x2={22} y2={12} {...p} />
          <Rect x={4.5} y={7} width={2.5} height={10} rx={1} {...p} />
          <Rect x={17} y={7} width={2.5} height={10} rx={1} {...p} />
          <Rect x={7} y={8.5} width={2} height={7} rx={0.8} {...p} />
          <Rect x={15} y={8.5} width={2} height={7} rx={0.8} {...p} />
        </>
      )}
      {equipment === 'dumbbell' && (
        <>
          <Line x1={8} y1={12} x2={16} y2={12} {...p} />
          <Rect x={4} y={7.5} width={4} height={9} rx={1.4} {...p} />
          <Rect x={16} y={7.5} width={4} height={9} rx={1.4} {...p} />
        </>
      )}
      {equipment === 'kettlebell' && (
        <>
          <Path d="M8.5 9.5 C8 5 16 5 15.5 9.5" {...p} />
          <Path d="M7.5 10 H16.5 C19.5 12 19 19 15.5 19.5 H8.5 C5 19 4.5 12 7.5 10 Z" {...p} />
        </>
      )}
      {equipment === 'cable' && (
        <>
          <Line x1={4} y1={3} x2={20} y2={3} {...p} />
          <Circle cx={12} cy={6} r={2.2} {...p} />
          <Line x1={12} y1={8.2} x2={12} y2={16} {...p} />
          <Path d="M8.5 16 H15.5 L14 20.5 H10 Z" {...p} />
        </>
      )}
      {equipment === 'machine' && (
        <>
          <Rect x={3.5} y={3} width={4} height={18} rx={1} {...p} />
          <Line x1={7.5} y1={8} x2={14} y2={8} {...p} />
          <Path d="M14 5 V11" {...p} />
          <Path d="M11 16 H20 M14 16 V21" {...p} />
        </>
      )}
      {equipment === 'bodyweight' && (
        <>
          <Circle cx={12} cy={4.5} r={2} {...p} />
          <Path d="M5 9 L12 8 L19 9 M12 8 V14 M12 14 L8.5 21 M12 14 L15.5 21" {...p} />
        </>
      )}
      {equipment === 'band' && (
        <>
          <Path d="M4 12 C4 5 9 5 12 9 C15 13 20 13 20 8" {...p} />
          <Path d="M4 12 C4 19 9 19 12 15 C15 11 20 11 20 16" {...p} />
        </>
      )}
    </Svg>
  );
}

/** Square media tile used in exercise lists (stands in for a demo video thumbnail). */
export function ExerciseTile({ equipment, size = 56 }: { equipment: Equipment; size?: number }) {
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: size > 48 ? radius.md : radius.sm }]}>
      <EquipmentGlyph equipment={equipment} size={size * 0.46} color={colors.textPrimary} />
      <View style={[styles.rule, { width: size * 0.26 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  rule: { height: 2, borderRadius: 1, backgroundColor: colors.accent },
});
