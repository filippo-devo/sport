import { useState } from 'react';
import { Platform, StyleSheet, Switch, Text, View } from 'react-native';

import { healthAvailable } from '../health/healthkit';
import { connectHealth, disconnectHealth, syncHealth, useHealthStore } from '../health/sync';
import { useHealthToday, useRestingHeartRate } from '../health/useHealth';
import { useT } from '../i18n';
import { hhmm } from '../lib/date';
import { useStore } from '../store';
import { colors, space, type } from '../theme/tokens';
import { Card, Divider, SectionTitle } from './ui/controls';

/** "Apple Health" block in Settings (iPhone only). */
export function HealthSettings() {
  const { t } = useT();
  const on = useStore((s) => !!s.settings.health);
  const lastSync = useHealthStore((s) => s.lastSync);
  const error = useHealthStore((s) => s.error);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const today = useHealthToday();
  const resting = useRestingHeartRate();

  if (Platform.OS !== 'ios') return null;
  const available = healthAvailable();

  const toggle = async (next: boolean) => {
    if (!next) return disconnectHealth();
    setBusy(true);
    setDenied(false);
    const ok = await connectHealth();
    setDenied(!ok);
    setBusy(false);
  };

  return (
    <>
      <SectionTitle style={styles.section} title={t('health.title')} />
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.label}>{t('health.connect')}</Text>
            <Text style={styles.sub}>{t('health.what')}</Text>
          </View>
          <Switch
            value={on && available}
            disabled={!available || busy}
            onValueChange={toggle}
            trackColor={{ true: colors.accent, false: colors.track }}
            thumbColor={on ? colors.textOnAccent : colors.textPrimary}
            accessibilityLabel={t('health.connect')}
          />
        </View>
        {!available && <Text style={styles.note}>{t('health.needsBuild')}</Text>}
        {denied && <Text style={styles.note}>{t('health.denied')}</Text>}
        {on && available && (
          <>
            <Divider />
            <View style={styles.stats}>
              <Text style={styles.sub}>
                {t('health.todayLine', { steps: today.steps ?? '—', kcal: today.activeKcal ?? '—' })}
                {resting ? ` · ${t('health.resting', { n: resting })}` : ''}
              </Text>
              <Text style={styles.sub} onPress={() => void syncHealth()}>
                {error ? t('health.error', { e: error }) : lastSync ? t('health.synced', { time: hhmm(lastSync) }) : t('health.syncing')}
              </Text>
            </View>
          </>
        )}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xxl },
  card: { marginTop: space.md, paddingVertical: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52, paddingVertical: space.md },
  label: { ...type.body, color: colors.textPrimary },
  sub: { ...type.caption, color: colors.textSecondary },
  note: { ...type.caption, color: colors.textSecondary, paddingBottom: space.md },
  stats: { gap: space.xs, paddingVertical: space.md },
});
