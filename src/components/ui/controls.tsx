import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, layout, radius, space, type } from '../../theme/tokens';
import type { Icon } from '../icons';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: Icon;
  disabled?: boolean;
  loading?: boolean;
  size?: 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function Button({ label, onPress, variant = 'primary', icon: Glyph, disabled, loading, size = 'md', style, accessibilityLabel }: ButtonProps) {
  const fg =
    variant === 'primary' ? colors.textOnAccent : variant === 'danger' ? colors.danger : variant === 'ghost' ? colors.accent : colors.textPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        size === 'sm' && styles.buttonSm,
        variant === 'primary' && { backgroundColor: colors.accent },
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.dangerBg,
        variant === 'ghost' && styles.ghost,
        disabled && { opacity: 0.4 },
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {Glyph && <Glyph size={size === 'sm' ? 16 : 19} color={fg} weight="bold" />}
          <Text style={[styles.buttonLabel, size === 'sm' && styles.buttonLabelSm, { color: fg }]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

type IconButtonProps = {
  icon: Icon;
  onPress?: () => void;
  label: string;
  size?: number;
  tone?: 'control' | 'surface' | 'accent' | 'plain';
  iconColor?: string;
  weight?: 'regular' | 'bold' | 'fill';
  style?: StyleProp<ViewStyle>;
};

/** Circular glass control (Gravl back / more buttons). */
export function IconButton({ icon: Glyph, onPress, label, size = layout.control, tone = 'control', iconColor, weight = 'bold', style }: IconButtonProps) {
  const bg = tone === 'control' ? colors.control : tone === 'surface' ? colors.surface : tone === 'accent' ? colors.accent : 'transparent';
  const fg = iconColor ?? (tone === 'accent' ? colors.textOnAccent : tone === 'surface' ? colors.accent : colors.textPrimary);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' },
        tone === 'control' && styles.hairline,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Glyph size={Math.round(size * 0.46)} color={fg} weight={weight} />
    </Pressable>
  );
}

type ChipProps = { label: string; selected?: boolean; onPress?: () => void; icon?: Icon; count?: number };

export function Chip({ label, selected, onPress, icon: Glyph, count }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
    >
      {Glyph && <Glyph size={15} color={selected ? colors.textOnAccent : colors.textSecondary} weight="bold" />}
      <Text style={[styles.chipLabel, selected && { color: colors.textOnAccent }]}>{label}</Text>
      {count != null && <Text style={[styles.chipCount, selected && { color: colors.textOnAccent }]}>{count}</Text>}
    </Pressable>
  );
}

type SegmentedProps<T extends string> = { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void };

export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Card({ children, style, onPress, accessibilityLabel }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string }) {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.card, style, pressed && styles.pressedCard]}
    >
      {children}
    </Pressable>
  );
}

export function SectionTitle({ title, aside, onAside, style }: { title: string; aside?: string; onAside?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.sectionRow, style]}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {aside &&
        (onAside ? (
          <Pressable onPress={onAside} hitSlop={8} accessibilityRole="button">
            <Text style={styles.sectionLink}>{aside}</Text>
          </Pressable>
        ) : (
          <Text style={styles.sectionAside}>{aside}</Text>
        ))}
    </View>
  );
}

export function Badge({ label, tone = 'accent', icon: Glyph }: { label: string; tone?: 'accent' | 'muted' | 'success'; icon?: Icon }) {
  const fg = tone === 'accent' ? colors.textOnAccent : tone === 'success' ? colors.success : colors.textPrimary;
  return (
    <View style={[styles.badge, { backgroundColor: tone === 'accent' ? colors.accent : colors.control }]}>
      {Glyph && <Glyph size={13} color={fg} weight="bold" />}
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

/** Thin bar used for macros and goals. */
export function ProgressBar({ value, color, height = 6 }: { value: number; color: string; height?: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: colors.track, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline, marginLeft: inset }} />;
}

export function Notice({ text, icon: Glyph }: { text: string; icon?: Icon }) {
  return (
    <View style={styles.notice}>
      {Glyph && <Glyph size={18} color={colors.accent} weight="fill" />}
      <Text style={styles.noticeText}>{text}</Text>
    </View>
  );
}

export const pressedStyle = { opacity: 0.85, transform: [{ scale: 0.98 }] };

const styles = StyleSheet.create({
  button: {
    height: layout.ctaHeight,
    paddingHorizontal: space.xxl,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonSm: { height: 38, paddingHorizontal: space.md },
  secondary: { backgroundColor: colors.control, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
  dangerBg: { backgroundColor: 'rgba(255,90,95,0.12)' },
  ghost: { backgroundColor: 'transparent', paddingHorizontal: space.sm },
  buttonLabel: { ...type.button },
  buttonLabelSm: { fontSize: 15 },
  pressed: pressedStyle,
  pressedCard: { opacity: 0.88 },
  hairline: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    height: 36,
    paddingHorizontal: space.md + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.textPrimary },
  chipCount: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  segmented: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  segment: { flex: 1, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.sm },
  segmentActive: { backgroundColor: colors.control },
  segmentLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.textSecondary },
  segmentLabelActive: { color: colors.textPrimary, fontFamily: fonts.semibold },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    padding: space.lg,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.md },
  sectionTitle: { ...type.sectionTitle, color: colors.textPrimary, flexShrink: 1 },
  sectionAside: { ...type.body, color: colors.textSecondary },
  sectionLink: { ...type.body, color: colors.accent, fontFamily: fonts.semibold },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md + 2,
    height: 30,
    borderRadius: radius.pill,
  },
  badgeText: { ...type.badge },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md + 2,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAccent,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accentStroke,
  },
  noticeText: { ...type.body, color: colors.textPrimary, flex: 1 },
});
