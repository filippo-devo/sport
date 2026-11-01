import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { applyPlan } from '../../ai/apply';
import { generatePlan, insights, type Goal, type Setup } from '../../ai/local';
import type { Insight, PlanProposal } from '../../ai/types';
import { backendConfigured } from '../../backend/supabase';
import { PlanCard } from '../../components/coach/PlanCard';
import { CaretRightIcon, ChatCircleDotsIcon, CheckCircleIcon, LightbulbIcon, WarningIcon } from '../../components/icons';
import { Button, Card, SectionTitle, Segmented } from '../../components/ui/controls';
import { NavBar } from '../../components/ui/headers';
import { Screen } from '../../components/ui/layout';
import { useT } from '../../i18n';
import { useStore } from '../../store';
import { colors, fonts, radius, space, type } from '../../theme/tokens';

/** AI trainer hub: recommendations from the logs, the offline plan generator and the chat entry. */
export default function CoachScreen() {
  const { t } = useT();
  const state = useStore();
  const list = useMemo(() => insights(state), [state]);
  const [goal, setGoal] = useState<Goal>('muscle');
  const [days, setDays] = useState('3');
  const [setup, setSetup] = useState<Setup>('gym');
  const [draft, setDraft] = useState<PlanProposal | null>(null);
  const [savedId, setSavedId] = useState<string>();

  return (
    <Screen top={<NavBar title={t('coach.title')} />}>
      <Card style={styles.chatCard} onPress={() => router.push('/coach/chat')} accessibilityLabel={t('coach.chat')}>
        <View style={styles.chatIcon}>
          <ChatCircleDotsIcon size={24} color={colors.textOnAccent} weight="fill" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{t('coach.chat')}</Text>
          <Text style={styles.meta}>{backendConfigured ? t('coach.chatBody') : t('coach.chatNeedsServer')}</Text>
        </View>
        <CaretRightIcon size={16} color={colors.textSecondary} weight="bold" />
      </Card>

      <SectionTitle style={styles.section} title={t('coach.insights')} />
      <Text style={[styles.meta, { marginTop: space.xs }]}>{t('coach.insightsNote')}</Text>
      <View style={{ gap: space.sm, marginTop: space.md }}>
        {list.map((i) => (
          <InsightRow key={i.id} insight={i} />
        ))}
        {list.length === 0 && <Text style={styles.meta}>{t('coach.noInsights')}</Text>}
      </View>

      <SectionTitle style={styles.section} title={t('coach.generator')} />
      <Card style={styles.gen}>
        <Text style={styles.label}>{t('coach.goal')}</Text>
        <Segmented
          value={goal}
          onChange={setGoal}
          options={(['strength', 'muscle', 'general'] as Goal[]).map((g) => ({ value: g, label: t(`aiPlan.goal.${g}`) }))}
        />
        <Text style={styles.label}>{t('coach.daysPerWeek')}</Text>
        <Segmented value={days} onChange={setDays} options={['2', '3', '4', '5', '6'].map((d) => ({ value: d, label: d }))} />
        <Text style={styles.label}>{t('coach.equipment')}</Text>
        <Segmented
          value={setup}
          onChange={setSetup}
          options={(['gym', 'dumbbells', 'bodyweight'] as Setup[]).map((s) => ({ value: s, label: t(`aiPlan.setup.${s}`) }))}
        />
        <Button
          label={draft ? t('coach.regenerate') : t('coach.generate')}
          onPress={() => {
            setDraft(generatePlan({ goal, days: Number(days), setup }, state.sessions, state.settings.lang));
            setSavedId(undefined);
          }}
          style={{ marginTop: space.sm }}
        />
      </Card>
      {draft && (
        <View style={{ marginTop: space.md }}>
          <PlanCard plan={draft} savedId={savedId} onSave={(activate) => setSavedId(applyPlan(draft, { source: 'ai', activate }))} />
        </View>
      )}
    </Screen>
  );
}

function InsightRow({ insight }: { insight: Insight }) {
  const Icon = insight.tone === 'good' ? CheckCircleIcon : insight.tone === 'warn' ? WarningIcon : LightbulbIcon;
  const color = insight.tone === 'good' ? colors.success : insight.tone === 'warn' ? colors.warning : colors.accent;
  return (
    <Pressable
      style={styles.insight}
      disabled={!insight.action}
      onPress={() => insight.action && router.push(insight.action.href as never)}
      accessibilityRole={insight.action ? 'button' : undefined}
    >
      <Icon size={22} color={color} weight="fill" />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.cardTitle}>{insight.title}</Text>
        <Text style={styles.meta}>{insight.body}</Text>
        {insight.action && <Text style={styles.action}>{insight.action.label}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xxl },
  chatCard: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  chatIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { ...type.itemTitle, fontFamily: fonts.semibold, color: colors.textPrimary },
  meta: { ...type.caption, color: colors.textSecondary },
  insight: { flexDirection: 'row', gap: space.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
  action: { ...type.caption, color: colors.accent, fontFamily: fonts.semibold, marginTop: 4 },
  gen: { marginTop: space.md, gap: space.sm },
  label: { ...type.caption, color: colors.textSecondary, marginTop: space.xs },
});
