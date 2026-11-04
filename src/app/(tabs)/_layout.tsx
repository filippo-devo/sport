import { Tabs } from 'expo-router';

import { TabBar } from '../../components/TabBar';
import { colors } from '../../theme/tokens';

// Today · Train · Food · Progress · Profile. Library opens from the Train header.
export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="train" />
      <Tabs.Screen name="food" />
      <Tabs.Screen name="progress" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
