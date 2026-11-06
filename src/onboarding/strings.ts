import type { Lang } from '../data/types';
import { useStore } from '../store';

// Onboarding has its own EN/PL strings so the flow stays self-contained on its branch.
const en = {
  next: 'Continue',
  back: 'Back',
  step: 'Step {n} of {total}',
  pickUpTo: 'Pick up to {n}',
  edit: 'Edit',

  welcomeEyebrow: 'GameChanger',
  welcomeTitle: 'Your training,\nfood and progress.\nOne app.',
  welcomeBody: 'Answer a few questions and we will set up your plan, goals and reminders.',
  welcomeCta: 'Get started',
  welcomeTime: 'Takes about 2 minutes',

  introTitle: 'What you will get',
  introTrainTitle: 'A plan that fits your week',
  introTrainBody: 'Workouts on the days you choose, with sets, reps and rest timers.',
  introFoodTitle: 'Nutrition targets',
  introFoodBody: 'Calories, macros and water goals based on your body and goal.',
  introProgressTitle: 'Progress you can see',
  introProgressBody: 'Strength, body weight and streaks from your own logs only.',
  introPrivacy: 'Everything stays on your phone.',

  nameTitle: 'What should we call you?',
  nameBody: 'We will use it to greet you on the Today screen.',
  namePlaceholder: 'Your name',

  goalTitle: 'What is your main goal{name}?',
  goalBody: 'We will shape your plan and nutrition around it.',
  goal_muscle: 'Build muscle',
  goal_muscle_d: 'Add size with progressive overload.',
  goal_fat: 'Lose fat',
  goal_fat_d: 'Drop body fat and keep your strength.',
  goal_strength: 'Get stronger',
  goal_strength_d: 'Lift heavier on the big lifts.',
  goal_fit: 'Stay fit and healthy',
  goal_fit_d: 'Feel good and move well every day.',
  goal_endurance: 'Improve endurance',
  goal_endurance_d: 'Last longer in training and sport.',

  focusTitle: 'What else do you want to work on?',
  focusBody: 'Optional. We will keep it in your profile.',
  focus_mobility: 'Mobility',
  focus_consistency: 'Consistency',
  focus_energy: 'More energy',
  focus_posture: 'Posture',
  focus_stress: 'Less stress',
  focus_core: 'Strong core',

  factEyebrow: 'Good choice',
  factTitle_muscle: 'Most muscle is built with 10 to 20 hard sets per muscle a week.',
  factTitle_fat: 'Keeping protein high while eating less protects the muscle you have.',
  factTitle_strength: 'Strength grows fastest when you add a little weight week after week.',
  factTitle_fit: 'Three workouts a week is enough to see real change in a couple of months.',
  factTitle_endurance: 'Regular training plus enough sleep lifts endurance faster than more volume.',
  factBody: 'Your plan tracks every set, so you can see this happen in Progress.',

  sexTitle: 'What is your sex?',
  sexBody: 'Used only to estimate your calorie needs.',
  sex_male: 'Male',
  sex_female: 'Female',
  sex_other: 'Prefer not to say',

  ageTitle: 'How old are you?',
  ageBody: 'Metabolism slows a little with age, so it helps the estimate.',
  years: 'years',

  heightTitle: 'How tall are you?',
  heightBody: 'Used for your calorie estimate and BMI.',

  weightTitle: 'What do you weigh now?',
  weightBody: 'You can log your weight any time in Progress.',
  bmi: 'BMI {v}',

  targetTitle: 'What is your target weight?',
  targetBody: 'Keep it the same if you want to maintain.',
  targetLose: '{v} to lose',
  targetGain: '{v} to gain',
  targetKeep: 'Maintain your weight',

  expTitle: 'How much have you trained before?',
  expBody: 'Be honest, it sets the starting point.',
  exp_beginner: 'Beginner',
  exp_beginner_d: 'New to the gym or back after a long break.',
  exp_intermediate: 'Intermediate',
  exp_intermediate_d: 'Training regularly for 6 months or more.',
  exp_advanced: 'Advanced',
  exp_advanced_d: 'Several years of structured training.',

  pushTitle: 'How many push-ups can you do in a row?',
  pushBody: 'Quick strength check. Good form, chest to the floor.',

  placeTitle: 'Where do you train?',
  placeBody: 'Pick the one you use most.',
  place_gym: 'Gym',
  place_gym_d: 'Barbells, dumbbells and machines.',
  place_home: 'At home',
  place_home_d: 'Bodyweight and a few dumbbells.',
  place_both: 'Both',
  place_both_d: 'Gym most of the time, home when needed.',

  daysTitle: 'Which days can you train?',
  daysBody: 'Your plan will put workouts on these days.',
  daysCount: '{n} workouts a week',
  daysHint_low: 'A great start. Full-body sessions each time.',
  daysHint_high: 'Upper / lower split to recover between sessions.',

  lengthTitle: 'How long is one workout?',
  lengthBody: 'Including warm-up.',
  min: 'min',

  activityTitle: 'How active are you outside the gym?',
  activityBody: 'Think of a normal weekday.',
  activity_sedentary: 'Mostly sitting',
  activity_sedentary_d: 'Desk job, little walking.',
  activity_light: 'Lightly active',
  activity_light_d: 'Some walking during the day.',
  activity_active: 'Active',
  activity_active_d: 'On your feet most of the day.',
  activity_very: 'Very active',
  activity_very_d: 'Physical job or lots of sport.',

  nutritionTitle: 'Your daily nutrition',
  nutritionBody: 'Based on your body, activity and goal. Adjust if you like.',
  kcalDay: 'kcal / day',
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fat',
  recalc: 'Reset to suggested',

  waterTitle: 'Daily water goal',
  waterBody: 'About 33 ml per kg of body weight plus training days.',
  steps: 'steps',
  stepsTitle: 'Daily steps goal',
  stepsBody: 'Shown on the Today screen.',

  remTitle: 'Stay on track',
  remBody: 'Reminders are the easiest way to keep your streak.',
  remWorkout: 'Workout reminder',
  remWorkoutD: 'On your training days at',
  remWater: 'Water reminders',
  remWaterD: 'Every 2 hours from 9:00 to 21:00',
  remNote: 'You can change this later in Profile → Notifications.',
  remTime: 'Reminder time',

  buildTitle: 'Building your plan…',
  build1: 'Calculating your calorie target',
  build2: 'Choosing workouts for your goal',
  build3: 'Placing sessions on your days',
  build4: 'Setting up reminders',
  build5: 'Matching volume to your experience',
  build6: 'Setting water and step goals',
  buildReady: 'Your plan is ready',

  doneEyebrow: 'All set',
  doneTitle: 'Your plan is ready, {name}!',
  doneTitleNoName: 'Your plan is ready!',
  doneBody: 'You can change any of this later in Profile.',
  sumGoal: 'Your goal',
  sumPlan: 'Plan',
  sumDays: 'Training days',
  sumNutrition: 'Nutrition',
  sumWeight: 'Weight',
  sumWater: 'Water',
  doneCta: 'Start training',
  previewNote: 'Preview mode: nothing is saved, your current data stays as it is.',
} as const;

export type OKey = keyof typeof en;

const pl: Record<OKey, string> = {
  next: 'Dalej',
  back: 'Wstecz',
  step: 'Krok {n} z {total}',
  pickUpTo: 'Wybierz do {n}',
  edit: 'Zmień',

  welcomeEyebrow: 'GameChanger',
  welcomeTitle: 'Trening, jedzenie\ni postępy.\nW jednej aplikacji.',
  welcomeBody: 'Odpowiedz na kilka pytań, a ustawimy Twój plan, cele i przypomnienia.',
  welcomeCta: 'Zaczynamy',
  welcomeTime: 'Zajmie około 2 minut',

  introTitle: 'Co dostajesz',
  introTrainTitle: 'Plan dopasowany do tygodnia',
  introTrainBody: 'Treningi w wybrane dni, z seriami, powtórzeniami i timerem przerw.',
  introFoodTitle: 'Cele żywieniowe',
  introFoodBody: 'Kalorie, makro i woda wyliczone z Twojego ciała i celu.',
  introProgressTitle: 'Widoczne postępy',
  introProgressBody: 'Siła, waga i seria dni tylko z Twoich własnych zapisów.',
  introPrivacy: 'Wszystko zostaje na Twoim telefonie.',

  nameTitle: 'Jak masz na imię?',
  nameBody: 'Przywitamy Cię nim na ekranie Dziś.',
  namePlaceholder: 'Twoje imię',

  goalTitle: 'Jaki jest Twój główny cel{name}?',
  goalBody: 'Pod niego ułożymy plan i odżywianie.',
  goal_muscle: 'Budowa mięśni',
  goal_muscle_d: 'Więcej masy dzięki progresji obciążeń.',
  goal_fat: 'Redukcja tkanki tłuszczowej',
  goal_fat_d: 'Mniej tłuszczu przy zachowaniu siły.',
  goal_strength: 'Więcej siły',
  goal_strength_d: 'Większe ciężary w głównych bojach.',
  goal_fit: 'Forma i zdrowie',
  goal_fit_d: 'Dobre samopoczucie i sprawność na co dzień.',
  goal_endurance: 'Lepsza wytrzymałość',
  goal_endurance_d: 'Dłużej na treningu i w sporcie.',

  focusTitle: 'Nad czym jeszcze chcesz popracować?',
  focusBody: 'Opcjonalnie. Zapiszemy to w Twoim profilu.',
  focus_mobility: 'Mobilność',
  focus_consistency: 'Regularność',
  focus_energy: 'Więcej energii',
  focus_posture: 'Postawa',
  focus_stress: 'Mniej stresu',
  focus_core: 'Mocny core',

  factEyebrow: 'Dobry wybór',
  factTitle_muscle: 'Mięśnie najlepiej rosną przy 10–20 ciężkich seriach na partię tygodniowo.',
  factTitle_fat: 'Dużo białka przy mniejszej ilości kalorii chroni mięśnie, które już masz.',
  factTitle_strength: 'Siła rośnie najszybciej, gdy co tydzień dokładasz trochę ciężaru.',
  factTitle_fit: 'Trzy treningi w tygodniu wystarczą, by po kilku miesiącach zobaczyć zmianę.',
  factTitle_endurance: 'Regularny trening i dość snu poprawiają wytrzymałość szybciej niż sama objętość.',
  factBody: 'Plan zapisuje każdą serię, więc zobaczysz to w zakładce Postępy.',

  sexTitle: 'Jaka jest Twoja płeć?',
  sexBody: 'Tylko do oszacowania zapotrzebowania kalorycznego.',
  sex_male: 'Mężczyzna',
  sex_female: 'Kobieta',
  sex_other: 'Wolę nie podawać',

  ageTitle: 'Ile masz lat?',
  ageBody: 'Metabolizm zwalnia z wiekiem, więc to poprawia wyliczenie.',
  years: 'lat',

  heightTitle: 'Ile masz wzrostu?',
  heightBody: 'Do wyliczenia kalorii i BMI.',

  weightTitle: 'Ile teraz ważysz?',
  weightBody: 'Wagę możesz zapisywać w każdej chwili w Postępach.',
  bmi: 'BMI {v}',

  targetTitle: 'Jaka jest Twoja waga docelowa?',
  targetBody: 'Zostaw tę samą, jeśli chcesz utrzymać wagę.',
  targetLose: '{v} do zrzucenia',
  targetGain: '{v} do przybrania',
  targetKeep: 'Utrzymanie wagi',

  expTitle: 'Jakie masz doświadczenie treningowe?',
  expBody: 'Szczerze, to ustala punkt startowy.',
  exp_beginner: 'Początkujący',
  exp_beginner_d: 'Nowy na siłowni albo po długiej przerwie.',
  exp_intermediate: 'Średniozaawansowany',
  exp_intermediate_d: 'Trenujesz regularnie od pół roku lub dłużej.',
  exp_advanced: 'Zaawansowany',
  exp_advanced_d: 'Kilka lat uporządkowanego treningu.',

  pushTitle: 'Ile pompek zrobisz pod rząd?',
  pushBody: 'Szybki test siły. Dobra technika, klatka do podłogi.',

  placeTitle: 'Gdzie trenujesz?',
  placeBody: 'Wybierz miejsce, z którego korzystasz najczęściej.',
  place_gym: 'Siłownia',
  place_gym_d: 'Sztangi, hantle i maszyny.',
  place_home: 'W domu',
  place_home_d: 'Masa ciała i kilka hantli.',
  place_both: 'Tu i tu',
  place_both_d: 'Zwykle siłownia, czasem dom.',

  daysTitle: 'W które dni możesz trenować?',
  daysBody: 'Plan ułoży treningi właśnie na te dni.',
  daysCount: '{n} treningi w tygodniu',
  daysHint_low: 'Świetny start. Za każdym razem całe ciało.',
  daysHint_high: 'Podział góra / dół, żeby odpocząć między treningami.',

  lengthTitle: 'Ile trwa jeden trening?',
  lengthBody: 'Razem z rozgrzewką.',
  min: 'min',

  activityTitle: 'Jak aktywny jesteś poza siłownią?',
  activityBody: 'Pomyśl o zwykłym dniu w tygodniu.',
  activity_sedentary: 'Głównie siedzę',
  activity_sedentary_d: 'Praca przy biurku, mało chodzenia.',
  activity_light: 'Lekko aktywny',
  activity_light_d: 'Trochę chodzenia w ciągu dnia.',
  activity_active: 'Aktywny',
  activity_active_d: 'Większość dnia na nogach.',
  activity_very: 'Bardzo aktywny',
  activity_very_d: 'Praca fizyczna albo dużo sportu.',

  nutritionTitle: 'Twoje dzienne odżywianie',
  nutritionBody: 'Wyliczone z Twojego ciała, aktywności i celu. Możesz dostosować.',
  kcalDay: 'kcal / dzień',
  protein: 'Białko',
  carbs: 'Węglowodany',
  fat: 'Tłuszcze',
  recalc: 'Przywróć sugerowane',

  waterTitle: 'Dzienny cel wody',
  waterBody: 'Około 33 ml na kg masy ciała plus dni treningowe.',
  steps: 'kroków',
  stepsTitle: 'Dzienny cel kroków',
  stepsBody: 'Pokażemy go na ekranie Dziś.',

  remTitle: 'Trzymaj się planu',
  remBody: 'Przypomnienia to najprostszy sposób, żeby nie przerwać serii.',
  remWorkout: 'Przypomnienie o treningu',
  remWorkoutD: 'W dni treningowe o',
  remWater: 'Przypomnienia o wodzie',
  remWaterD: 'Co 2 godziny od 9:00 do 21:00',
  remNote: 'Zmienisz to później w Profil → Powiadomienia.',
  remTime: 'Godzina przypomnienia',

  buildTitle: 'Układamy Twój plan…',
  build1: 'Liczymy Twoje zapotrzebowanie',
  build2: 'Dobieramy treningi do celu',
  build3: 'Rozkładamy treningi na Twoje dni',
  build4: 'Ustawiamy przypomnienia',
  build5: 'Dopasowujemy objętość do doświadczenia',
  build6: 'Ustalamy cele wody i kroków',
  buildReady: 'Plan gotowy',

  doneEyebrow: 'Gotowe',
  doneTitle: 'Twój plan jest gotowy, {name}!',
  doneTitleNoName: 'Twój plan jest gotowy!',
  doneBody: 'Wszystko to zmienisz później w Profilu.',
  sumGoal: 'Twój cel',
  sumPlan: 'Plan',
  sumDays: 'Dni treningowe',
  sumNutrition: 'Odżywianie',
  sumWeight: 'Waga',
  sumWater: 'Woda',
  doneCta: 'Zaczynamy trening',
  previewNote: 'Tryb podglądu: nic nie zostaje zapisane, Twoje obecne dane zostają bez zmian.',
};

const DICTS: Record<Lang, Record<OKey, string>> = { en, pl };

const WEEKDAYS: Record<Lang, string[]> = {
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  pl: ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'],
};

export function useOT() {
  const lang = useStore((s) => s.settings.lang);
  const ot = (key: OKey, params?: Record<string, string | number>) =>
    params ? DICTS[lang][key].replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? '')) : DICTS[lang][key];
  /** "{n} workouts a week" with Polish plural forms (2–4 treningi, 5+ treningów, 1 trening). */
  const daysCount = (n: number) => {
    if (lang === 'en') return n === 1 ? '1 workout a week' : ot('daysCount', { n });
    if (n === 1) return '1 trening w tygodniu';
    return n >= 2 && n <= 4 ? ot('daysCount', { n }) : `${n} treningów w tygodniu`;
  };
  return { ot, lang, weekdays: WEEKDAYS[lang], daysCount };
}
