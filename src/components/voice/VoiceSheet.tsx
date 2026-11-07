import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useT } from '../../i18n';
import { useVoiceCapture } from '../../lib/dictation';
import { colors, fonts, radius, space, type } from '../../theme/tokens';
import { ArrowUUpLeftIcon, CheckIcon, MicrophoneIcon } from '../icons';
import { Button } from '../ui/controls';
import { Sheet } from '../ui/sheets';

export type VoiceOutcome = {
  ok: boolean;
  title: string;
  lines: string[];
  /** Reverts what was saved. */
  undo?: () => void;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Example sentences shown while listening. */
  examples: string[];
  /** Parses and saves the sentence right away, then says what was saved. */
  onSpoken: (text: string) => VoiceOutcome;
};

/**
 * "Tap and say it": opens listening, and as soon as the speaker stops, saves what was said
 * and shows it with an Undo. In Expo Go (no speech module) the field takes the keyboard's dictation.
 */
export function VoiceSheet({ visible, onClose, title, examples, onSpoken }: Props) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {visible && <VoiceBody onClose={onClose} examples={examples} onSpoken={onSpoken} />}
    </Sheet>
  );
}

function VoiceBody({ onClose, examples, onSpoken }: Omit<Props, 'visible' | 'title'>) {
  const { t, lang } = useT();
  const [outcome, setOutcome] = useState<(VoiceOutcome & { heard: string }) | null>(null);
  const [typed, setTyped] = useState('');
  const submit = (text: string) => {
    const s = text.trim();
    if (s) setOutcome({ ...onSpoken(s), heard: s });
  };
  const voice = useVoiceCapture(lang, submit);
  const typing = !voice.supported || !!voice.error;

  // Start listening as soon as the sheet opens: one tap on the mic is all it takes.
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !voice.supported) return;
    started.current = true;
    voice.start();
  }, [voice]);

  const again = () => {
    setOutcome(null);
    setTyped('');
    if (!typing) voice.start();
  };

  if (outcome) {
    return (
      <View style={styles.body}>
        <Text style={styles.heard}>„{outcome.heard}”</Text>
        <View style={[styles.result, !outcome.ok && styles.resultBad]}>
          <View style={styles.resultHead}>
            {outcome.ok && (
              <View style={styles.check}>
                <CheckIcon size={16} color={colors.textOnAccent} weight="bold" />
              </View>
            )}
            <Text style={styles.resultTitle}>{outcome.title}</Text>
          </View>
          {outcome.lines.map((l, i) => (
            <Text key={i} style={styles.resultLine}>
              {l}
            </Text>
          ))}
        </View>
        <View style={styles.actions}>
          {outcome.ok && outcome.undo && (
            <Button
              label={t('voice.undo')}
              icon={ArrowUUpLeftIcon}
              variant="secondary"
              size="sm"
              onPress={() => {
                outcome.undo?.();
                setOutcome(null);
                onClose();
              }}
            />
          )}
          <Button label={t('voice.again')} icon={MicrophoneIcon} variant="secondary" size="sm" onPress={again} />
          <Button label={t('voice.done')} size="sm" onPress={onClose} />
        </View>
      </View>
    );
  }

  if (typing) {
    return (
      <View style={styles.body}>
        <TextInput
          value={typed}
          onChangeText={setTyped}
          placeholder={examples[0]}
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          autoFocus
          multiline
          blurOnSubmit
          returnKeyType="done"
          onSubmitEditing={() => submit(typed)}
          accessibilityLabel={t('voice.say')}
        />
        <Text style={styles.hint}>{voice.error ? t('voice.micBlocked') : t('voice.keyboardHint')}</Text>
        <Button label={t('voice.save')} icon={CheckIcon} onPress={() => submit(typed)} disabled={!typed.trim()} />
      </View>
    );
  }

  return (
    <View style={styles.body}>
      <Pressable
        onPress={voice.listening ? voice.stop : voice.start}
        accessibilityRole="button"
        accessibilityLabel={voice.listening ? t('voice.stop') : t('voice.say')}
        style={styles.micWrap}
      >
        <Pulse active={voice.listening} />
        <View style={[styles.mic, voice.listening && styles.micOn]}>
          <MicrophoneIcon size={38} color={voice.listening ? colors.textOnAccent : colors.accent} weight="fill" />
        </View>
      </Pressable>
      <Text style={styles.status}>{voice.listening ? t('voice.listening') : t('voice.tapToSpeak')}</Text>
      {voice.transcript ? (
        <Text style={styles.live}>{voice.transcript}</Text>
      ) : (
        <View style={styles.examples}>
          {examples.map((e) => (
            <Text key={e} style={styles.example}>
              „{e}”
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

function Pulse({ active }: { active: boolean }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!active) {
      v.stopAnimation();
      v.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [active, v]);
  if (!active) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pulse,
        { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }] },
      ]}
    />
  );
}

const MIC = 96;

const styles = StyleSheet.create({
  body: { gap: space.md, paddingBottom: space.sm },
  micWrap: { alignSelf: 'center', width: MIC * 1.8, height: MIC * 1.8, alignItems: 'center', justifyContent: 'center', marginTop: space.sm },
  mic: { width: MIC, height: MIC, borderRadius: MIC / 2, backgroundColor: colors.surfaceAccent, alignItems: 'center', justifyContent: 'center' },
  micOn: { backgroundColor: colors.accent },
  pulse: { position: 'absolute', width: MIC, height: MIC, borderRadius: MIC / 2, backgroundColor: colors.accent },
  status: { ...type.button, color: colors.textPrimary, textAlign: 'center' },
  live: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 27, color: colors.textPrimary, textAlign: 'center', minHeight: 54 },
  examples: { gap: space.xxs, alignItems: 'center', minHeight: 54 },
  example: { ...type.meta, color: colors.textSecondary, textAlign: 'center' },
  heard: { ...type.meta, color: colors.textSecondary, fontStyle: 'italic' },
  result: { backgroundColor: colors.surfaceRaised, borderRadius: radius.md, padding: space.md, gap: space.xs, borderWidth: 1, borderColor: colors.accentStroke },
  resultBad: { borderColor: colors.cardStroke },
  resultHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xxs },
  check: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  resultTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 17, color: colors.textPrimary },
  resultLine: { ...type.body, color: colors.textPrimary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'flex-end' },
  input: {
    minHeight: 84,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: space.md,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
    fontSize: 17,
    textAlignVertical: 'top',
  },
  hint: { ...type.caption, fontSize: 13, color: colors.textSecondary },
});
