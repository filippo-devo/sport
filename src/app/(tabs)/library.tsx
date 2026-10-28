import { router } from 'expo-router';

import { ExerciseBrowser } from '../../components/ExerciseBrowser';
import { TabHeader } from '../../components/ui/headers';
import { Gap, Screen } from '../../components/ui/layout';
import { useT } from '../../i18n';

export default function LibraryScreen() {
  const { t } = useT();
  return (
    <Screen tabBar>
      <TabHeader title={t('library.title')} />
      <Gap size={20} />
      <ExerciseBrowser mode="browse" onSelect={(e) => router.push(`/exercise/${e.id}`)} />
    </Screen>
  );
}
