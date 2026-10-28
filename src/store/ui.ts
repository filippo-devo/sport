import { create } from 'zustand';

import { dayKey } from '../lib/date';

// Transient UI state shared between screens (not persisted).
type Ui = {
  foodDate: string;
  setFoodDate: (key: string) => void;
};

export const useUi = create<Ui>()((set) => ({
  foodDate: dayKey(),
  setFoodDate: (foodDate) => set({ foodDate }),
}));
