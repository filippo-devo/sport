import { router } from 'expo-router';

import { ExerciseBrowser } from '../components/ExerciseBrowser';
import { NavBar } from '../components/ui/headers';
import { Gap, Screen } from '../components/ui/layout';
import { useT } from '../i18n';

// Exercise library, opened from the books icon in the Train header.
export default function LibraryScreen() {
  const { t } = useT();
  return (
    <Screen top={<NavBar title={t('library.title')} />}>
      <Gap size={8} />
      <ExerciseBrowser mode="browse" onSelect={(e) => router.push(`/exercise/${e.id}`)} />
    </Screen>
  );
}
