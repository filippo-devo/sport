import { create } from 'zustand';

import type { RoutineItem } from '../data/types';
import { dayKey } from '../lib/date';

// Transient UI state shared between screens (not persisted).
type Ui = {
  foodDate: string;
  setFoodDate: (key: string) => void;
  /** Exercises of the routine being edited; the exercise picker appends to it. */
  routineDraft: RoutineItem[];
  setRoutineDraft: (items: RoutineItem[]) => void;
};

export const useUi = create<Ui>()((set) => ({
  foodDate: dayKey(),
  setFoodDate: (foodDate) => set({ foodDate }),
  routineDraft: [],
  setRoutineDraft: (routineDraft) => set({ routineDraft }),
}));
