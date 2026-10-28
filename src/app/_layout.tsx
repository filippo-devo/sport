import { useFonts } from '@expo-google-fonts/barlow';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { barlowFonts } from '../theme/fonts';
import { colors } from '../theme/tokens';

// Only the Training screen exists for now. Progress, Food, Library and
// Profile are shown in the tab bar as disabled items and have no routes.
export default function RootLayout() {
  const [loaded] = useFonts(barlowFonts);
  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </SafeAreaProvider>
  );
}
