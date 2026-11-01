import { FOOD_BY_ID } from '../data/foods';
import type { Localized, MealEntry } from '../data/types';

/** Display name of a diary entry: the food's name or the name typed in for a manual entry. */
export const entryName = (e: MealEntry, L: (x: Localized) => string) => e.manual?.name ?? (FOOD_BY_ID[e.foodId] ? L(FOOD_BY_ID[e.foodId].name) : '—');
