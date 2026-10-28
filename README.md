# GameChanger

Training, nutrition and progress tracker. Expo SDK 58, Expo Router, TypeScript.
All data is stored on the device (AsyncStorage via zustand `persist`); there is no backend.
UI in English and Polish (Profile → Language).

## Run

```bash
npm install
npx expo start        # scan the QR code with Expo Go, or press w for the web preview
```

- `npm run typecheck` / `npx expo lint`
- `npm run preview:build` → `design/preview/training.html`, a single self-contained HTML file of the whole app (no server needed)
- Every push to `main` publishes an EAS Update (`.github/workflows/eas-update.yml`, needs the `EXPO_TOKEN` secret)

## Screens

Tabs: **Today · Train · Progress · Food · Library**. Profile opens from the avatar in each header.

| Route | Screen |
| --- | --- |
| `/` | Today: calorie / training / steps rings, today's workout, macros, streak, body weight, quick actions |
| `/train` | Week strip, workout of the selected day, target-muscle recovery, exercise list, plan, empty workout |
| `/plans`, `/plans/[id]` | Training plans, weekly schedule, choose the active plan |
| `/routine/[id]` | Workout preview and start |
| `/workout` | Live logger: sets × weight × reps (or seconds), previous values, rest timer (−15/+15/skip), add/remove sets and exercises, finish/discard |
| `/session/[id]` | Post-workout summary (PRs, volume, sets) and history detail |
| `/progress` | Strength (est. 1RM), weekly volume, body weight vs goal, calories vs goal, personal records, history, physique photos |
| `/history` | All workouts by month |
| `/photo/[id]` | Physique photo viewer |
| `/food` | Day navigation, calorie + P/C/F rings, meals by Breakfast / Lunch / Dinner / Snacks |
| `/meal/[id]` | Diary entry detail (energy, macro split, fibre, sugar, per 100 g) |
| `/add-meal` | Add meal (UI only for now: search, barcode, quick add, photo; logging comes next) |
| `/food-history` | Daily history (kcal vs goal, macros) |
| `/library`, `/exercise/[id]` | 64 exercises with search, muscle and equipment filters; detail with steps, muscles, 1RM chart, set records, history |
| `/exercise-picker` | Add an exercise to the running workout |
| `/profile` | Name, goals (kcal, macros, target weight, workouts/week, steps), language, units (kg/lb), default rest, haptics, data reset |

## Structure

- `src/app/` — routes (Expo Router)
- `src/components/` — shared UI (`ui/` primitives, `workout/` logger parts, Gravl-style cards and rows)
- `src/data/` — types and seed data: exercises (EN/PL), foods, plans, generated sample history
- `src/store/` — persisted store (`index.ts`), derived calculations (`derived.ts`), transient UI state (`ui.ts`)
- `src/i18n/` — `en.ts` / `pl.ts` dictionaries with plural forms
- `src/theme/tokens.ts` — design tokens (colours sampled from the Gravl reference screenshots in `design/reference/`)

On first launch the app is seeded with eight weeks of sample workouts, weigh-ins and two weeks of meals so the
charts have data. Profile → "Clear sample data" removes them; your own entries stay.

## References

Gravl (colours, type, cards, tab bar) plus Mobbin patterns from Hevy (live logger, rest timer, set records),
Fitbod (library filters), Cal AI and MacroFactor (calorie and macro rings, day strip), MyFitnessPal (meal groups)
and WHOOP (three daily rings).
