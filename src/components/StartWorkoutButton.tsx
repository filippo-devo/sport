import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, layout, radius, type } from '../theme/tokens';

type Props = { bottom: number; label: string; onPress: () => void };

// Primary volt CTA floating above the tab bar, as in Gravl.
export function StartWorkoutButton({ bottom, label, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { bottom }, pressed && styles.pressed]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    alignSelf: 'center',
    height: layout.ctaHeight,
    minWidth: 210,
    paddingHorizontal: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.92 },
  label: { ...type.button, color: colors.textOnAccent },
});
