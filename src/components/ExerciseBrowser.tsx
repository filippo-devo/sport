import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { EXERCISES } from '../data/exercises';
import type { Equipment, Exercise, Muscle } from '../data/types';
import { useT } from '../i18n';
import { colors, fonts, radius, space, type } from '../theme/tokens';
import { ExerciseTile } from './EquipmentGlyph';
import { CaretRightIcon, MagnifyingGlassIcon, PlusIcon, XIcon } from './icons';
import { Button, Chip } from './ui/controls';
import { useLayout } from './ui/layout';

const MUSCLES: Muscle[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'core', 'quads', 'hamstrings', 'glutes', 'calves'];
const EQUIPMENT: Equipment[] = ['barbell', 'dumbbell', 'kettlebell', 'cable', 'machine', 'bodyweight', 'band'];

/** Folds Polish diacritics so "wyciskanie" matches "Wyciśnij" etc. */
const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l');

type Props = {
  onSelect: (e: Exercise) => void;
  mode: 'browse' | 'pick';
};

/** Search + muscle/equipment filters + alphabetical list (Fitbod library pattern). */
export function ExerciseBrowser({ onSelect, mode }: Props) {
  const { t, tn, L, lang } = useT();
  const { gutter } = useLayout();
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);

  const results = useMemo(() => {
    const q = fold(query.trim());
    return EXERCISES.filter(
      (e) =>
        (!muscle || e.muscle === muscle || e.secondary.includes(muscle)) &&
        (!equipment || e.equipment === equipment) &&
        (!q || fold(e.name.en).includes(q) || fold(e.name.pl).includes(q)),
    ).sort((a, b) => L(a.name).localeCompare(L(b.name), lang));
  }, [query, muscle, equipment, L, lang]);

  // Primary muscle first, then exercises that only hit it secondarily.
  const sorted = muscle ? [...results.filter((e) => e.muscle === muscle), ...results.filter((e) => e.muscle !== muscle)] : results;
  let lastLetter = '';

  return (
    <View>
      <View style={styles.search}>
        <MagnifyingGlassIcon size={18} color={colors.textSecondary} weight="bold" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('library.search')}
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel={t('library.search')}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel={t('library.clear')}>
            <XIcon size={16} color={colors.textSecondary} weight="bold" />
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.filterLabel}>{t('library.muscle')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -gutter }} contentContainerStyle={[styles.chips, { paddingHorizontal: gutter }]}>
        <Chip label={t('library.all')} selected={!muscle} onPress={() => setMuscle(null)} />
        {MUSCLES.map((m) => (
          <Chip key={m} label={t(`muscle.${m}`)} selected={muscle === m} onPress={() => setMuscle(muscle === m ? null : m)} />
        ))}
      </ScrollView>

      <Text style={styles.filterLabel}>{t('library.equipment')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -gutter }} contentContainerStyle={[styles.chips, { paddingHorizontal: gutter }]}>
        <Chip label={t('library.all')} selected={!equipment} onPress={() => setEquipment(null)} />
        {EQUIPMENT.map((q) => (
          <Chip key={q} label={t(`equipment.${q}`)} selected={equipment === q} onPress={() => setEquipment(equipment === q ? null : q)} />
        ))}
      </ScrollView>

      <Text style={styles.count}>{tn('unit.exercises', sorted.length)}</Text>

      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('library.empty')}</Text>
          <Button
            label={t('library.clear')}
            variant="secondary"
            size="sm"
            onPress={() => {
              setQuery('');
              setMuscle(null);
              setEquipment(null);
            }}
          />
        </View>
      ) : (
        sorted.map((e) => {
          const letter = L(e.name)[0].toUpperCase();
          const header = !muscle && !query && letter !== lastLetter;
          lastLetter = letter;
          return (
            <View key={e.id}>
              {header && <Text style={styles.letter}>{letter}</Text>}
              <Pressable
                onPress={() => onSelect(e)}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel={L(e.name)}
              >
                <ExerciseTile equipment={e.equipment} size={48} />
                <View style={styles.rowText}>
                  <Text style={styles.name} numberOfLines={2}>
                    {L(e.name)}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {t(`muscle.${e.muscle}`)} · {t(`equipment.${e.equipment}`)}
                  </Text>
                </View>
                {mode === 'pick' ? (
                  <View style={styles.add}>
                    <PlusIcon size={16} color={colors.accent} weight="bold" />
                  </View>
                ) : (
                  <CaretRightIcon size={16} color={colors.textSecondary} weight="bold" />
                )}
              </Pressable>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 46,
    paddingHorizontal: space.md + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  input: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.textPrimary, paddingVertical: 0 },
  filterLabel: { ...type.caption, color: colors.textSecondary, marginTop: space.lg, marginBottom: space.sm },
  chips: { gap: space.sm },
  count: { ...type.caption, color: colors.textSecondary, marginTop: space.lg, fontVariant: ['tabular-nums'] },
  letter: { fontFamily: fonts.semibold, fontSize: 13, color: colors.accent, marginTop: space.lg, marginBottom: 2, letterSpacing: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm + 2 },
  rowText: { flex: 1, minWidth: 0 },
  name: { ...type.itemTitle, color: colors.textPrimary },
  meta: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  add: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: space.md, paddingVertical: space.xxxl },
  emptyText: { ...type.body, color: colors.textSecondary },
});
