// Turns a spoken or typed sentence into diary values, e.g.
//   "Zjadłem 30 gramów białka"            → protein 30 g
//   "500 kcal, 40 g węglowodanów i 10 tłuszczu" → kcal 500, carbs 40, fat 10
//   "I ate 150 g of chicken breast"        → 150 g of a matching food from the database
// Purely rule-based: no AI and no network.

import { FOODS } from '../data/foods';
import type { Food } from '../data/types';

export type ParsedFood = { food: Food; grams: number };
export type ParsedNutrition = {
  kcal?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  foods: ParsedFood[];
};

export const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l');

type Macro = 'kcal' | 'protein' | 'carbs' | 'fat';

// Folded word stems; a token matches when it starts with one of them.
const STEMS: Record<Macro, string[]> = {
  kcal: ['kcal', 'kalori', 'kilokalori', 'calorie', 'calories', 'cal', 'kal'],
  protein: ['bialk', 'protein', 'prot'],
  carbs: ['weglowodan', 'wegl', 'carb', 'carbohydrate'],
  fat: ['tluszcz', 'tlusc', 'fat'],
};

const GRAM = /^(g|gr|gram|grams|grama|gramy|gramow|gramach)$/;
const FILLER = new Set(['of', 'i', 'and', 'oraz', 'a', 'z', 'ze', 'the', 'w', 'na']);

const NUMBER_WORDS: Record<string, number> = {
  jeden: 1, jedna: 1, dwa: 2, dwie: 2, trzy: 3, cztery: 4, piec: 5, szesc: 6, siedem: 7, osiem: 8, dziewiec: 9, dziesiec: 10,
  pietnascie: 15, dwadziescia: 20, trzydziesci: 30, czterdziesci: 40, piecdziesiat: 50, szescdziesiat: 60,
  siedemdziesiat: 70, osiemdziesiat: 80, dziewiecdziesiat: 90, sto: 100, dwiescie: 200, trzysta: 300,
  czterysta: 400, piecset: 500, szescset: 600, siedemset: 700, osiemset: 800, dziewiecset: 900, tysiac: 1000,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fifteen: 15, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
};

function macroOf(token: string): Macro | undefined {
  for (const m of Object.keys(STEMS) as Macro[]) if (STEMS[m].some((s) => token.startsWith(s))) return m;
  return undefined;
}

/** Reads a number at tokens[i] (digits, "1,5", or number words like "trzydzieści pięć"). */
function readNumber(tokens: string[], i: number): { value: number; next: number } | undefined {
  const t = tokens[i];
  if (!t) return undefined;
  const digits = t.match(/^(\d+(?:[.,]\d+)?)(g|kcal)?$/);
  if (digits) return { value: parseFloat(digits[1].replace(',', '.')), next: i };
  if (NUMBER_WORDS[t] == null) return undefined;
  let value = NUMBER_WORDS[t];
  let j = i;
  // "trzysta dwadzieścia pięć" / "two hundred": add smaller parts, multiply by hundred.
  while (tokens[j + 1] && NUMBER_WORDS[tokens[j + 1]] != null) {
    const n = NUMBER_WORDS[tokens[j + 1]];
    value = n === 100 && value < 10 ? value * 100 : value + n;
    j++;
  }
  return { value, next: j };
}

function findFood(words: string[]): Food | undefined {
  const query = words.filter((w) => !FILLER.has(w) && w.length > 2);
  if (!query.length) return undefined;
  let best: { food: Food; score: number } | undefined;
  for (const food of FOODS) {
    const names = [fold(food.name.pl), fold(food.name.en)].map((n) => n.split(/[^a-z0-9]+/).filter(Boolean));
    let score = 0;
    for (const q of query) {
      const stem = q.slice(0, Math.max(4, Math.min(q.length - 1, 6)));
      if (names.some((n) => n.some((w) => w.startsWith(stem) || q.startsWith(w.slice(0, Math.max(4, w.length - 2)))))) score++;
    }
    if (score && (!best || score > best.score)) best = { food, score };
  }
  return best?.food;
}

export function parseNutrition(input: string): ParsedNutrition {
  const tokens = fold(input)
    .replace(/(\d)\s*(g|kcal)\b/g, '$1 $2')
    .split(/[^a-z0-9.,]+/)
    .map((t) => t.replace(/[.,]+$/, ''))
    .filter(Boolean);
  const out: ParsedNutrition = { foods: [] };

  for (let i = 0; i < tokens.length; i++) {
    const num = readNumber(tokens, i);
    if (num) {
      let j = num.next + 1;
      const isGram = tokens[j] != null && GRAM.test(tokens[j]);
      if (isGram) j++;
      while (tokens[j] && FILLER.has(tokens[j])) j++;
      const macro = tokens[j] ? macroOf(tokens[j]) : undefined;
      if (macro) {
        out[macro] = (out[macro] ?? 0) + num.value;
        i = j;
        continue;
      }
      if (isGram) {
        // "150 g piersi z kurczaka": up to four words name the food.
        const words = tokens.slice(j, j + 4).filter((w) => !macroOf(w) && readNumber([w], 0) == null);
        const food = findFood(words);
        if (food) out.foods.push({ food, grams: num.value });
        i = j - 1 + Math.max(1, words.length);
        continue;
      }
      i = num.next;
      continue;
    }
    // "białko 30" / "protein 30g": macro word first, then the number.
    const macro = macroOf(tokens[i]);
    if (macro) {
      const after = readNumber(tokens, i + 1);
      if (after) {
        out[macro] = (out[macro] ?? 0) + after.value;
        i = after.next;
        if (tokens[i + 1] && GRAM.test(tokens[i + 1])) i++;
      }
    }
  }
  return out;
}

/** Energy from macros (4/4/9 kcal per gram) when no calories were said. */
export const kcalFromMacros = (p = 0, c = 0, f = 0) => Math.round(p * 4 + c * 4 + f * 9);

export const hasValues = (p: ParsedNutrition) => p.foods.length > 0 || [p.kcal, p.protein, p.carbs, p.fat].some((v) => v != null);
