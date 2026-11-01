import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import type { ManualNutrition } from '../data/types';
import { useT } from '../i18n';
import { formatNumber } from '../lib/units';
import { kcalFromMacros } from '../lib/voiceNutrition';
import { colors, fonts, radius, space, type } from '../theme/tokens';
import { Button } from './ui/controls';
import { Sheet } from './ui/sheets';

/** Calories and macros typed in by hand. Calories default to 4/4/9 from the macros. */
export function ManualSheet({ visible, onClose, onAdd, initial }: { visible: boolean; onClose: () => void; onAdd: (m: ManualNutrition) => void; initial?: ManualNutrition }) {
  const { t } = useT();
  return (
    <Sheet visible={visible} onClose={onClose} title={t('addMeal.manual')}>
      {visible && <ManualEditor onAdd={onAdd} initial={initial} />}
    </Sheet>
  );
}

function ManualEditor({ onAdd, initial }: { onAdd: (m: ManualNutrition) => void; initial?: ManualNutrition }) {
  const { t } = useT();
  const str = (v?: number) => (v ? formatNumber(v, 1).replace(/[.,]0$/, '') : '');
  const [name, setName] = useState(initial?.name ?? '');
  const [kcal, setKcal] = useState(str(initial?.kcal));
  const [protein, setProtein] = useState(str(initial?.protein));
  const [carbs, setCarbs] = useState(str(initial?.carbs));
  const [fat, setFat] = useState(str(initial?.fat));
  const num = (s: string) => {
    const n = parseFloat(s.replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  const derived = kcalFromMacros(num(protein), num(carbs), num(fat));
  const energy = kcal.trim() ? num(kcal) : derived;
  const valid = energy > 0 || num(protein) + num(carbs) + num(fat) > 0;
  const field = (label: string, value: string, set: (v: string) => void, placeholder?: string) => (
    <View style={styles.manualField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput value={value} onChangeText={set} keyboardType="decimal-pad" style={styles.fieldInput} placeholder={placeholder} placeholderTextColor={colors.textSecondary} accessibilityLabel={label} maxLength={6} />
    </View>
  );
  return (
    <>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t('addMeal.manualName')}
        placeholderTextColor={colors.textSecondary}
        style={styles.nameInput}
        maxLength={40}
        accessibilityLabel={t('addMeal.manualName')}
      />
      <View style={styles.manualGrid}>
        {field('kcal', kcal, setKcal, derived ? String(derived) : '0')}
        {field(`${t('macro.protein')} (g)`, protein, setProtein, '0')}
      </View>
      <View style={styles.manualGrid}>
        {field(`${t('macro.carbs')} (g)`, carbs, setCarbs, '0')}
        {field(`${t('macro.fat')} (g)`, fat, setFat, '0')}
      </View>
      {!kcal.trim() && derived > 0 && <Text style={styles.hint}>{t('addMeal.kcalFromMacros', { n: derived })}</Text>}
      <Button
        label={initial ? t('common.save') : t('addMeal.add')}
        disabled={!valid}
        onPress={() => onAdd({ name: name.trim() || t('addMeal.manualDefault'), kcal: Math.round(energy), protein: num(protein), carbs: num(carbs), fat: num(fat) })}
      />
    </>
  );
}

const styles = StyleSheet.create({
  hint: { ...type.caption, color: colors.textSecondary },
  nameInput: { ...type.itemTitle, color: colors.textPrimary, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardStroke },
  manualGrid: { flexDirection: 'row', gap: space.md },
  manualField: { flex: 1, gap: space.xs },
  fieldLabel: { ...type.caption, color: colors.textSecondary },
  fieldInput: {
    height: 46,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardStroke,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 18,
    textAlign: 'center',
  },
});
