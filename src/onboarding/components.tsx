import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { CheckIcon, MinusIcon, PlusIcon, type Icon } from '../components/icons';
import { colors, fonts, radius, space, type } from '../theme/tokens';

/** Thin progress line under the top bar (Centr / Tonal pattern), animated between steps. */
export function ProgressLine({ value }: { value: number }) {
  const [anim] = useState(() => new Animated.Value(value));
  useEffect(() => {
    Animated.timing(anim, { toValue: value, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [anim, value]);
  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, { width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
}

export function StepTitle({ eyebrow, title, body }: { eyebrow?: string; title: string; body?: string }) {
  return (
    <View style={styles.titleBlock}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
    </View>
  );
}

type OptionProps = {
  title: string;
  description?: string;
  icon?: Icon;
  /** Custom element in the icon circle (instead of `icon`). */
  leading?: ReactNode;
  selected: boolean;
  multi?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

/** Full-width answer card with a radio / check on the right. */
export function OptionCard({ title, description, icon: Glyph, leading, selected, multi, disabled, onPress }: OptionProps) {
  return (
    <Pressable
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected, disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.option, selected && styles.optionSelected, disabled && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}
    >
      {Glyph || leading ? (
        <View style={[styles.optionIcon, selected && { backgroundColor: colors.accent }]}>
          {Glyph ? <Glyph size={22} color={selected ? colors.textOnAccent : colors.textPrimary} weight="bold" /> : leading}
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.optionTitle}>{title}</Text>
        {description ? <Text style={styles.optionDesc}>{description}</Text> : null}
      </View>
      <View style={[multi ? styles.check : styles.radio, selected && styles.markOn]}>
        {selected && (multi ? <CheckIcon size={14} color={colors.textOnAccent} weight="bold" /> : <View style={styles.radioDot} />)}
      </View>
    </Pressable>
  );
}

export function Options({ children }: { children: ReactNode }) {
  return <View style={{ gap: space.sm + 2 }}>{children}</View>;
}

type StepperProps = {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
  format?: (v: number) => string;
  caption?: string;
};

/** Big number with round −/+ buttons (Apple Fitness "Move goal"); hold to repeat. */
export function BigStepper({ value, onChange, min, max, step, unit, format, caption }: StepperProps) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  const bump = (dir: 1 | -1) => onChange(clamp(ref.current + dir * step));
  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  const hold = (dir: 1 | -1) => {
    stop();
    timer.current = setInterval(() => {
      ref.current = clamp(ref.current + dir * step);
      onChange(ref.current);
    }, 70);
  };

  const btn = (dir: 1 | -1, Glyph: Icon, label: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => bump(dir)}
      onLongPress={() => hold(dir)}
      onPressOut={stop}
      delayLongPress={350}
      hitSlop={8}
      style={({ pressed }) => [styles.round, pressed && { transform: [{ scale: 0.94 }] }]}
    >
      <Glyph size={26} color={colors.textOnAccent} weight="bold" />
    </Pressable>
  );

  return (
    <View style={styles.stepper}>
      <View style={styles.stepperRow}>
        {btn(-1, MinusIcon, '−')}
        <View style={styles.valueBox}>
          <Text style={styles.value} adjustsFontSizeToFit numberOfLines={1}>
            {format ? format(value) : value}
          </Text>
          {unit ? <Text style={styles.unit}>{unit.toUpperCase()}</Text> : null}
        </View>
        {btn(1, PlusIcon, '+')}
      </View>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

/** Row of small square tiles (weekdays, lengths). */
export function TileRow<T extends string | number>({
  items,
  isOn,
  onPress,
}: {
  items: { value: T; label: string }[];
  isOn: (v: T) => boolean;
  onPress: (v: T) => void;
}) {
  return (
    <View style={styles.tileRow}>
      {items.map((it) => {
        const on = isOn(it.value);
        return (
          <Pressable
            key={String(it.value)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            onPress={() => onPress(it.value)}
            style={({ pressed }) => [styles.tile, on && styles.tileOn, pressed && { opacity: 0.85 }]}
          >
            <Text style={[styles.tileLabel, on && { color: colors.textOnAccent }]}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'accent' }) {
  return (
    <View style={[styles.pill, tone === 'accent' && { backgroundColor: 'rgba(210,254,8,0.14)', borderColor: colors.accentStroke }]}>
      <Text style={[styles.pillText, tone === 'accent' && { color: colors.accent }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 4, borderRadius: 2, backgroundColor: colors.track, overflow: 'hidden', flex: 1 },
  fill: { height: 4, borderRadius: 2, backgroundColor: colors.accent },

  titleBlock: { gap: space.sm, marginBottom: space.xxl },
  eyebrow: { ...type.badge, color: colors.accent },
  title: { ...type.display, color: colors.textPrimary },
  body: { ...type.meta, color: colors.textSecondary },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.lg,
    paddingHorizontal: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.hairline,
  },
  optionSelected: { borderColor: colors.accent, backgroundColor: colors.surfaceAccent },
  optionIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.control, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { ...type.itemTitle, fontFamily: fonts.semibold, color: colors.textPrimary },
  optionDesc: { ...type.meta, fontSize: 14, lineHeight: 19, color: colors.textSecondary, marginTop: 2 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.track, alignItems: 'center', justifyContent: 'center' },
  check: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.track, alignItems: 'center', justifyContent: 'center' },
  markOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.textOnAccent },

  stepper: { alignItems: 'center', gap: space.lg, paddingVertical: space.xxl },
  stepperRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', justifyContent: 'space-between' },
  round: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  valueBox: { flex: 1, alignItems: 'center', paddingHorizontal: space.sm },
  value: { fontFamily: fonts.bold, fontSize: 76, lineHeight: 84, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  unit: { ...type.button, color: colors.textSecondary, letterSpacing: 1 },
  caption: { ...type.body, color: colors.textSecondary },

  tileRow: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  tile: {
    flexGrow: 1,
    flexBasis: 40,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  tileLabel: { ...type.button, color: colors.textPrimary },

  pill: {
    alignSelf: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  pillText: { ...type.caption, fontSize: 13, color: colors.textSecondary },
});
