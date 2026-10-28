# Training app — screen 1: Training

Expo (SDK 58) + Expo Router + TypeScript. UI only, no backend; demo data lives in `src/data/training.ts`.

Only the **Train** tab exists. Progress, Food, Library and Profile are drawn in the
tab bar but are not pressable and have no routes. `Start workout` gives press
feedback only.

## Run

```bash
npm install
npx expo start        # scan the QR code with Expo Go, or press w for the web preview
```

Web build: `npx expo export --platform web` → `dist/`.

Single-file preview (JS and fonts inlined, opens without a server):
`npm run preview:build` → `design/preview/training.html`. It is built from
`preview/entry.tsx`, which renders the same Training screen without the router.

## Structure

- `src/theme/tokens.ts` — shared design tokens (colors, type, spacing, radii, layout)
- `src/app/index.tsx` — Training screen
- `src/components/` — WeekStrip, WorkoutCard, TargetMuscles, ExerciseRow, StartWorkoutButton, TabBar
- `design/reference/` — Gravl screenshots the tokens were sampled from

## References

- **Gravl** (user-supplied screenshots in `design/reference/`): every color was
  pixel-sampled from them, and the typeface is Barlow. The layout follows them
  too: floating glass tab bar with a dark active capsule, volt CTA pill, featured
  workout card with a volt badge and a "Recovered" ring pill, "Target muscles" row,
  and the exercise rows ("III 3 sets · 10–8 reps · 12 kg").
- Mobbin (Gravl is not on Mobbin, so these were used for individual elements):
  - Day selector: [Apple Fitness – plan week](https://mobbin.com/screens/eac5518f-afb2-4ddc-9fdf-9680fb1bc1d4), [Runna – today](https://mobbin.com/screens/20751c4f-c638-4561-8220-00beafe536e7)
  - Floating tab bar: [Apple Fitness+](https://mobbin.com/screens/eaea5c61-75fc-43ea-9fce-d39536d9f91e), [The Outsiders](https://mobbin.com/screens/e0516904-d4b6-45a0-bd41-c9affcc7d3a1)
  - Hero card + CTA: [Ladder](https://mobbin.com/screens/4f68e1bb-7f3a-4452-bcb2-e1d70c4dcc42), [pliability](https://mobbin.com/screens/57c88c75-a186-415a-a792-d02ee6325880)
  - Exercise list: [Peloton Strength+](https://mobbin.com/screens/a736b4f4-3800-4fbb-8110-4956c2ffb4d9), [Peloton Strength+ generator](https://mobbin.com/screens/e6d580a0-9844-40fc-89c0-d7026da92cf9)
