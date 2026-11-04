import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ClockCounterClockwiseIcon } from '../../components/icons';
import { LogWeightSheet } from '../../components/LogWeightSheet';
import { AchievementsSection } from '../../components/progress/Achievements';
import { ActivityCalendar, ActivitySection, StreakAndMonth } from '../../components/progress/Activity';
import { BodySection } from '../../components/progress/Body';
import { StrengthScore } from '../../components/progress/Strength';
import { IconButton } from '../../components/ui/controls';
import { TabHeader } from '../../components/ui/headers';
import { Screen, useLayout } from '../../components/ui/layout';
import { useT } from '../../i18n';

// Order (Filip, 2026-11-04): strength score, activity, streak + monthly report,
// activity calendar, body (weight, measurements, photos), achievements.
export default function ProgressScreen() {
  const { t } = useT();
  const { gutter } = useLayout();
  const [weightOpen, setWeightOpen] = useState(false);
  const logWeight = () => setWeightOpen(true);

  return (
    <Screen tabBar>
      <TabHeader
        title={t('progress.title')}
        right={<IconButton icon={ClockCounterClockwiseIcon} label={t('progress.history')} onPress={() => router.push('/history')} />}
      />
      <StrengthScore onLogWeight={logWeight} />
      <ActivitySection />
      <StreakAndMonth />
      <ActivityCalendar />
      <BodySection onLogWeight={logWeight} />
      <AchievementsSection />
      <View style={{ height: gutter }} />

      <LogWeightSheet visible={weightOpen} onClose={() => setWeightOpen(false)} />
    </Screen>
  );
}
