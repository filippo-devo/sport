import { GymFinder } from '../../components/GymFinder';
import { NavBar } from '../../components/ui/headers';
import { Screen } from '../../components/ui/layout';
import type { MyGym } from '../../data/types';
import { useT } from '../../i18n';
import { useStore } from '../../store';

const NO_GYMS: MyGym[] = [];

/** Profile > My gyms: the user's gyms and the OpenStreetMap gym search. */
export default function MyGymsScreen() {
  const { t } = useT();
  const myGyms = useStore((s) => s.settings.myGyms ?? NO_GYMS);
  const setSettings = useStore((s) => s.setSettings);
  return (
    <Screen top={<NavBar title={t('myGym.title')} />}>
      <GymFinder gyms={myGyms} onChange={(list) => setSettings({ myGyms: list })} />
    </Screen>
  );
}
