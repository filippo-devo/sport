// Deep imports keep the other ~9k Phosphor icons out of the bundle.
import { FireIcon } from 'phosphor-react-native/src/icons/Fire';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { ExerciseRow } from '../components/ExerciseRow';
import { StartWorkoutButton } from '../components/StartWorkoutButton';
import { TabBar } from '../components/TabBar';
import { TargetMuscles } from '../components/TargetMuscles';
import { WeekStrip } from '../components/WeekStrip';
import { WorkoutCard } from '../components/WorkoutCard';
import { todayLabel, totalSets, week } from '../data/training';
import { colors, fonts, layout, radius, space, type } from '../theme/tokens';

export default function TrainingScreen() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [selectedKey, setSelectedKey] = useState(week.find((d) => d.status === 'today')!.key);

  const frameWidth = Math.min(windowWidth, layout.maxContentWidth);
  const gutter = frameWidth < 360 ? 14 : layout.gutter;
  const contentWidth = frameWidth - gutter * 2;
  const tabBarWidth = Math.min(frameWidth - layout.tabBarInset * 2, 420);

  const day = week.find((d) => d.key === selectedKey)!;
  const workout = day.workout;
  const showCta = day.status === 'today';

  const tabBarBottom = Math.max(insets.bottom, 12);
  const ctaBottom = tabBarBottom + layout.tabBarHeight + space.md;
  const bottomChrome = (showCta ? ctaBottom + layout.ctaHeight : tabBarBottom + layout.tabBarHeight) + space.xxl;

  return (
    <View style={styles.screen}>
      <View style={[styles.frame, { width: frameWidth }]}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + space.md,
            paddingBottom: bottomChrome,
            paddingHorizontal: gutter,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>{todayLabel}</Text>
              <Text style={styles.screenTitle} accessibilityRole="header">
                Training
              </Text>
            </View>
            <View style={styles.streak} accessible accessibilityLabel="4 week streak">
              <FireIcon size={18} color={colors.accent} weight="fill" />
              <Text style={styles.streakText}>4 wk</Text>
            </View>
          </View>

          <View style={styles.section}>
            <WeekStrip days={week} selectedKey={selectedKey} onSelect={setSelectedKey} width={contentWidth} />
          </View>

          <View style={styles.section}>
            <WorkoutCard day={day} compact={frameWidth < 375} short={windowHeight < 700} />
          </View>

          {workout && (
            <>
              <View style={styles.section}>
                <TargetMuscles muscles={workout.muscles} />
              </View>

              <View style={[styles.section, styles.listHeader]}>
                <Text style={styles.sectionTitle}>{workout.exercises.length} exercises</Text>
                <Text style={styles.sectionAside}>{totalSets(workout)} sets total</Text>
              </View>
              <View style={styles.list}>
                {workout.exercises.map((e, i) => (
                  <View key={e.id}>
                    {i > 0 && <View style={styles.divider} />}
                    <ExerciseRow exercise={e} index={i} />
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>

        {/* Fade content out beneath the floating CTA and tab bar. */}
        <View pointerEvents="none" style={[styles.fade, { height: bottomChrome + 24 }]}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.bg} stopOpacity={0} />
                <Stop offset="0.45" stopColor={colors.bg} stopOpacity={0.85} />
                <Stop offset="1" stopColor={colors.bg} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#fade)" />
          </Svg>
        </View>

        {showCta && <StartWorkoutButton bottom={ctaBottom} />}
        <TabBar active="train" bottomInset={insets.bottom} width={tabBarWidth} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  frame: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  eyebrow: { ...type.body, color: colors.textSecondary },
  screenTitle: { ...type.display, color: colors.textPrimary, marginTop: 2 },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    height: layout.control,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  streakText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textPrimary },
  section: { marginTop: space.xxl + space.xxs },
  sectionTitle: { ...type.sectionTitle, color: colors.textPrimary },
  sectionAside: { ...type.body, color: colors.textSecondary },
  listHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  list: { marginTop: space.xs },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline, marginLeft: 64 + space.lg },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
