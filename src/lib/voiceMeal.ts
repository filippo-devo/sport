// Turns a spoken meal into diary entries, e.g.
//   "Na obiad jadłem pierś z kurczaka z ryżem i brokułem"   → lunch: chicken, rice, broccoli (typical portions)
//   "Na śniadanie dwa jajka i kromkę chleba"                → breakfast: 2 eggs (110 g), 1 slice of bread (35 g)
//   "Wczoraj na kolację 200 g łososia i pół talerza ziemniaków" → yesterday's dinner
//   "Zjadłem 30 g białka"                                   → macros only (same as the typed voice entry)
// Purely rule-based: no AI and no network. Foods come from the local database (src/data/foods.ts).

import { FOOD_BY_ID } from '../data/foods';
import type { Food, MealType } from '../data/types';
import { fold, hasValues, parseNutrition, readNumber, type ParsedNutrition } from './voiceNutrition';

export type SpokenFood = { food: Food; grams: number };
export type SpokenMeal = {
  meal: MealType;
  /** True when the meal was named in the sentence (otherwise it comes from the time of day). */
  mealSaid: boolean;
  /** Days back from today: 0 today, 1 for "wczoraj" / "yesterday". */
  daysAgo: number;
  foods: SpokenFood[];
  /** Macros said directly ("30 g białka"), when no food was recognised. */
  macros?: ParsedNutrition;
};

type Alias = { stems: string[]; id: string; piece?: number; dish?: boolean };

// Folded word stems → food. The longest matching stem wins ("pomidorowa" soup vs "pomidor").
// `piece` = grams of one piece, used for "dwa jajka", "trzy pierogi". `dish` = things eaten "z" something
// ("rosół z kurczaka", "pizza z szynką"), where the word after "z" is part of the dish, not another food.
const ALIASES: Alias[] = [
  { id: 'egg', stems: ['jaj', 'jajecznic', 'omlet', 'egg'], piece: 55 },
  { id: 'banana', stems: ['banan'], piece: 120 },
  { id: 'apple', stems: ['jablk', 'jablek', 'apple'], piece: 180 },
  { id: 'oats', stems: ['owsian', 'platk', 'oat', 'porridge'] },
  { id: 'greek-yogurt', stems: ['jogurt', 'yogurt', 'yoghurt'] },
  { id: 'skyr', stems: ['skyr'] },
  { id: 'whey', stems: ['odzyw', 'serwatk', 'whey', 'szejk', 'shake'] },
  { id: 'peanut-butter', stems: ['orzechow', 'peanut'] },
  { id: 'wholegrain-bread', stems: ['chleb', 'kromk', 'kromek', 'kanapk', 'kanapek', 'pieczyw', 'tost', 'bread', 'toast', 'sandwich'], piece: 35 },
  { id: 'cottage-cheese', stems: ['wiejsk', 'cottage'] },
  { id: 'quark', stems: ['twarog', 'twarozk', 'quark'] },
  { id: 'chicken-breast', stems: ['kurczak', 'kurczac', 'kurak', 'chicken'] },
  { id: 'turkey', stems: ['indyk', 'indycz', 'turkey'] },
  { id: 'salmon', stems: ['losos', 'salmon'] },
  { id: 'beef', stems: ['wolow', 'stek', 'befsztyk', 'beef', 'steak'] },
  { id: 'tuna', stems: ['tunczyk', 'tuna'] },
  { id: 'rice', stems: ['ryz', 'rice'] },
  { id: 'pasta', stems: ['makaron', 'spaghetti', 'pasta', 'penne'] },
  { id: 'potatoes', stems: ['ziemniak', 'ziemniacz', 'kartofl', 'potato'] },
  { id: 'sweet-potato', stems: ['batat'] },
  { id: 'broccoli', stems: ['brokul', 'broccoli'] },
  { id: 'mixed-salad', stems: ['salat', 'surowk', 'salad'] },
  { id: 'tomato', stems: ['pomidor', 'tomato'], piece: 120 },
  { id: 'avocado', stems: ['awokad', 'avocado'], piece: 140 },
  { id: 'olive-oil', stems: ['oliw', 'olive'] },
  { id: 'almonds', stems: ['migdal', 'almond'] },
  { id: 'dark-chocolate', stems: ['czekolad', 'chocolate'] },
  { id: 'protein-bar', stems: ['baton', 'bar'], piece: 60 },
  { id: 'hummus', stems: ['hummus'] },
  { id: 'mozzarella', stems: ['mozzarel', 'mozarel'] },
  { id: 'lentil-soup', stems: ['soczewic', 'lentil'], dish: true },
  { id: 'milk', stems: ['mlek', 'mleka', 'milk'] },
  { id: 'blueberries', stems: ['borowk', 'jagod', 'blueberr'] },
  { id: 'pork-cutlet', stems: ['schabow', 'kotlet', 'schab', 'schnitzel'], piece: 150 },
  { id: 'pierogi', stems: ['pierog', 'pierozk', 'dumpling'], piece: 40, dish: true },
  { id: 'pizza', stems: ['pizz'], dish: true },
  { id: 'kebab', stems: ['kebab'], dish: true },
  { id: 'burger', stems: ['burger', 'hamburger'], piece: 220, dish: true },
  { id: 'fries', stems: ['frytk', 'fries'] },
  { id: 'tomato-soup', stems: ['pomidorowa', 'pomidorowej', 'pomidorowk', 'zupa pomidorowa'], dish: true },
  { id: 'chicken-soup', stems: ['rosol', 'rosolu', 'rosolek'], dish: true },
  { id: 'pancakes', stems: ['nalesnik', 'pancake', 'crepe'], piece: 70, dish: true },
];

const MEAL_WORDS: { stems: string[]; meal: MealType }[] = [
  { stems: ['sniadan', 'breakfast'], meal: 'breakfast' },
  { stems: ['obiad', 'lunch'], meal: 'lunch' },
  { stems: ['kolacj', 'dinner', 'supper'], meal: 'dinner' },
  { stems: ['przekas', 'podwieczor', 'deser', 'snack', 'dessert'], meal: 'snack' },
];

// Words that end the amount belonging to a food ("ryż i 2 jajka": the 2 belongs to the eggs).
const BREAK = new Set(['i', 'oraz', 'plus', 'a', 'and', 'tez', 'do', 'tego', 'potem', 'jeszcze']);

// Units: grams per unit; `portion` = one typical portion of that food, `piece` = one piece.
type Unit = number | 'portion' | 'piece';
const UNITS: { test: RegExp; unit: Unit }[] = [
  { test: /^(g|gr|gram|grams|grama|gramy|gramow|gramach)$/, unit: 1 },
  { test: /^(ml|mililitr\w*)$/, unit: 1 },
  { test: /^(kg|kilo|kilogram\w*)$/, unit: 1000 },
  { test: /^(sztuk\w*|szt|piece\w*)$/, unit: 'piece' },
  { test: /^(kromk\w*|kromek|plaster\w*|slice\w*)$/, unit: 35 },
  { test: /^(szklank\w*|kub\w*|glass\w*|cup\w*)$/, unit: 250 },
  { test: /^(lyzeczk\w*|lyzeczek|teaspoon\w*)$/, unit: 5 },
  { test: /^(lyzk\w*|lyzek|lyzka|tablespoon\w*|spoon\w*)$/, unit: 12 },
  { test: /^(garsc\w*|garstk\w*|handful\w*)$/, unit: 30 },
  { test: /^(puszk\w*|puszek|can|cans)$/, unit: 120 },
  { test: /^(talerz\w*|porcj\w*|porcji|misk\w*|miseczk\w*|plate\w*|bowl\w*|portion\w*|serving\w*)$/, unit: 'portion' },
];

const BIG = /^(duz[aeyo]|duzej|duzego|duzym|large|big)$/;
const SMALL = /^(mal[aeyo]|malej|malego|malym|small)$/;
const HALF = /^(pol|polowe|polowke|polowka|half)$/;

const unitOf = (t: string | undefined): Unit | undefined => (t ? UNITS.find((u) => u.test.test(t))?.unit : undefined);

function aliasOf(token: string): Alias | undefined {
  let best: { a: Alias; len: number } | undefined;
  for (const a of ALIASES)
    for (const s of a.stems)
      if (!s.includes(' ') && token.startsWith(s) && (!best || s.length > best.len)) best = { a, len: s.length };
  // "pomidorów" (tomatoes, genitive) folds to "pomidorow"; the soup is "pomidorowa/-ej/-ą".
  if (best?.a.id === 'tomato-soup' && token === 'pomidorow') return ALIASES.find((a) => a.id === 'tomato');
  return best?.a;
}

export function defaultMeal(date = new Date()): MealType {
  const h = date.getHours();
  return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'snack';
}

type Amount = { count?: number; unit?: Unit; scale: number; used: number[] };

/** Reads an amount in tokens[from..to] (inclusive), e.g. "200 g", "dwa", "pół talerza", "dużą". */
function readAmount(tokens: string[], from: number, to: number, taken: Set<number>): Amount {
  const out: Amount = { scale: 1, used: [] };
  for (let i = from; i <= to; i++) {
    if (taken.has(i)) continue;
    const t = tokens[i];
    if (BIG.test(t)) {
      out.scale *= 1.5;
      out.used.push(i);
      continue;
    }
    if (SMALL.test(t)) {
      out.scale *= 0.6;
      out.used.push(i);
      continue;
    }
    if (HALF.test(t)) {
      out.count = (out.count ?? 0) + 0.5;
      out.used.push(i);
      continue;
    }
    const unit = unitOf(t);
    if (unit != null) {
      out.unit = unit;
      out.used.push(i);
      continue;
    }
    const num = readNumber(tokens, i);
    if (num && num.next <= to) {
      out.count = (out.count ?? 0) + num.value;
      for (let k = i; k <= num.next; k++) out.used.push(k);
      i = num.next;
    }
  }
  return out;
}

function gramsFor(food: Food, alias: Alias, a: Amount): number {
  let grams: number;
  if (a.unit === 'portion') grams = (a.count ?? 1) * food.portion;
  else if (a.unit === 'piece') grams = (a.count ?? 1) * (alias.piece ?? food.portion);
  else if (typeof a.unit === 'number') {
    // "kromka" / "szklanka" without a number means one.
    grams = (a.count ?? 1) * a.unit;
    if (a.unit === 12 && food.id === 'olive-oil') grams = (a.count ?? 1) * 10;
  } else if (a.count != null) {
    // Bare number: pieces for countable food ("dwa jajka"), grams when it looks like grams ("kurczak 200"),
    // otherwise portions ("dwa talerze" without the unit word recognised).
    if (alias.piece) grams = a.count * alias.piece;
    else if (a.count >= 20) grams = a.count;
    else grams = a.count * food.portion;
  } else grams = food.portion;
  return Math.max(1, Math.round(grams * a.scale));
}

export function parseMealSpeech(input: string, now = new Date()): SpokenMeal {
  const tokens = fold(input)
    .replace(/(\d)\s*(g|kg|ml)\b/g, '$1 $2')
    .split(/[^a-z0-9.,]+/)
    .map((t) => t.replace(/[.,]+$/, ''))
    .filter(Boolean);

  let meal: MealType | undefined;
  let daysAgo = 0;
  const taken = new Set<number>();
  tokens.forEach((t, i) => {
    if (t === 'wczoraj' || t === 'yesterday') {
      daysAgo = 1;
      taken.add(i);
    }
    if (t === 'przedwczoraj') {
      daysAgo = 2;
      taken.add(i);
    }
    const m = MEAL_WORDS.find((w) => w.stems.some((s) => t.startsWith(s)));
    if (m) {
      // "drugie śniadanie" is a snack.
      meal = m.meal === 'breakfast' && tokens[i - 1]?.startsWith('drugi') ? 'snack' : m.meal;
      taken.add(i);
    }
  });

  // Food words, in order.
  const hits: { i: number; alias: Alias }[] = [];
  tokens.forEach((t, i) => {
    if (taken.has(i)) return;
    const alias = aliasOf(t);
    if (!alias) return;
    // "rosół z kurczaka", "pizza z pieczarkami": the word after "z" belongs to the dish.
    const prev = hits[hits.length - 1];
    if (prev && prev.alias.dish && (tokens[i - 1] === 'z' || tokens[i - 1] === 'ze') && prev.i >= i - 3) return;
    // Same food said twice in a row ("jajka, jajecznica") counts once.
    if (prev && prev.alias.id === alias.id && prev.i >= i - 2) return;
    hits.push({ i, alias });
  });

  const foods: SpokenFood[] = [];
  hits.forEach((h, n) => {
    const food = FOOD_BY_ID[h.alias.id];
    if (!food) return;
    // Amount before the food word, back to the previous food or "i"/"oraz".
    let from = h.i - 1;
    const lower = n > 0 ? hits[n - 1].i : -1;
    while (from > lower && from >= h.i - 4 && !BREAK.has(tokens[from])) from--;
    let amount = readAmount(tokens, from + 1, h.i - 1, taken);
    // Or right after it: "kurczak 200 gram", "łosoś, dwieście gramów".
    if (amount.count == null && amount.unit == null) {
      const upper = n + 1 < hits.length ? hits[n + 1].i - 1 : tokens.length - 1;
      let to = h.i + 1;
      while (to <= upper && to <= h.i + 3 && !BREAK.has(tokens[to])) to++;
      const after = readAmount(tokens, h.i + 1, to - 1, taken);
      if (after.count != null) amount = { ...after, scale: amount.scale * after.scale };
    }
    // "kromkę chleba": the food word can itself be the unit.
    if (amount.unit == null) amount.unit = unitOf(tokens[h.i]);
    amount.used.forEach((k) => taken.add(k));
    foods.push({ food, grams: gramsFor(food, h.alias, amount) });
  });

  // Nothing recognised by name: fall back to macros said directly ("500 kcal i 30 g białka").
  let macros: ParsedNutrition | undefined;
  if (!foods.length) {
    const p = parseNutrition(input);
    if (hasValues(p)) {
      p.foods.forEach((f) => foods.push(f));
      if ([p.kcal, p.protein, p.carbs, p.fat].some((v) => v != null)) macros = { ...p, foods: [] };
    }
  }

  return { meal: meal ?? defaultMeal(now), mealSaid: meal != null, daysAgo, foods, macros };
}
