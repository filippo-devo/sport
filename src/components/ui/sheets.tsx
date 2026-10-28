import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '../../i18n';
import { formatNumber } from '../../lib/units';
import { colors, fonts, layout, radius, space, type } from '../../theme/tokens';
import { MinusIcon, PlusIcon } from '../icons';
import { Button, IconButton } from './controls';

/** Bottom sheet on a dimmed scrim. Tapping the scrim closes it. */
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.lg) + space.sm }]}>
          <View style={styles.grabber} />
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type ConfirmProps = {
  visible: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

/** In-app confirmation (Alert.alert is a no-op on web, so this is used everywhere). */
export function ConfirmSheet({ visible, title, body, confirmLabel, onConfirm, onCancel, destructive, secondaryLabel, onSecondary }: ConfirmProps) {
  const t = useT();
  return (
    <Sheet visible={visible} onClose={onCancel} title={title}>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      <View style={styles.actions}>
        <Button label={confirmLabel} variant={destructive ? 'danger' : 'primary'} onPress={onConfirm} />
        {secondaryLabel && onSecondary ? <Button label={secondaryLabel} variant="secondary" onPress={onSecondary} /> : null}
        <Button label={t.t('common.cancel')} variant="ghost" onPress={onCancel} />
      </View>
    </Sheet>
  );
}

type NumberProps = {
  visible: boolean;
  title: string;
  value: number;
  unit?: string;
  step?: number;
  decimals?: number;
  min?: number;
  max?: number;
  onSave: (v: number) => void;
  onClose: () => void;
};

/** Numeric editor with ± steppers and a free-entry field. */
export function NumberSheet(props: NumberProps) {
  return (
    <Sheet visible={props.visible} onClose={props.onClose} title={props.title}>
      {/* Remount on open so the field starts from the current value. */}
      {props.visible && <NumberEditor {...props} />}
    </Sheet>
  );
}

function NumberEditor({ title, value, unit, step = 1, decimals = 0, min = 0, max = 100000, onSave, onClose }: NumberProps) {
  const t = useT();
  const [text, setText] = useState(formatNumber(value, decimals));
  const parsed = parseFloat(text.replace(',', '.'));
  const valid = Number.isFinite(parsed) && parsed >= min && parsed <= max;
  const bump = (d: number) => {
    const base = Number.isFinite(parsed) ? parsed : value;
    setText(formatNumber(Math.min(max, Math.max(min, base + d)), decimals));
  };
  return (
    <>
      <View style={styles.stepper}>
        <IconButton icon={MinusIcon} label="−" onPress={() => bump(-step)} size={52} />
        <View style={styles.inputWrap}>
          <TextInput
            value={text}
            onChangeText={setText}
            keyboardType="decimal-pad"
            selectTextOnFocus
            style={styles.input}
            accessibilityLabel={title}
            maxLength={8}
          />
          {unit ? <Text style={styles.unit}>{unit}</Text> : null}
        </View>
        <IconButton icon={PlusIcon} label="+" onPress={() => bump(step)} size={52} />
      </View>
      <Button
        label={t.t('common.save')}
        disabled={!valid}
        onPress={() => {
          onSave(Math.round(parsed * 10 ** decimals) / 10 ** decimals);
          onClose();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim },
  sheet: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: layout.maxContentWidth,
    backgroundColor: colors.surfaceAccent,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardStroke,
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    gap: space.lg,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.track, marginBottom: space.xs },
  title: { ...type.sectionTitle, color: colors.textPrimary },
  body: { ...type.body, color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  actions: { gap: space.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  inputWrap: {
    flex: 1,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardStroke,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  input: { fontFamily: fonts.bold, fontSize: 30, color: colors.textPrimary, textAlign: 'center', minWidth: 60, padding: 0 },
  unit: { fontFamily: fonts.medium, fontSize: 17, color: colors.textSecondary },
});
