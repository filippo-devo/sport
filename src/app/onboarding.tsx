import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import {
  BarbellIcon,
  BellIcon,
  BrainIcon,
  CaretLeftIcon,
  ChartLineUpIcon,
  CheckIcon,
  DropIcon,
  FireIcon,
  FlagIcon,
  ForkKnifeIcon,
  HeartbeatIcon,
  HouseIcon,
  LightningIcon,
  LockSimpleIcon,
  PersonSimpleIcon,
  PersonSimpleRunIcon,
  PersonSimpleWalkIcon,
  SparkleIcon,
  TargetIcon,
  TrophyIcon,
  type Icon,
} from '../components/icons';
import { Button, Segmented } from '../components/ui/controls';
import { useLayout } from '../components/ui/layout';
import { Ring } from '../components/ui/Ring';
import { TimeSheet } from '../components/ui/TimeSheet';
import type { Lang, Units } from '../data/types';
import { requestPermission } from '../lib/reminders';
import { formatNumber } from '../lib/units';
import { BigStepper, OptionCard, Options, Pill, ProgressLine, StepTitle, TileRow } from '../onboarding/components';
import {
  bmi,
  buildProgram,
  DEFAULT_ANSWERS,
  ONBOARDING_PREVIEW,
  profileFrom,
  remindersFrom,
  suggestNutrition,
  suggestSteps,
  suggestWater,
  type Activity,
  type Experience,
  type Focus,
  type MainGoal,
  type OnboardingAnswers,
  type Place,
  type Pushups,
  type Sex,
} from '../onboarding/model';
import { useOT, type OKey } from '../onboarding/strings';
import { useStore } from '../store';
import { colors, fonts, layout, radius, space, type } from '../theme/tokens';

/**
 * Long onboarding (Mobbin refs: Centr, Tonal, Equinox+, Apple Fitness, Lifesum plan test).
 * One question per screen, progress line on top, CTA pinned to the bottom. On finish it
 * writes real settings: name, units, goals, a plan on the chosen days, reminders, first weigh-in.
 */
const STEPS = [
  'welcome',
  'intro',
  'name',
  'goal',
  'focus',
  'fact',
  'sex',
  'age',
  'height',
  'weight',
  'target',
  'experience',
  'pushups',
  'place',
  'days',
  'length',
  'activity',
  'nutrition',
  'water',
  'steps',
  'reminders',
  'build',
  'done',
] as const;
type StepId = (typeof STEPS)[number];

// Steps counted in "Step n of N" (everything between the welcome and the build screens).
const COUNTED = STEPS.slice(1, STEPS.indexOf('build'));

const GOAL_ICONS: Record<MainGoal, Icon> = { muscle: BarbellIcon, fat: FireIcon, strength: TrophyIcon, fit: HeartbeatIcon, endurance: PersonSimpleRunIcon };
const FOCUS: Focus[] = ['mobility', 'consistency', 'energy', 'posture', 'stress', 'core'];
const ACTIVITY_ICONS: Record<Activity, Icon> = {
  sedentary: PersonSimpleIcon,
  light: PersonSimpleWalkIcon,
  active: PersonSimpleRunIcon,
  very: LightningIcon,
};
const LB = 2.20462;

export default function OnboardingScreen() {
  const { ot, weekdays, daysCount } = useOT();
  const { insets, frameWidth, gutter } = useLayout();
  const store = useStore();
  const [a, setA] = useState<OnboardingAnswers>(() => ({
    ...DEFAULT_ANSWERS,
    name: store.settings.name,
    units: store.settings.units,
  }));
  const [index, setIndex] = useState(0);
  const [touched, setTouched] = useState({ nutrition: false, water: false, steps: false, target: false });
  const [timeOpen, setTimeOpen] = useState(false);
  const step: StepId = STEPS[index];
  const set = (patch: Partial<OnboardingAnswers>) => setA((prev) => ({ ...prev, ...patch }));

  // Slide + fade each new step in.
  const [enter] = useState(() => new Animated.Value(1));
  const [dir, setDir] = useState(1);
  useEffect(() => {
    enter.setValue(0);
    Animated.timing(enter, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [enter, index]);

  const go = (to: number) => {
    setDir(to > index ? 1 : -1);
    setIndex(Math.max(0, Math.min(STEPS.length - 1, to)));
  };

  const next = () => {
    // Fill suggested values from earlier answers until the user edits them.
    if (step === 'weight' && !touched.target) {
      const t = a.goal === 'fat' ? a.weightKg * 0.92 : a.goal === 'muscle' ? a.weightKg + 3 : a.weightKg;
      set({ targetKg: Math.round(t * 2) / 2 });
    }
    if (step === 'activity') {
      if (!touched.nutrition) set(suggestNutrition(a));
      if (!touched.water) set({ waterMl: suggestWater(a.weightKg, a.days.length) });
      if (!touched.steps) set({ steps: suggestSteps(a.activity) });
    }
    go(index + 1);
  };

  const finish = () => {
    if (ONBOARDING_PREVIEW) {
      router.replace('/');
      return;
    }
    const s = useStore.getState();
    s.setSettings({ name: a.name.trim(), units: a.units, onboarded: true, profile: profileFrom(a) });
    s.setGoals({
      kcal: a.kcal,
      protein: a.protein,
      carbs: a.carbs,
      fat: a.fat,
      targetWeight: a.targetKg,
      workoutsPerWeek: a.days.length,
      workoutsPerMonth: a.days.length * 4,
      steps: a.steps,
      waterMl: a.waterMl,
    });
    s.setActiveProgram(s.saveProgram(buildProgram(a)));
    s.setReminders(remindersFrom(a, s.reminders));
    s.logWeight(a.weightKg);
    router.replace('/');
  };

  const skipAll = () => {
    if (!ONBOARDING_PREVIEW) useStore.getState().setSettings({ onboarded: true });
    router.replace('/');
  };

  const canContinue =
    (step !== 'name' || a.name.trim().length > 0) && (step !== 'days' || a.days.length > 0);

  // ---------- weight helpers (stored in kg, shown in the chosen unit) ----------
  const toShown = (kg: number) => (a.units === 'lb' ? Math.round(kg * LB) : Math.round(kg * 2) / 2);
  const fromShown = (v: number) => (a.units === 'lb' ? v / LB : v);
  const weightProps = a.units === 'lb' ? { min: 66, max: 550, step: 1 } : { min: 30, max: 250, step: 0.5 };
  const fmtW = (v: number) => formatNumber(v, a.units === 'lb' ? 0 : 1);
  const fmtHeight = (cm: number) => {
    if (a.units !== 'lb') return String(cm);
    const inches = Math.round(cm / 2.54);
    return `${Math.floor(inches / 12)}′${inches % 12}″`;
  };

  // ---------- step bodies ----------
  const body = () => {
    switch (step) {
      case 'intro':
        return (
          <>
            <StepTitle title={ot('introTitle')} />
            <View style={{ gap: space.xxl }}>
              <Feature icon={BarbellIcon} title={ot('introTrainTitle')} body={ot('introTrainBody')} />
              <Feature icon={ForkKnifeIcon} title={ot('introFoodTitle')} body={ot('introFoodBody')} />
              <Feature icon={ChartLineUpIcon} title={ot('introProgressTitle')} body={ot('introProgressBody')} />
            </View>
            <View style={styles.privacy}>
              <LockSimpleIcon size={16} color={colors.textSecondary} weight="bold" />
              <Text style={styles.privacyText}>{ot('introPrivacy')}</Text>
            </View>
          </>
        );
      case 'name':
        return (
          <>
            <StepTitle title={ot('nameTitle')} body={ot('nameBody')} />
            <TextInput
              value={a.name}
              onChangeText={(name) => set({ name })}
              placeholder={ot('namePlaceholder')}
              placeholderTextColor={colors.track}
              autoFocus
              autoCapitalize="words"
              autoComplete="given-name"
              returnKeyType="next"
              onSubmitEditing={() => canContinue && next()}
              style={styles.input}
              maxLength={30}
            />
          </>
        );
      case 'goal': {
        const first = a.name.trim().split(/\s+/)[0];
        const goals: MainGoal[] = ['muscle', 'fat', 'strength', 'fit', 'endurance'];
        return (
          <>
            <StepTitle title={ot('goalTitle', { name: first ? `, ${first}` : '' })} body={ot('goalBody')} />
            <Options>
              {goals.map((g) => (
                <OptionCard
                  key={g}
                  icon={GOAL_ICONS[g]}
                  title={ot(`goal_${g}` as OKey)}
                  description={ot(`goal_${g}_d` as OKey)}
                  selected={a.goal === g}
                  onPress={() => set({ goal: g })}
                />
              ))}
            </Options>
          </>
        );
      }
      case 'focus':
        return (
          <>
            <StepTitle title={ot('focusTitle')} body={ot('focusBody')} />
            <View style={{ marginBottom: space.lg }}>
              <Pill>{ot('pickUpTo', { n: 2 })}</Pill>
            </View>
            <Options>
              {FOCUS.map((f) => {
                const on = a.focus.includes(f);
                return (
                  <OptionCard
                    key={f}
                    multi
                    title={ot(`focus_${f}` as OKey)}
                    selected={on}
                    disabled={!on && a.focus.length >= 2}
                    onPress={() => set({ focus: on ? a.focus.filter((x) => x !== f) : [...a.focus, f] })}
                  />
                );
              })}
            </Options>
          </>
        );
      case 'fact': {
        const Glyph = GOAL_ICONS[a.goal];
        return (
          <View style={styles.fact}>
            <View style={styles.factHalo}>
              <View style={styles.factIcon}>
                <Glyph size={44} color={colors.textOnAccent} weight="bold" />
              </View>
            </View>
            <Text style={styles.factEyebrow}>{ot('factEyebrow').toUpperCase()}</Text>
            <Text style={styles.factTitle}>{ot(`factTitle_${a.goal}` as OKey)}</Text>
            <Text style={styles.factBody}>{ot('factBody')}</Text>
          </View>
        );
      }
      case 'sex': {
        const opts: Sex[] = ['male', 'female', 'other'];
        return (
          <>
            <StepTitle title={ot('sexTitle')} body={ot('sexBody')} />
            <Options>
              {opts.map((x) => (
                <OptionCard key={x} title={ot(`sex_${x}` as OKey)} selected={a.sex === x} onPress={() => set({ sex: x })} />
              ))}
            </Options>
          </>
        );
      }
      case 'age':
        return (
          <>
            <StepTitle title={ot('ageTitle')} body={ot('ageBody')} />
            <BigStepper value={a.age} onChange={(age) => set({ age })} min={13} max={90} step={1} unit={ot('years')} />
          </>
        );
      case 'height':
        return (
          <>
            <StepTitle title={ot('heightTitle')} body={ot('heightBody')} />
            <UnitSwitch value={a.units} onChange={(units) => set({ units })} />
            <BigStepper
              value={a.heightCm}
              onChange={(heightCm) => set({ heightCm })}
              min={120}
              max={230}
              step={1}
              unit={a.units === 'lb' ? 'ft / in' : 'cm'}
              format={fmtHeight}
            />
          </>
        );
      case 'weight':
        return (
          <>
            <StepTitle title={ot('weightTitle')} body={ot('weightBody')} />
            <UnitSwitch value={a.units} onChange={(units) => set({ units })} />
            <BigStepper
              value={toShown(a.weightKg)}
              onChange={(v) => set({ weightKg: fromShown(v) })}
              {...weightProps}
              unit={a.units}
              format={fmtW}
            />
            <Pill>{ot('bmi', { v: formatNumber(bmi(a.weightKg, a.heightCm), 1) })}</Pill>
          </>
        );
      case 'target': {
        const diff = a.targetKg - a.weightKg;
        const diffShown = fmtW(Math.abs(toShown(a.targetKg) - toShown(a.weightKg)));
        const label =
          Math.abs(diff) < 0.25
            ? ot('targetKeep')
            : diff < 0
              ? ot('targetLose', { v: `${diffShown} ${a.units}` })
              : ot('targetGain', { v: `${diffShown} ${a.units}` });
        return (
          <>
            <StepTitle title={ot('targetTitle')} body={ot('targetBody')} />
            <BigStepper
              value={toShown(a.targetKg)}
              onChange={(v) => {
                setTouched((x) => ({ ...x, target: true }));
                set({ targetKg: fromShown(v) });
              }}
              {...weightProps}
              unit={a.units}
              format={fmtW}
            />
            <Pill tone="accent">{label}</Pill>
          </>
        );
      }
      case 'experience': {
        const opts: Experience[] = ['beginner', 'intermediate', 'advanced'];
        return (
          <>
            <StepTitle title={ot('expTitle')} body={ot('expBody')} />
            <Options>
              {opts.map((x, i) => (
                <OptionCard
                  key={x}
                  leading={<Bars level={i + 1} on={a.experience === x} />}
                  title={ot(`exp_${x}` as OKey)}
                  description={ot(`exp_${x}_d` as OKey)}
                  selected={a.experience === x}
                  onPress={() => set({ experience: x })}
                />
              ))}
            </Options>
          </>
        );
      }
      case 'pushups': {
        const opts: Pushups[] = ['0-5', '6-15', '16-30', '30+'];
        return (
          <>
            <StepTitle title={ot('pushTitle')} body={ot('pushBody')} />
            <View style={styles.grid}>
              {opts.map((x) => {
                const on = a.pushups === x;
                return (
                  <Pressable
                    key={x}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    onPress={() => set({ pushups: x })}
                    style={({ pressed }) => [styles.gridCell, on && styles.gridCellOn, pressed && { opacity: 0.85 }]}
                  >
                    <Text style={[styles.gridValue, on && { color: colors.textOnAccent }]}>{x.replace('-', '–')}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        );
      }
      case 'place': {
        const opts: { v: Place; icon: Icon }[] = [
          { v: 'gym', icon: BarbellIcon },
          { v: 'home', icon: HouseIcon },
          { v: 'both', icon: SparkleIcon },
        ];
        return (
          <>
            <StepTitle title={ot('placeTitle')} body={ot('placeBody')} />
            <Options>
              {opts.map(({ v, icon }) => (
                <OptionCard
                  key={v}
                  icon={icon}
                  title={ot(`place_${v}` as OKey)}
                  description={ot(`place_${v}_d` as OKey)}
                  selected={a.place === v}
                  onPress={() => set({ place: v })}
                />
              ))}
            </Options>
          </>
        );
      }
      case 'days':
        return (
          <>
            <StepTitle title={ot('daysTitle')} body={ot('daysBody')} />
            <TileRow
              items={weekdays.map((label, value) => ({ value, label }))}
              isOn={(d) => a.days.includes(d)}
              onPress={(d) => set({ days: a.days.includes(d) ? a.days.filter((x) => x !== d) : [...a.days, d].sort() })}
            />
            <View style={styles.daysInfo}>
              <Text style={styles.daysCount}>{daysCount(a.days.length)}</Text>
              {a.days.length > 0 && <Text style={styles.daysHint}>{ot(a.days.length <= 3 ? 'daysHint_low' : 'daysHint_high')}</Text>}
            </View>
          </>
        );
      case 'length':
        return (
          <>
            <StepTitle title={ot('lengthTitle')} body={ot('lengthBody')} />
            <Options>
              {[30, 45, 60, 75, 90].map((m) => (
                <OptionCard key={m} title={`${m} ${ot('min')}`} selected={a.sessionMin === m} onPress={() => set({ sessionMin: m })} />
              ))}
            </Options>
          </>
        );
      case 'activity': {
        const opts: Activity[] = ['sedentary', 'light', 'active', 'very'];
        return (
          <>
            <StepTitle title={ot('activityTitle')} body={ot('activityBody')} />
            <Options>
              {opts.map((x) => (
                <OptionCard
                  key={x}
                  icon={ACTIVITY_ICONS[x]}
                  title={ot(`activity_${x}` as OKey)}
                  description={ot(`activity_${x}_d` as OKey)}
                  selected={a.activity === x}
                  onPress={() => set({ activity: x })}
                />
              ))}
            </Options>
          </>
        );
      }
      case 'nutrition': {
        const edit = (patch: Partial<OnboardingAnswers>) => {
          setTouched((x) => ({ ...x, nutrition: true }));
          set(patch);
        };
        return (
          <>
            <StepTitle title={ot('nutritionTitle')} body={ot('nutritionBody')} />
            <BigStepper value={a.kcal} onChange={(kcal) => edit({ kcal })} min={1200} max={5000} step={50} unit={ot('kcalDay')} />
            <View style={styles.macros}>
              <MacroRow label={ot('protein')} color={colors.protein} value={a.protein} onChange={(protein) => edit({ protein })} />
              <MacroRow label={ot('carbs')} color={colors.carbs} value={a.carbs} onChange={(carbs) => edit({ carbs })} />
              <MacroRow label={ot('fat')} color={colors.fat} value={a.fat} onChange={(fat) => edit({ fat })} />
            </View>
            {touched.nutrition && (
              <Button
                variant="ghost"
                size="sm"
                label={ot('recalc')}
                onPress={() => {
                  setTouched((x) => ({ ...x, nutrition: false }));
                  set(suggestNutrition(a));
                }}
                style={{ alignSelf: 'center', marginTop: space.md }}
              />
            )}
          </>
        );
      }
      case 'water':
        return (
          <>
            <StepTitle title={ot('waterTitle')} body={ot('waterBody')} />
            <View style={styles.bigIcon}>
              <DropIcon size={40} color={colors.fat} weight="fill" />
            </View>
            <BigStepper
              value={a.waterMl}
              onChange={(waterMl) => {
                setTouched((x) => ({ ...x, water: true }));
                set({ waterMl });
              }}
              min={1000}
              max={5000}
              step={250}
              format={(v) => formatNumber(v / 1000, 2)}
              unit="l"
            />
          </>
        );
      case 'steps':
        return (
          <>
            <StepTitle title={ot('stepsTitle')} body={ot('stepsBody')} />
            <View style={styles.bigIcon}>
              <PersonSimpleWalkIcon size={40} color={colors.success} weight="bold" />
            </View>
            <BigStepper
              value={a.steps}
              onChange={(steps) => {
                setTouched((x) => ({ ...x, steps: true }));
                set({ steps });
              }}
              min={2000}
              max={30000}
              step={500}
              format={(v) => v.toLocaleString('pl-PL').replace(/ /g, ' ')}
              unit={ot('steps')}
            />
          </>
        );
      case 'reminders': {
        const toggle = async (patch: Partial<OnboardingAnswers>) => {
          set(patch);
          if (Object.values(patch).some(Boolean)) await requestPermission();
        };
        return (
          <>
            <StepTitle title={ot('remTitle')} body={ot('remBody')} />
            <View style={styles.remCard}>
              <View style={styles.remRow}>
                <View style={styles.remIcon}>
                  <BellIcon size={20} color={colors.accent} weight="bold" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.remTitle}>{ot('remWorkout')}</Text>
                  <Pressable onPress={() => setTimeOpen(true)} hitSlop={6} accessibilityRole="button">
                    <Text style={styles.remDesc}>
                      {ot('remWorkoutD')} <Text style={styles.remTime}>{a.workoutTime}</Text>
                    </Text>
                  </Pressable>
                </View>
                <Switch
                  value={a.workoutReminder}
                  onValueChange={(v) => toggle({ workoutReminder: v })}
                  trackColor={{ true: colors.accent, false: colors.track }}
                  thumbColor={colors.textPrimary}
                />
              </View>
              <View style={styles.remDivider} />
              <View style={styles.remRow}>
                <View style={styles.remIcon}>
                  <DropIcon size={20} color={colors.fat} weight="bold" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.remTitle}>{ot('remWater')}</Text>
                  <Text style={styles.remDesc}>{ot('remWaterD')}</Text>
                </View>
                <Switch
                  value={a.waterReminder}
                  onValueChange={(v) => toggle({ waterReminder: v })}
                  trackColor={{ true: colors.accent, false: colors.track }}
                  thumbColor={colors.textPrimary}
                />
              </View>
            </View>
            <Text style={styles.note}>{ot('remNote')}</Text>
            <TimeSheet visible={timeOpen} title={ot('remTime')} value={a.workoutTime} onSave={(workoutTime) => set({ workoutTime })} onClose={() => setTimeOpen(false)} />
          </>
        );
      }
      case 'build':
        return <Building onDone={() => go(index + 1)} />;
      case 'done': {
        const first = a.name.trim().split(/\s+/)[0];
        const program = buildProgram(a);
        const lang = store.settings.lang;
        return (
          <>
            <StepTitle
              eyebrow={ot('doneEyebrow')}
              title={first ? ot('doneTitle', { name: first }) : ot('doneTitleNoName')}
              body={ot('doneBody')}
            />
            <View style={styles.summary}>
              <SummaryRow label={ot('sumGoal')} value={ot(`goal_${a.goal}` as OKey)} icon={TargetIcon} />
              <SummaryRow label={ot('sumPlan')} value={program.name[lang]} icon={BarbellIcon} />
              <SummaryRow label={ot('sumDays')} value={[...a.days].sort().map((d) => weekdays[d]).join(' · ')} icon={FlagIcon} />
              <SummaryRow
                label={ot('sumNutrition')}
                value={`${a.kcal} kcal · ${a.protein} / ${a.carbs} / ${a.fat} g`}
                icon={ForkKnifeIcon}
              />
              <SummaryRow label={ot('sumWeight')} value={`${fmtW(toShown(a.weightKg))} → ${fmtW(toShown(a.targetKg))} ${a.units}`} icon={ChartLineUpIcon} />
              <SummaryRow label={ot('sumWater')} value={`${formatNumber(a.waterMl / 1000, 2)} l · ${a.steps.toLocaleString('pl-PL').replace(/ /g, ' ')} ${ot('steps')}`} icon={DropIcon} last />
            </View>
            {ONBOARDING_PREVIEW && <Text style={styles.note}>{ot('previewNote')}</Text>}
            {a.focus.length > 0 && (
              <View style={styles.focusRow}>
                <BrainIcon size={16} color={colors.textSecondary} weight="bold" />
                <Text style={styles.privacyText}>{a.focus.map((f) => ot(`focus_${f}` as OKey)).join(', ')}</Text>
              </View>
            )}
          </>
        );
      }
      default:
        return null;
    }
  };

  // ---------- welcome: full-bleed photo, no top bar ----------
  if (step === 'welcome') {
    return (
      <View style={styles.screen}>
        <Image source={require('../../assets/workouts/upper-push.jpg')} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <LinearGradient id="welcomeFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.bg} stopOpacity={0.15} />
              <Stop offset="0.45" stopColor={colors.bg} stopOpacity={0.35} />
              <Stop offset="0.75" stopColor={colors.bg} stopOpacity={0.95} />
              <Stop offset="1" stopColor={colors.bg} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#welcomeFade)" />
        </Svg>
        <View style={[styles.frame, { width: frameWidth, paddingHorizontal: gutter, paddingTop: insets.top + space.md }]}>
          <View style={styles.welcomeTop}>
            <View style={styles.brand}>
              <LightningIcon size={18} color={colors.textOnAccent} weight="fill" />
            </View>
            <View style={{ width: 150 }}>
              <Segmented<Lang>
                value={store.settings.lang}
                onChange={(lang) => store.setSettings({ lang })}
                options={[
                  { value: 'pl', label: 'PL' },
                  { value: 'en', label: 'EN' },
                ]}
              />
            </View>
          </View>
          <View style={{ flex: 1 }} />
          <Text style={styles.welcomeEyebrow}>{ot('welcomeEyebrow').toUpperCase()}</Text>
          <Text style={styles.welcomeTitle}>{ot('welcomeTitle')}</Text>
          <Text style={styles.welcomeBody}>{ot('welcomeBody')}</Text>
          <View style={{ paddingBottom: Math.max(insets.bottom, space.lg) + space.sm, gap: space.md, marginTop: space.xxl }}>
            <Button label={ot('welcomeCta')} onPress={next} style={{ height: 56 }} />
            <Text style={styles.welcomeTime}>{ot('welcomeTime')}</Text>
          </View>
        </View>
      </View>
    );
  }

  const counted = COUNTED.indexOf(step as (typeof COUNTED)[number]);
  const showChrome = step !== 'build';
  const translateX = enter.interpolate({ inputRange: [0, 1], outputRange: [24 * dir, 0] });

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.frame, { width: frameWidth }]}>
        {showChrome && (
          <View style={[styles.topBar, { paddingTop: insets.top + space.xs, paddingHorizontal: gutter }]}>
            <View style={styles.topRow}>
              <Pressable accessibilityRole="button" accessibilityLabel={ot('back')} onPress={() => go(step === 'done' ? index - 2 : index - 1)} hitSlop={10} style={styles.back}>
                <CaretLeftIcon size={20} color={colors.textPrimary} weight="bold" />
              </Pressable>
              <Text style={styles.stepLabel}>{counted >= 0 ? ot('step', { n: counted + 1, total: COUNTED.length }) : ''}</Text>
              {step !== 'done' ? (
                <Pressable accessibilityRole="button" onPress={skipAll} hitSlop={10} style={styles.skip}>
                  <Text style={styles.skipText}>{ot('skip')}</Text>
                </Pressable>
              ) : (
                <View style={styles.skip} />
              )}
            </View>
            <ProgressLine value={counted >= 0 ? (counted + 1) / COUNTED.length : 1} />
          </View>
        )}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            { paddingHorizontal: gutter, paddingTop: showChrome ? space.xxl : insets.top + space.xxl, paddingBottom: space.xxl },
            (step === 'fact' || step === 'build') && { flexGrow: 1, justifyContent: 'center' },
          ]}
        >
          <Animated.View key={step} style={{ opacity: enter, transform: [{ translateX }] }}>
            {body()}
          </Animated.View>
        </ScrollView>
        {step !== 'build' && (
          <View style={[styles.footer, { paddingHorizontal: gutter, paddingBottom: Math.max(insets.bottom, space.lg) + space.xs }]}>
            <Button
              label={step === 'done' ? ot('doneCta') : ot('next')}
              onPress={step === 'done' ? finish : next}
              disabled={!canContinue}
              style={{ height: 56 }}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

function UnitSwitch({ value, onChange }: { value: Units; onChange: (u: Units) => void }) {
  return (
    <View style={{ alignSelf: 'center', width: 180 }}>
      <Segmented<Units>
        value={value}
        onChange={onChange}
        options={[
          { value: 'kg', label: 'kg / cm' },
          { value: 'lb', label: 'lb / ft' },
        ]}
      />
    </View>
  );
}

function Feature({ icon: Glyph, title, body }: { icon: Icon; title: string; body: string }) {
  return (
    <View style={styles.feature}>
      <View style={styles.featureIcon}>
        <Glyph size={24} color={colors.accent} weight="bold" />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureBody}>{body}</Text>
      </View>
    </View>
  );
}

/** Signal-strength bars for experience level. */
function Bars({ level, on }: { level: number; on: boolean }) {
  return (
    <View style={styles.bars}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            styles.bar,
            { height: 6 + i * 5, backgroundColor: i <= level ? (on ? colors.textOnAccent : colors.accent) : on ? 'rgba(9,16,23,0.25)' : colors.track },
          ]}
        />
      ))}
    </View>
  );
}

function MacroRow({ label, color, value, onChange }: { label: string; color: string; value: number; onChange: (v: number) => void }) {
  const btn = (d: number, text: string) => (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} ${text}`} onPress={() => onChange(Math.max(0, value + d))} hitSlop={6} style={styles.macroBtn}>
      <Text style={styles.macroBtnText}>{text}</Text>
    </Pressable>
  );
  return (
    <View style={styles.macroRow}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <Text style={styles.macroLabel}>{label}</Text>
      {btn(-5, '−')}
      <Text style={styles.macroValue}>{value} g</Text>
      {btn(5, '+')}
    </View>
  );
}

function SummaryRow({ label, value, icon: Glyph, last }: { label: string; value: string; icon: Icon; last?: boolean }) {
  return (
    <View style={[styles.sumRow, !last && styles.sumDivider]}>
      <Glyph size={20} color={colors.accent} weight="bold" />
      <View style={{ flex: 1 }}>
        <Text style={styles.sumLabel}>{label.toUpperCase()}</Text>
        <Text style={styles.sumValue}>{value}</Text>
      </View>
      <CheckIcon size={18} color={colors.success} weight="bold" />
    </View>
  );
}

/** "Building your plan" interstitial: ring fills while four lines tick off, then moves on. */
function Building({ onDone }: { onDone: () => void }) {
  const { ot } = useOT();
  const [done, setDone] = useState(0);
  const [progress] = useState(() => new Animated.Value(0));
  const lines: OKey[] = ['build1', 'build2', 'build3', 'build4'];
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.quad), useNativeDriver: false }).start();
    const timers = [700, 1400, 2100, 2800].map((ms, i) => setTimeout(() => setDone(i + 1), ms));
    timers.push(setTimeout(() => doneRef.current(), 3700));
    return () => timers.forEach(clearTimeout);
  }, [progress]);

  const [pct, setPct] = useState(0);
  useEffect(() => {
    const id = progress.addListener(({ value }) => setPct(Math.round(value * 100)));
    return () => progress.removeListener(id);
  }, [progress]);

  return (
    <View style={{ alignItems: 'center', gap: space.xxxl }}>
      <Ring value={pct / 100} size={156} stroke={10} color={colors.accent}>
        <Text style={styles.buildPct}>{pct}%</Text>
      </Ring>
      <Text style={[styles.factTitle, { fontSize: 26, lineHeight: 30 }]}>{ot('buildTitle')}</Text>
      <View style={{ alignSelf: 'stretch', gap: space.lg }}>
        {lines.map((k, i) => (
          <View key={k} style={[styles.buildLine, i >= done && { opacity: 0.35 }]}>
            <View style={[styles.buildCheck, i < done && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
              {i < done && <CheckIcon size={13} color={colors.textOnAccent} weight="bold" />}
            </View>
            <Text style={styles.buildText}>{ot(k)}</Text>
          </View>
        ))}
      </View>
      <View style={{ alignSelf: 'stretch' }}>
        <ProgressLine value={pct / 100} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  frame: { flex: 1 },

  welcomeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  welcomeEyebrow: { ...type.badge, color: colors.accent, marginBottom: space.sm },
  welcomeTitle: { fontFamily: fonts.bold, fontSize: 40, lineHeight: 44, letterSpacing: -0.5, color: colors.textPrimary },
  welcomeBody: { ...type.meta, fontSize: 17, lineHeight: 23, color: colors.textSecondary, marginTop: space.md },
  welcomeTime: { ...type.caption, fontSize: 13, color: colors.textSecondary, textAlign: 'center' },

  topBar: { gap: space.md, paddingBottom: space.xs },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: layout.control },
  back: { width: layout.control, height: layout.control, borderRadius: layout.control / 2, backgroundColor: colors.control, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { ...type.caption, fontSize: 13, color: colors.textSecondary },
  skip: { minWidth: layout.control, alignItems: 'flex-end' },
  skipText: { ...type.body, color: colors.textSecondary },

  footer: { paddingTop: space.md },

  feature: { flexDirection: 'row', gap: space.lg, alignItems: 'flex-start' },
  featureIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.surfaceAccent, borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { ...type.itemTitle, fontFamily: fonts.semibold, color: colors.textPrimary },
  featureBody: { ...type.meta, color: colors.textSecondary },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xxxl, alignSelf: 'center' },
  privacyText: { ...type.caption, fontSize: 13, color: colors.textSecondary },

  input: {
    fontFamily: fonts.semibold,
    fontSize: 30,
    color: colors.textPrimary,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    paddingVertical: space.md,
  },

  fact: { alignItems: 'center', gap: space.lg, paddingHorizontal: space.sm },
  factHalo: { width: 168, height: 168, borderRadius: 84, backgroundColor: 'rgba(210,254,8,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  factIcon: { width: 104, height: 104, borderRadius: 52, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  factEyebrow: { ...type.badge, color: colors.accent },
  factTitle: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 33, color: colors.textPrimary, textAlign: 'center' },
  factBody: { ...type.meta, color: colors.textSecondary, textAlign: 'center' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  gridCell: {
    width: '47%',
    flexGrow: 1,
    height: 110,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCellOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  gridValue: { fontFamily: fonts.bold, fontSize: 34, color: colors.textPrimary },

  daysInfo: { marginTop: space.xxl, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, gap: space.xxs },
  daysCount: { ...type.sectionTitle, color: colors.textPrimary },
  daysHint: { ...type.meta, color: colors.textSecondary },

  macros: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: space.lg, paddingVertical: space.xs },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  macroDot: { width: 10, height: 10, borderRadius: 5 },
  macroLabel: { ...type.body, color: colors.textPrimary, flex: 1 },
  macroBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.control, alignItems: 'center', justifyContent: 'center' },
  macroBtnText: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 20, color: colors.textPrimary },
  macroValue: { ...type.body, fontFamily: fonts.semibold, color: colors.textPrimary, width: 64, textAlign: 'center', fontVariant: ['tabular-nums'] },

  bigIcon: { alignSelf: 'center', width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },

  remCard: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: space.lg },
  remRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.lg },
  remIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.control, alignItems: 'center', justifyContent: 'center' },
  remTitle: { ...type.itemTitle, fontFamily: fonts.semibold, color: colors.textPrimary },
  remDesc: { ...type.meta, fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  remTime: { fontFamily: fonts.semibold, color: colors.accent, textDecorationLine: 'underline' },
  remDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.cardStroke },
  note: { ...type.caption, fontSize: 13, color: colors.textSecondary, marginTop: space.lg, textAlign: 'center' },

  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 22 },
  bar: { width: 5, borderRadius: 2 },

  summary: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: space.lg, borderWidth: 1, borderColor: colors.hairline },
  sumRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md + 2 },
  sumDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardStroke },
  sumLabel: { ...type.badge, fontSize: 11, color: colors.textSecondary },
  sumValue: { ...type.itemTitle, fontFamily: fonts.semibold, color: colors.textPrimary, marginTop: 2 },
  focusRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.lg, alignSelf: 'center' },

  buildPct: { fontFamily: fonts.bold, fontSize: 40, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  buildLine: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  buildCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.track, alignItems: 'center', justifyContent: 'center' },
  buildText: { ...type.body, color: colors.textPrimary },
});
