import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ScrollViewInstance } from 'react-native';

import { applyPlan } from '../../ai/apply';
import { askTrainer, type ChatError } from '../../ai/remote';
import type { CoachMessage } from '../../ai/types';
import { useSession } from '../../backend/auth';
import { backendConfigured } from '../../backend/supabase';
import { PlanCard } from '../../components/coach/PlanCard';
import { PaperPlaneRightIcon, RobotIcon, TrashIcon } from '../../components/icons';
import { Button, Chip, IconButton, Notice } from '../../components/ui/controls';
import { NavBar } from '../../components/ui/headers';
import { useLayout } from '../../components/ui/layout';
import { ConfirmSheet } from '../../components/ui/sheets';
import { useT, type TKey } from '../../i18n';
import { uid, useStore } from '../../store';
import { colors, fonts, radius, space, type } from '../../theme/tokens';

const ERRORS: Record<ChatError, TKey> = {
  not_configured: 'coach.errNotConfigured',
  sign_in_required: 'coach.errSignIn',
  daily_limit: 'coach.errLimit',
  busy: 'coach.errBusy',
  network: 'coach.errNetwork',
  server: 'coach.errServer',
  refused: 'coach.errRefused',
};

/** Built outside the component so the timestamp isn't read during render. */
const message = (role: CoachMessage['role'], text: string, extra: Partial<CoachMessage> = {}): CoachMessage => ({ id: uid(), role, text, at: Date.now(), ...extra });

const SUGGESTIONS: TKey[] = ['coach.suggest1', 'coach.suggest2', 'coach.suggest3'];

/** Chat with the AI trainer (Claude through the Supabase Edge Function). */
export default function CoachChatScreen() {
  const { t } = useT();
  const { insets, frameWidth, gutter } = useLayout();
  const chat = useStore((s) => s.coachChat);
  const { session, ready } = useSession();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);

  useEffect(() => {
    const id = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(id);
  }, [chat.length, sending]);

  const send = async (raw: string) => {
    const content = raw.trim();
    if (!content || sending) return;
    const s = useStore.getState();
    const mine = message('user', content);
    s.addCoachMessage(mine);
    setText('');
    setSending(true);
    const res = await askTrainer(useStore.getState(), useStore.getState().coachChat);
    setSending(false);
    if ('error' in res) {
      // The failed question stays so it can be resent; the error bubble is not sent to the trainer.
      s.addCoachMessage(message('assistant', t(ERRORS[res.error]), { error: true }));
      return;
    }
    s.addCoachMessage(message('assistant', res.text, res.plan ? { plan: res.plan } : {}));
  };

  const canChat = backendConfigured && !!session;

  return (
    <View style={styles.root}>
      <View style={[styles.frame, { width: frameWidth }]}>
        <NavBar
          title={t('coach.chat')}
          right={chat.length > 0 ? <IconButton icon={TrashIcon} label={t('coach.clear')} onPress={() => setConfirmClear(true)} /> : undefined}
        />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView ref={scroll} contentContainerStyle={{ padding: gutter, gap: space.md }} keyboardShouldPersistTaps="handled">
            {!backendConfigured ? (
              <Notice icon={RobotIcon} text={t('coach.serverMissing')} />
            ) : ready && !session ? (
              <View style={{ gap: space.md }}>
                <Notice icon={RobotIcon} text={t('coach.signInNeeded')} />
                <Button label={t('account.signIn')} onPress={() => router.push('/account')} />
              </View>
            ) : null}

            {chat.length === 0 && canChat && (
              <View style={styles.empty}>
                <RobotIcon size={40} color={colors.accent} weight="fill" />
                <Text style={styles.emptyTitle}>{t('coach.emptyTitle')}</Text>
                <Text style={styles.meta}>{t('coach.emptyBody')}</Text>
              </View>
            )}

            {chat.map((m) => (
              <View key={m.id} style={{ gap: space.sm, alignItems: m.role === 'user' ? 'flex-end' : 'stretch' }}>
                {m.text ? (
                  <View style={[styles.bubble, m.role === 'user' ? styles.mine : styles.theirs, m.error && styles.errorBubble]}>
                    <Text style={[styles.bubbleText, m.role === 'user' && { color: colors.textOnAccent }]} selectable>
                      {m.text}
                    </Text>
                  </View>
                ) : null}
                {m.plan && (
                  <PlanCard
                    plan={m.plan}
                    savedId={m.savedPlanId}
                    onSave={(activate) => {
                      const id = applyPlan(m.plan!, { source: 'ai', activate });
                      useStore.getState().updateCoachMessage(m.id, { savedPlanId: id });
                    }}
                  />
                )}
              </View>
            ))}
            {sending && (
              <View style={[styles.bubble, styles.theirs, { flexDirection: 'row', gap: space.sm, alignItems: 'center' }]}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={styles.meta}>{t('coach.thinking')}</Text>
              </View>
            )}
          </ScrollView>

          {canChat && (
            <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, space.md), paddingHorizontal: gutter }]}>
              {chat.length === 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingBottom: space.sm }}>
                  {SUGGESTIONS.map((k) => (
                    <Chip key={k} label={t(k)} onPress={() => send(t(k))} />
                  ))}
                </ScrollView>
              )}
              <View style={styles.inputRow}>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder={t('coach.placeholder')}
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                  multiline
                  maxLength={2000}
                  accessibilityLabel={t('coach.placeholder')}
                />
                <Pressable
                  style={[styles.send, (!text.trim() || sending) && { opacity: 0.4 }]}
                  disabled={!text.trim() || sending}
                  onPress={() => send(text)}
                  accessibilityRole="button"
                  accessibilityLabel={t('coach.send')}
                >
                  <PaperPlaneRightIcon size={20} color={colors.textOnAccent} weight="fill" />
                </Pressable>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </View>

      <ConfirmSheet
        visible={confirmClear}
        title={t('coach.clear')}
        body={t('coach.clearBody')}
        confirmLabel={t('common.delete')}
        destructive
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          useStore.getState().clearCoachChat();
          setConfirmClear(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  frame: { flex: 1 },
  meta: { ...type.caption, color: colors.textSecondary, textAlign: 'center' },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.textPrimary },
  bubble: { maxWidth: '86%', borderRadius: radius.lg, paddingHorizontal: space.md, paddingVertical: space.sm + 2 },
  mine: { backgroundColor: colors.accent, borderBottomRightRadius: 6 },
  theirs: { backgroundColor: colors.surface, borderBottomLeftRadius: 6, alignSelf: 'flex-start' },
  errorBubble: { borderWidth: 1, borderColor: colors.danger },
  bubbleText: { ...type.body, color: colors.textPrimary },
  inputBar: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline, paddingTop: space.sm, backgroundColor: colors.bg },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    backgroundColor: colors.surface,
    paddingHorizontal: space.lg,
    paddingTop: 12,
    paddingBottom: 12,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
    fontSize: 16,
  },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
});
