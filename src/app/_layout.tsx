import { useFonts } from '@expo-google-fonts/barlow';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useCoachSync } from '../backend/sync';
import { useReminderSync } from '../lib/reminders';
import { setDecimalSeparator } from '../lib/units';
import { useHydrated, useStore } from '../store';
import { barlowFonts } from '../theme/fonts';
import { colors } from '../theme/tokens';

export default function RootLayout() {
  const [fontsLoaded] = useFonts(barlowFonts);
  const hydrated = useHydrated();
  setDecimalSeparator(useStore((s) => s.settings.lang) === 'pl' ? ',' : '.');
  if (!fontsLoaded || !hydrated) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return <App />;
}

function App() {
  useReminderSync();
  useCoachSync();
  useOnboardingGate();

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="workout/index" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="exercise-picker" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-meal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="routine-edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="plan-edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="gym/scan" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="share/[id]" options={{ presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}

/**
 * First launch: open onboarding. Only for a fresh install (no name, no workouts), so people
 * who already use the app are not sent through it after this ships.
 */
function useOnboardingGate() {
  const needs = useStore((s) => !s.settings.onboarded && !s.settings.name && s.sessions.length === 0);
  useEffect(() => {
    if (needs) router.replace('/onboarding');
    // Only on launch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
