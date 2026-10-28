import { router, useLocalSearchParams } from 'expo-router';

import { ExerciseBrowser } from '../components/ExerciseBrowser';
import { XIcon } from '../components/icons';
import { IconButton } from '../components/ui/controls';
import { NavBar } from '../components/ui/headers';
import { Screen } from '../components/ui/layout';
import { useT } from '../i18n';
import { useStore } from '../store';

/** Modal picker that adds an exercise to the running workout. */
export default function ExercisePicker() {
  const { t } = useT();
  const { start } = useLocalSearchParams<{ start?: string }>();
  const addExercise = useStore((s) => s.addExercise);
  const close = () => (start ? router.replace('/workout') : router.back());
  return (
    <Screen top={<NavBar title={t('library.pickTitle')} left={<IconButton icon={XIcon} label={t('common.close')} onPress={close} />} />}>
      <ExerciseBrowser
        mode="pick"
        onSelect={(e) => {
          addExercise(e.id);
          close();
        }}
      />
    </Screen>
  );
}
