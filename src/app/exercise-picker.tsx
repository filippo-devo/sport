import { router, useLocalSearchParams } from 'expo-router';

import { ExerciseBrowser } from '../components/ExerciseBrowser';
import { XIcon } from '../components/icons';
import { IconButton } from '../components/ui/controls';
import { NavBar } from '../components/ui/headers';
import { Screen } from '../components/ui/layout';
import { useT } from '../i18n';
import { useStore } from '../store';
import { useUi } from '../store/ui';

/** Modal picker that adds an exercise to the running workout, or to the routine being edited (`for=routine`). */
export default function ExercisePicker() {
  const { t } = useT();
  const { start, for: target } = useLocalSearchParams<{ start?: string; for?: string }>();
  const addExercise = useStore((s) => s.addExercise);
  const restSec = useStore((s) => s.settings.restSec);
  const close = () => (start ? router.replace('/workout') : router.back());
  return (
    <Screen top={<NavBar title={t('library.pickTitle')} left={<IconButton icon={XIcon} label={t('common.close')} onPress={close} />} />}>
      <ExerciseBrowser
        mode="pick"
        onSelect={(e) => {
          if (target === 'routine') {
            const ui = useUi.getState();
            ui.setRoutineDraft([...ui.routineDraft, { exerciseId: e.id, sets: 3, target: e.tracking === 'time' ? '45' : '10', restSec }]);
          } else addExercise(e.id);
          close();
        }}
      />
    </Screen>
  );
}
