import type { Food } from './types';

// Small local food database. Values per 100 g (approximate, generic items).
function food(
  id: string,
  en: string,
  pl: string,
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
  fiber: number,
  sugar: number,
  portion: number,
): Food {
  return { id, name: { en, pl }, kcal, protein, carbs, fat, fiber, sugar, portion };
}

export const FOODS: Food[] = [
  food('oats', 'Rolled oats', 'Płatki owsiane', 379, 13.2, 67.7, 6.5, 10.1, 1, 60),
  food('greek-yogurt', 'Greek yogurt 2%', 'Jogurt grecki 2%', 73, 9.9, 3.9, 2, 0, 3.6, 170),
  food('skyr', 'Skyr, natural', 'Skyr naturalny', 63, 11, 4, 0.2, 0, 4, 150),
  food('egg', 'Whole egg', 'Jajko kurze', 143, 12.6, 0.7, 9.5, 0, 0.4, 110),
  food('banana', 'Banana', 'Banan', 89, 1.1, 22.8, 0.3, 2.6, 12.2, 120),
  food('blueberries', 'Blueberries', 'Borówki amerykańskie', 57, 0.7, 14.5, 0.3, 2.4, 10, 100),
  food('apple', 'Apple', 'Jabłko', 52, 0.3, 13.8, 0.2, 2.4, 10.4, 180),
  food('whey', 'Whey protein', 'Białko serwatkowe', 400, 80, 8, 6, 0, 5, 30),
  food('peanut-butter', 'Peanut butter', 'Masło orzechowe', 588, 25, 20, 50, 6, 9, 20),
  food('wholegrain-bread', 'Wholegrain bread', 'Chleb pełnoziarnisty', 247, 13, 41, 3.4, 7, 6, 70),
  food('cottage-cheese', 'Cottage cheese', 'Serek wiejski', 98, 11.1, 3.4, 4.3, 0, 2.7, 200),
  food('chicken-breast', 'Chicken breast, grilled', 'Pierś z kurczaka, grillowana', 165, 31, 0, 3.6, 0, 0, 180),
  food('turkey', 'Turkey breast', 'Pierś z indyka', 135, 30, 0, 1, 0, 0, 150),
  food('salmon', 'Salmon, baked', 'Łosoś pieczony', 206, 22, 0, 12.4, 0, 0, 150),
  food('beef', 'Lean beef, cooked', 'Chuda wołowina, gotowana', 217, 26, 0, 12, 0, 0, 150),
  food('tuna', 'Tuna in water', 'Tuńczyk w wodzie', 116, 25.5, 0, 0.8, 0, 0, 120),
  food('rice', 'White rice, cooked', 'Ryż biały, ugotowany', 130, 2.7, 28.2, 0.3, 0.4, 0.1, 200),
  food('pasta', 'Wholewheat pasta, cooked', 'Makaron pełnoziarnisty, ugotowany', 149, 5.8, 30, 1.7, 3.9, 0.8, 180),
  food('potatoes', 'Potatoes, boiled', 'Ziemniaki gotowane', 87, 1.9, 20.1, 0.1, 1.8, 0.9, 250),
  food('sweet-potato', 'Sweet potato, baked', 'Batat pieczony', 90, 2, 20.7, 0.2, 3.3, 6.5, 200),
  food('broccoli', 'Broccoli', 'Brokuł', 34, 2.8, 6.6, 0.4, 2.6, 1.7, 150),
  food('mixed-salad', 'Mixed salad', 'Mieszanka sałat', 17, 1.3, 3.3, 0.2, 2, 1.2, 100),
  food('tomato', 'Tomato', 'Pomidor', 18, 0.9, 3.9, 0.2, 1.2, 2.6, 120),
  food('avocado', 'Avocado', 'Awokado', 160, 2, 8.5, 14.7, 6.7, 0.7, 70),
  food('olive-oil', 'Olive oil', 'Oliwa z oliwek', 884, 0, 0, 100, 0, 0, 10),
  food('almonds', 'Almonds', 'Migdały', 579, 21.2, 21.6, 49.9, 12.5, 4.4, 30),
  food('dark-chocolate', 'Dark chocolate 70%', 'Gorzka czekolada 70%', 598, 7.8, 45.9, 42.6, 10.9, 24, 20),
  food('protein-bar', 'Protein bar', 'Baton proteinowy', 360, 33, 35, 12, 6, 4, 60),
  food('hummus', 'Hummus', 'Hummus', 166, 7.9, 14.3, 9.6, 6, 0.3, 60),
  food('mozzarella', 'Mozzarella, light', 'Mozzarella light', 165, 19, 2, 9, 0, 1, 60),
  food('lentil-soup', 'Lentil soup', 'Zupa z soczewicy', 72, 4.5, 11, 1, 3.5, 1.5, 350),
  food('milk', 'Milk 2%', 'Mleko 2%', 50, 3.4, 4.8, 2, 0, 5, 250),
];

export const FOOD_BY_ID: Record<string, Food> = Object.fromEntries(FOODS.map((f) => [f.id, f]));
