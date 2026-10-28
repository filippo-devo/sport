import { Tabs } from 'expo-router';

import { TabBar } from '../../components/TabBar';
import { colors } from '../../theme/tokens';

// Today · Train · Progress · Food · Library. Profile opens from the avatar in each header.
export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="train" />
      <Tabs.Screen name="progress" />
      <Tabs.Screen name="food" />
      <Tabs.Screen name="library" />
    </Tabs>
  );
}
