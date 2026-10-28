// Router-less entry used only to build the single-file HTML preview
// (see preview/build.mjs). It renders the same Training screen, so the
// preview works no matter which URL the file is opened from.
import { useFonts } from '@expo-google-fonts/barlow';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import TrainingScreen from '../src/app/index';
import { barlowFonts } from '../src/theme/fonts';

function Preview() {
  const [loaded] = useFonts(barlowFonts);
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <TrainingScreen />
    </SafeAreaProvider>
  );
}

registerRootComponent(Preview);
