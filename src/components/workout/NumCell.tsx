import { useState } from 'react';
import { StyleSheet, TextInput, type StyleProp, type TextStyle } from 'react-native';

import { formatNumber } from '../../lib/units';
import { colors, fonts, radius } from '../../theme/tokens';

// Dimmer than secondary text so last-time hints don't read as entered values.
const PLACEHOLDER = 'rgba(170,183,196,0.42)';

type Props = {
  value?: number;
  placeholder?: string;
  decimals?: number;
  onCommit: (v: number | undefined) => void;
  done?: boolean;
  label: string;
  /** Large gym-friendly cell for the single-exercise screen. */
  large?: boolean;
  style?: StyleProp<TextStyle>;
};

/** Numeric cell in the set table. Keeps a text draft while focused, commits parsed numbers. */
export function NumCell({ value, placeholder, decimals = 0, onCommit, done, label, large, style }: Props) {
  const formatted = value != null ? formatNumber(value, decimals) : '';
  // While editing, show the raw draft (e.g. "72,"); otherwise the stored value.
  const [draft, setDraft] = useState<string | null>(null);
  const focused = draft != null;
  const text = draft ?? formatted;

  const commit = (s: string) => {
    const n = parseFloat(s.replace(',', '.'));
    onCommit(Number.isFinite(n) && n >= 0 ? n : undefined);
  };

  return (
    <TextInput
      value={text}
      placeholder={placeholder}
      placeholderTextColor={PLACEHOLDER}
      onChangeText={(s) => {
        setDraft(s);
        commit(s);
      }}
      onFocus={() => setDraft(formatted)}
      onBlur={() => setDraft(null)}
      keyboardType={decimals ? 'decimal-pad' : 'number-pad'}
      selectTextOnFocus
      returnKeyType="done"
      maxLength={6}
      accessibilityLabel={label}
      style={[styles.cell, large && styles.cellLarge, done && styles.cellDone, focused && styles.cellFocused, style]}
    />
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    minWidth: 0,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    color: colors.textPrimary,
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: 16,
    paddingVertical: 0,
    paddingHorizontal: 4,
    fontVariant: ['tabular-nums'],
  },
  cellLarge: { height: 50, borderRadius: radius.md, fontFamily: fonts.bold, fontSize: 22, backgroundColor: colors.surface },
  cellDone: { backgroundColor: 'transparent' },
  cellFocused: { borderWidth: 1, borderColor: colors.accent },
});
