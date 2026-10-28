import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BarcodeIcon, CameraIcon, LightningIcon, MagnifyingGlassIcon, PlusIcon, SparkleIcon, XIcon, type Icon } from '../components/icons';
import { Divider, IconButton, Notice, Segmented, SectionTitle } from '../components/ui/controls';
import { NavBar } from '../components/ui/headers';
import { Screen } from '../components/ui/layout';
import { FOOD_BY_ID, FOODS } from '../data/foods';
import type { Food, MealType } from '../data/types';
import { useT } from '../i18n';
import { useStore } from '../store';
import { colors, fonts, radius, space, type } from '../theme/tokens';

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l');

/**
 * "Add meal" — UI only for this stage (MyFitnessPal-style search, quick tools, recent foods).
 * Logging is wired up in the next stage; every add control surfaces that notice.
 */
export default function AddMeal() {
  const { t, L } = useT();
  const params = useLocalSearchParams<{ meal?: MealType }>();
  const meals = useStore((s) => s.meals);
  const [meal, setMeal] = useState<MealType>(params.meal ?? defaultMeal());
  const [query, setQuery] = useState('');
  const [nudged, setNudged] = useState(false);

  const recent = useMemo(() => {
    const seen = new Set<string>();
    const out: Food[] = [];
    for (const m of [...meals].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))) {
      if (seen.has(m.foodId) || !FOOD_BY_ID[m.foodId]) continue;
      seen.add(m.foodId);
      out.push(FOOD_BY_ID[m.foodId]);
      if (out.length === 5) break;
    }
    return out;
  }, [meals]);

  const q = fold(query.trim());
  const results = q ? FOODS.filter((f) => fold(f.name.en).includes(q) || fold(f.name.pl).includes(q)) : [];
  const nudge = () => setNudged(true);

  const row = (f: Food) => (
    <Pressable key={f.id} style={styles.row} onPress={nudge} accessibilityRole="button" accessibilityLabel={`${L(f.name)}, ${t('common.comingSoon')}`}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowName} numberOfLines={1}>
          {L(f.name)}
        </Text>
        <Text style={styles.rowMeta}>
          {Math.round((f.kcal * f.portion) / 100)} kcal · {f.portion} g
        </Text>
      </View>
      <View style={styles.plus}>
        <PlusIcon size={16} color={colors.accent} weight="bold" />
      </View>
    </Pressable>
  );

  return (
    <Screen top={<NavBar title={t('addMeal.title')} left={<IconButton icon={XIcon} label={t('common.close')} onPress={() => router.back()} />} />}>
      <Segmented
        value={meal}
        onChange={setMeal}
        options={(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((m) => ({ value: m, label: t(`meal.${m}`) }))}
      />

      <View style={styles.search}>
        <MagnifyingGlassIcon size={18} color={colors.textSecondary} weight="bold" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('addMeal.search')}
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          autoCorrect={false}
          accessibilityLabel={t('addMeal.search')}
        />
      </View>

      <View style={styles.tools}>
        <Tool icon={BarcodeIcon} label={t('addMeal.scan')} onPress={nudge} />
        <Tool icon={LightningIcon} label={t('addMeal.quick')} onPress={nudge} />
        <Tool icon={CameraIcon} label={t('addMeal.photo')} onPress={nudge} />
      </View>

      <View style={{ marginTop: space.lg }}>
        <Notice icon={SparkleIcon} text={nudged ? t('common.comingSoon') : t('addMeal.notice')} />
      </View>

      {q ? (
        <>
          <SectionTitle style={styles.section} title={t('addMeal.foods')} aside={String(results.length)} />
          {results.map((f, i) => (
            <View key={f.id}>
              {i > 0 && <Divider />}
              {row(f)}
            </View>
          ))}
        </>
      ) : (
        <>
          {recent.length > 0 && (
            <>
              <SectionTitle style={styles.section} title={t('addMeal.recent')} />
              {recent.map((f, i) => (
                <View key={f.id}>
                  {i > 0 && <Divider />}
                  {row(f)}
                </View>
              ))}
            </>
          )}
          <SectionTitle style={styles.section} title={t('addMeal.foods')} />
          {FOODS.slice(0, 12).map((f, i) => (
            <View key={f.id}>
              {i > 0 && <Divider />}
              {row(f)}
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

function defaultMeal(): MealType {
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'snack';
}

function Tool({ icon: Glyph, label, onPress }: { icon: Icon; label: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.tool, pressed && { opacity: 0.85 }]} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Glyph size={22} color={colors.accent} weight="bold" />
      <Text style={styles.toolLabel} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
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
    marginTop: space.lg,
  },
  input: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.textPrimary, paddingVertical: 0 },
  tools: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  tool: {
    flex: 1,
    minHeight: 84,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    padding: space.sm,
  },
  toolLabel: { ...type.caption, color: colors.textPrimary, textAlign: 'center' },
  section: { marginTop: space.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  rowName: { ...type.itemTitle, color: colors.textPrimary },
  rowMeta: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  plus: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
});
