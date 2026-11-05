import { useFonts } from '@expo-google-fonts/barlow';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" />
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
