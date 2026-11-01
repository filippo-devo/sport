import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { CheckCircleIcon, FlashlightIcon, QrCodeIcon, WarningIcon, XIcon } from '../../components/icons';
import { Button, IconButton } from '../../components/ui/controls';
import { useLayout } from '../../components/ui/layout';
import { Sheet } from '../../components/ui/sheets';
import { useT, type TKey } from '../../i18n';
import { dayKey, hhmm } from '../../lib/date';
import { verifyCheckIn, type CheckInResult } from '../../lib/gyms';
import { currentPosition } from '../../lib/location';
import { uid, useStore } from '../../store';
import { colors, fonts, radius, space, type } from '../../theme/tokens';

type Phase = { kind: 'scanning' } | { kind: 'checking' } | { kind: 'done'; result: CheckInResult; denied: boolean; at: number };

const REASON: Record<Exclude<CheckInResult, { ok: true }>['reason'], TKey> = {
  notGymCode: 'gym.errNotGym',
  unknownGym: 'gym.errUnknown',
  badCode: 'gym.errBadCode',
  needLocation: 'gym.errNeedLocation',
  tooFar: 'gym.errTooFar',
  duplicate: 'gym.errDuplicate',
};

/** Camera QR scanner for partner-gym check-ins (Luma / PayPal scan pattern: full camera, framed target, torch). */
export default function GymScanScreen() {
  const { t } = useT();
  const { insets, gutter } = useLayout();
  const [perm, requestPerm] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: 'scanning' });
  const [manual, setManual] = useState(false);
  const [code, setCode] = useState('');
  const busy = useRef(false);
  const haptics = useStore((s) => s.settings.haptics);

  const handle = async (text: string) => {
    if (busy.current) return;
    busy.current = true;
    setPhase({ kind: 'checking' });
    const { position, denied } = await currentPosition();
    const s = useStore.getState();
    const now = Date.now();
    const result = verifyCheckIn(text, position, s.gymVisits, now);
    if (result.ok) {
      s.addGymVisit({
        id: uid(),
        gymId: result.gym.id,
        gymName: result.gym.name,
        address: [result.gym.address, result.gym.city].filter((x) => x && x !== '—').join(', '),
        at: now,
        date: dayKey(now),
        time: hhmm(now),
        coords: position ?? undefined,
        distanceM: result.distanceM,
        method: result.method,
      });
    }
    if (haptics && Platform.OS !== 'web')
      Haptics.notificationAsync(result.ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
    setPhase({ kind: 'done', result, denied, at: now });
  };

  const onScan = ({ data }: BarcodeScanningResult) => {
    if (phase.kind === 'scanning') handle(data);
  };

  const retry = () => {
    busy.current = false;
    setPhase({ kind: 'scanning' });
  };

  const granted = !!perm?.granted;

  return (
    <View style={styles.root}>
      {granted && phase.kind !== 'done' && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={phase.kind === 'scanning' ? onScan : undefined}
        />
      )}

      <View style={[styles.top, { paddingTop: insets.top + space.xs, paddingHorizontal: gutter }]}>
        <IconButton icon={XIcon} label={t('common.close')} onPress={() => router.back()} />
        <Text style={styles.title}>{t('gym.scanTitle')}</Text>
        {granted && Platform.OS !== 'web' ? (
          <IconButton icon={FlashlightIcon} label={t('gym.torch')} tone={torch ? 'accent' : 'control'} onPress={() => setTorch((x) => !x)} />
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      <View style={styles.center}>
        {!perm ? (
          <ActivityIndicator color={colors.accent} />
        ) : !granted ? (
          <View style={[styles.permBox, { marginHorizontal: gutter }]}>
            <QrCodeIcon size={40} color={colors.accent} weight="bold" />
            <Text style={styles.permTitle}>{t('gym.cameraTitle')}</Text>
            <Text style={styles.hint}>{t('gym.cameraBody')}</Text>
            {perm.canAskAgain ? (
              <Button label={t('gym.allowCamera')} onPress={requestPerm} />
            ) : (
              <Button label={t('notifySettings.openSettings')} variant="secondary" onPress={() => Linking.openSettings()} />
            )}
          </View>
        ) : (
          <>
            <View style={styles.frame}>
              <View style={[styles.corner, styles.tl]} />
              <View style={[styles.corner, styles.tr]} />
              <View style={[styles.corner, styles.bl]} />
              <View style={[styles.corner, styles.br]} />
              {phase.kind === 'checking' && (
                <View style={styles.checking}>
                  <ActivityIndicator color={colors.accent} />
                  <Text style={styles.hintLight}>{t('gym.checking')}</Text>
                </View>
              )}
            </View>
            <Text style={styles.hintLight}>{t('gym.aim')}</Text>
          </>
        )}
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + space.lg, paddingHorizontal: gutter }]}>
        <Button label={t('gym.typeCode')} variant="secondary" onPress={() => setManual(true)} />
      </View>

      <Sheet visible={manual} onClose={() => setManual(false)} title={t('gym.typeCode')}>
        <Text style={styles.hint}>{t('gym.typeCodeBody')}</Text>
        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="gamechanger:gym:…"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          accessibilityLabel={t('gym.typeCode')}
        />
        <Button
          label={t('gym.checkIn')}
          disabled={!code.trim()}
          onPress={() => {
            setManual(false);
            handle(code);
          }}
        />
      </Sheet>

      <Sheet visible={phase.kind === 'done'} onClose={retry}>
        {phase.kind === 'done' && <ResultView phase={phase} onRetry={retry} />}
      </Sheet>
    </View>
  );
}

function ResultView({ phase, onRetry }: { phase: Extract<Phase, { kind: 'done' }>; onRetry: () => void }) {
  const { t, dateLong } = useT();
  const r = phase.result;
  if (r.ok) {
    return (
      <View style={styles.result}>
        <CheckCircleIcon size={56} color={colors.success} weight="fill" />
        <Text style={styles.resultTitle}>{t('gym.okTitle')}</Text>
        <Text style={styles.resultGym}>{r.gym.name}</Text>
        <Text style={styles.hint}>
          {dateLong(new Date(phase.at))} · {hhmm(phase.at)}
        </Text>
        <Text style={styles.hint}>{r.method === 'qr+gps' ? t('gym.okGps', { m: r.distanceM ?? 0 }) : t('gym.okQr')}</Text>
        <Button label={t('common.done')} onPress={() => router.replace('/gym')} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  }
  const body =
    r.reason === 'tooFar'
      ? t('gym.errTooFar', { m: r.distanceM ?? 0 })
      : r.reason === 'duplicate' && r.last
        ? t('gym.errDuplicate', { time: r.last.time })
        : r.reason === 'needLocation'
          ? t(phase.denied ? 'gym.errLocationDenied' : 'gym.errNeedLocation')
          : t(REASON[r.reason]);
  return (
    <View style={styles.result}>
      <WarningIcon size={52} color={r.reason === 'duplicate' ? colors.warning : colors.danger} weight="fill" />
      <Text style={styles.resultTitle}>{r.reason === 'duplicate' ? t('gym.dupTitle') : t('gym.failTitle')}</Text>
      {r.gym && <Text style={styles.resultGym}>{r.gym.name}</Text>}
      <Text style={[styles.hint, { textAlign: 'center' }]}>{body}</Text>
      {r.reason === 'needLocation' && phase.denied && (
        <Button label={t('notifySettings.openSettings')} variant="secondary" onPress={() => Linking.openSettings()} style={{ alignSelf: 'stretch' }} />
      )}
      <Button label={r.reason === 'duplicate' ? t('common.done') : t('gym.retry')} onPress={r.reason === 'duplicate' ? () => router.replace('/gym') : onRetry} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}

const FRAME = 240;
const C = 34;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.semibold, fontSize: 17, color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xl },
  frame: { width: FRAME, height: FRAME, alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: C, height: C, borderColor: colors.accent },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: radius.lg },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: radius.lg },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: radius.lg },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: radius.lg },
  checking: { alignItems: 'center', gap: space.sm, backgroundColor: 'rgba(9,16,23,0.75)', padding: space.lg, borderRadius: radius.lg },
  hintLight: { ...type.body, color: '#fff', textAlign: 'center' },
  hint: { ...type.body, color: colors.textSecondary },
  permBox: { alignItems: 'center', gap: space.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.xl },
  permTitle: { ...type.itemTitle, fontFamily: fonts.semibold, fontSize: 19, color: colors.textPrimary, textAlign: 'center' },
  bottom: { gap: space.sm },
  input: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardStroke,
    paddingHorizontal: space.md,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  result: { alignItems: 'center', gap: space.sm, paddingBottom: space.sm },
  resultTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.textPrimary, marginTop: space.xs },
  resultGym: { ...type.itemTitle, fontFamily: fonts.semibold, color: colors.textPrimary },
});
