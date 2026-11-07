// Checks the spoken meal / set parsers: npx tsx scripts/voice-test.ts
import { parseMealSpeech } from '../src/lib/voiceMeal';
import { parseSetSpeech } from '../src/lib/voiceSets';

const noon = new Date(2026, 10, 7, 13, 0);
const meals = [
  'Na obiad dzisiaj jadłem pierś z kurczaka z ryżem i brokułem',
  'Na śniadanie dwa jajka i kromkę chleba',
  'Wczoraj na kolację 200 g łososia i pół talerza ziemniaków',
  'na obiad schabowy z ziemniakami i surówką',
  'Zjadłem rosół z kurczaka i dwa pierogi',
  'na przekąskę banan i garść migdałów',
  'na kolację dużą pizzę',
  'owsianka z bananem i szklanka mleka',
  'Zjadłem 500 kcal i 30 g białka',
  'drugie śniadanie skyr i borówki',
  'na obiad zupa pomidorowa i trzy pomidory',
  'kurczak 250 gram i ryż 150 gram',
];
for (const m of meals) {
  const r = parseMealSpeech(m, noon);
  console.log(`${m}\n  → ${r.meal}${r.mealSaid ? '' : '(czas)'}${r.daysAgo ? ' -' + r.daysAgo + 'd' : ''}: ${r.foods.map((f) => `${f.food.name.pl} ${f.grams}g`).join(', ')}${r.macros ? ' macros ' + JSON.stringify(r.macros) : ''}`);
}
const sets = [
  'Zrobiłem 10 powtórzeń z 60 kg',
  'zrobiłem dziesięć powtórzeń z sześćdziesięcioma kilogramami',
  'Trzy serie po dwanaście z 20 kilo',
  '8 razy 62 i pół',
  '60 kilo na 8',
  '12 powtórzeń',
  'plank 45 sekund',
  'pół minuty',
  '3x10 z 40 kg',
  'zrobiłem 3 serie po 10 powtórzeń z obciążeniem 50 kg',
  'dwie serie po 15',
  'cześć',
];
for (const s of sets) console.log(`${s}\n  → ${JSON.stringify(parseSetSpeech(s))}`);
