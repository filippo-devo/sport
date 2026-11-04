import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { CheckIcon, MagnifyingGlassIcon, MicrophoneIcon, PencilSimpleIcon, PlusIcon, XIcon } from '../components/icons';
import { Button, Card, Divider, IconButton, Segmented, SectionTitle } from '../components/ui/controls';
import { NavBar } from '../components/ui/headers';
import { Screen } from '../components/ui/layout';
import { ManualSheet } from '../components/ManualSheet';
import { Sheet } from '../components/ui/sheets';
import { FOOD_BY_ID, FOODS } from '../data/foods';
import type { Food, ManualNutrition, MealType } from '../data/types';
import { useT } from '../i18n';
import { useDictation } from '../lib/dictation';
import { formatNumber } from '../lib/units';
import { fold, hasValues, kcalFromMacros, parseNutrition } from '../lib/voiceNutrition';
import { useStore } from '../store';
import { useUi } from '../store/ui';
import { colors, fonts, radius, space, type } from '../theme/tokens';

const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/**
 * Add to the diary for the day selected on the Food tab:
 * say or type values ("Zjadłem 30 g białka"), enter them by hand, or pick a food and its amount.
 */
export default function AddMeal() {
  const { t, L, lang } = useT();
  const params = useLocalSearchParams<{ meal?: MealType; mode?: 'manual' | 'voice' | 'search' }>();
  const meals = useStore((s) => s.meals);
  const addFood = useStore((s) => s.addFood);
  const addManual = useStore((s) => s.addManual);
  const date = useUi((s) => s.foodDate);
  const [meal, setMeal] = useState<MealType>(params.meal ?? defaultMeal());
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Food | null>(null);
  const [manualOpen, setManualOpen] = useState(params.mode === 'manual');

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
  const done = () => router.back();

  const row = (f: Food) => (
    <Pressable key={f.id} style={styles.row} onPress={() => setPicked(f)} accessibilityRole="button" accessibilityLabel={L(f.name)}>
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
    <Screen top={<NavBar title={t('addMeal.title')} left={<IconButton icon={XIcon} label={t('common.close')} onPress={done} />} />}>
      <Segmented value={meal} onChange={setMeal} options={MEALS.map((m) => ({ value: m, label: t(`meal.${m}`) }))} />

      <VoiceEntry
        lang={lang}
        autoFocus={params.mode === 'voice'}
        onAdd={(entries) => {
          for (const e of entries) {
            if ('foodId' in e) addFood({ ...e, meal, date });
            else addManual({ manual: e, meal, date });
          }
          done();
        }}
      />

      <Pressable style={({ pressed }) => [styles.manual, pressed && { opacity: 0.85 }]} onPress={() => setManualOpen(true)} accessibilityRole="button">
        <PencilSimpleIcon size={18} color={colors.accent} weight="bold" />
        <View style={{ flex: 1 }}>
          <Text style={styles.manualTitle}>{t('addMeal.manual')}</Text>
          <Text style={styles.rowMeta}>{t('addMeal.manualBody')}</Text>
        </View>
      </Pressable>

      <View style={styles.search}>
        <MagnifyingGlassIcon size={18} color={colors.textSecondary} weight="bold" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('addMeal.search')}
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          autoCorrect={false}
          autoFocus={params.mode === 'search'}
          accessibilityLabel={t('addMeal.search')}
        />
      </View>

      {q ? (
        <>
          <SectionTitle style={styles.section} title={t('addMeal.foods')} aside={String(results.length)} />
          {results.length === 0 && <Text style={[styles.rowMeta, { marginTop: space.sm }]}>{t('addMeal.noResults')}</Text>}
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
          {FOODS.map((f, i) => (
            <View key={f.id}>
              {i > 0 && <Divider />}
              {row(f)}
            </View>
          ))}
        </>
      )}

      <FoodSheet
        food={picked}
        onClose={() => setPicked(null)}
        onAdd={(grams) => {
          if (picked) addFood({ foodId: picked.id, grams, meal, date });
          setPicked(null);
          done();
        }}
      />
      <ManualSheet
        visible={manualOpen}
        onClose={() => setManualOpen(false)}
        onAdd={(manual) => {
          addManual({ manual, meal, date });
          setManualOpen(false);
          done();
        }}
      />
    </Screen>
  );
}

type Entry = ManualNutrition | { foodId: string; grams: number };

/** Free text or dictation, parsed into values; shows exactly what will be logged before adding. */
function VoiceEntry({ lang, autoFocus, onAdd }: { lang: 'en' | 'pl'; autoFocus?: boolean; onAdd: (entries: Entry[]) => void }) {
  const { t, L } = useT();
  const [text, setText] = useState('');
  const dictation = useDictation(lang, setText);
  const parsed = useMemo(() => parseNutrition(text), [text]);
  const macros = parsed.kcal != null || parsed.protein != null || parsed.carbs != null || parsed.fat != null;
  const kcal = parsed.kcal ?? kcalFromMacros(parsed.protein, parsed.carbs, parsed.fat);

  const add = () => {
    const entries: Entry[] = parsed.foods.map((f) => ({ foodId: f.food.id, grams: Math.round(f.grams) }));
    if (macros)
      entries.push({
        name: t('addMeal.voiceName'),
        kcal,
        protein: parsed.protein ?? 0,
        carbs: parsed.carbs ?? 0,
        fat: parsed.fat ?? 0,
      });
    onAdd(entries);
  };

  return (
    <Card style={styles.voice}>
      <Text style={styles.manualTitle}>{t('addMeal.voice')}</Text>
      <View style={styles.voiceRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t('addMeal.voicePlaceholder')}
          placeholderTextColor={colors.textSecondary}
          style={styles.voiceInput}
          multiline
          autoFocus={autoFocus}
          accessibilityLabel={t('addMeal.voice')}
        />
        {dictation.supported && (
          <IconButton
            icon={dictation.listening ? XIcon : MicrophoneIcon}
            label={dictation.listening ? t('addMeal.stop') : t('addMeal.speak')}
            tone={dictation.listening ? 'accent' : 'control'}
            onPress={dictation.listening ? dictation.stop : dictation.start}
          />
        )}
      </View>
      <Text style={styles.hint}>{dictation.supported ? t('addMeal.voiceHintWeb') : t('addMeal.voiceHintKeyboard')}</Text>
      {dictation.error && <Text style={[styles.hint, { color: colors.danger }]}>{t('addMeal.voiceError')}</Text>}

      {text.trim().length > 0 &&
        (hasValues(parsed) ? (
          <View style={styles.parsed}>
            {parsed.foods.map((f, i) => (
              <Text key={i} style={styles.parsedLine}>
                {L(f.food.name)} · {Math.round(f.grams)} g · {Math.round((f.food.kcal * f.grams) / 100)} kcal
              </Text>
            ))}
            {macros && (
              <Text style={styles.parsedLine}>
                {kcal} kcal{parsed.kcal == null ? ` (${t('addMeal.fromMacros')})` : ''}
                {parsed.protein != null ? ` · ${t('macro.p')} ${formatNumber(parsed.protein, 1)} g` : ''}
                {parsed.carbs != null ? ` · ${t('macro.c')} ${formatNumber(parsed.carbs, 1)} g` : ''}
                {parsed.fat != null ? ` · ${t('macro.f')} ${formatNumber(parsed.fat, 1)} g` : ''}
              </Text>
            )}
            <Button label={t('addMeal.addParsed')} icon={CheckIcon} size="sm" onPress={add} />
          </View>
        ) : (
          <Text style={styles.hint}>{t('addMeal.notUnderstood')}</Text>
        ))}
    </Card>
  );
}

function FoodSheet({ food, onClose, onAdd }: { food: Food | null; onClose: () => void; onAdd: (grams: number) => void }) {
  return (
    <Sheet visible={!!food} onClose={onClose}>
      {food && <FoodEditor food={food} onAdd={onAdd} />}
    </Sheet>
  );
}

function FoodEditor({ food, onAdd }: { food: Food; onAdd: (grams: number) => void }) {
  const { t, L } = useT();
  const [text, setText] = useState(String(food.portion));
  const grams = parseFloat(text.replace(',', '.'));
  const valid = Number.isFinite(grams) && grams > 0 && grams <= 5000;
  const k = valid ? grams / 100 : 0;
  return (
    <>
      <Text style={styles.sheetTitle}>{L(food.name)}</Text>
      <View style={styles.amountRow}>
        {[0.5, 1, 1.5, 2].map((m) => (
          <Pressable key={m} style={styles.preset} onPress={() => setText(String(Math.round(food.portion * m)))} accessibilityRole="button">
            <Text style={styles.presetText}>{Math.round(food.portion * m)} g</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.gramsWrap}>
        <TextInput value={text} onChangeText={setText} keyboardType="decimal-pad" selectTextOnFocus style={styles.gramsInput} accessibilityLabel={t('mealDetail.amount')} maxLength={5} />
        <Text style={styles.gramsUnit}>g</Text>
      </View>
      <Text style={styles.parsedLine}>
        {Math.round(food.kcal * k)} kcal · {t('macro.p')} {formatNumber(food.protein * k, 1)} g · {t('macro.c')} {formatNumber(food.carbs * k, 1)} g · {t('macro.f')}{' '}
        {formatNumber(food.fat * k, 1)} g
      </Text>
      <Button label={t('addMeal.add')} disabled={!valid} onPress={() => onAdd(Math.round(grams))} />
    </>
  );
}

function defaultMeal(): MealType {
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'snack';
}

const styles = StyleSheet.create({
  voice: { marginTop: space.lg, gap: space.sm },
  voiceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  voiceInput: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardStroke,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
    fontSize: 16,
  },
  hint: { ...type.caption, color: colors.textSecondary },
  parsed: { gap: space.sm, paddingTop: space.xs },
  parsedLine: { ...type.body, color: colors.textPrimary },
  manual: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  manualTitle: { ...type.itemTitle, fontFamily: fonts.semibold, color: colors.textPrimary },
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
    marginTop: space.xl,
  },
  input: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.textPrimary, paddingVertical: 0 },
  section: { marginTop: space.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  rowName: { ...type.itemTitle, color: colors.textPrimary },
  rowMeta: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  plus: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { ...type.sectionTitle, color: colors.textPrimary },
  amountRow: { flexDirection: 'row', gap: space.sm },
  preset: { flex: 1, height: 36, borderRadius: radius.pill, backgroundColor: colors.control, alignItems: 'center', justifyContent: 'center' },
  presetText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textPrimary },
  gramsWrap: {
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardStroke,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  gramsInput: { fontFamily: fonts.bold, fontSize: 30, color: colors.textPrimary, textAlign: 'center', minWidth: 80, padding: 0 },
  gramsUnit: { fontFamily: fonts.medium, fontSize: 17, color: colors.textSecondary },
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
