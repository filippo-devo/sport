import { View } from 'react-native';

import { colors } from '../theme/tokens';

// The small "III" glyph Gravl puts in front of each exercise's set count:
// one bar per set, the last bars stepping up in height.
export function SetBars({ sets }: { sets: number }) {
  const count = Math.max(1, Math.min(sets, 5));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 13 }}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            width: 3,
            height: count > 3 ? 7 + (i * 6) / (count - 1) : 13,
            borderRadius: 1,
            backgroundColor: colors.textSecondary,
          }}
        />
      ))}
    </View>
  );
}
