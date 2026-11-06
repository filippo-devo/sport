import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { ArrowsClockwiseIcon, TrashIcon } from '../components/icons';
import { Button, Card, Divider, Segmented, SectionTitle } from '../components/ui/controls';
import { NavBar } from '../components/ui/headers';
import { Screen } from '../components/ui/layout';
import { ConfirmSheet } from '../components/ui/sheets';
import type { Lang, Units } from '../data/types';
import { useT } from '../i18n';
import { clock } from '../lib/date';
import { useStore } from '../store';
import { colors, space, type } from '../theme/tokens';

/** App settings, opened from the gear in the Profile header. */
export default function SettingsScreen() {
  const { t } = useT();
  const s = useStore();
  const [confirm, setConfirm] = useState(false);

  return (
    <Screen top={<NavBar title={t('profile.settings')} />}>
      <Card style={styles.list}>
        <View style={styles.settingRow}>
          <Text style={styles.rowLabel}>{t('profile.language')}</Text>
          <View style={styles.control}>
            <Segmented<Lang>
              value={s.settings.lang}
              onChange={(lang) => s.setSettings({ lang })}
              options={[
                { value: 'en', label: 'English' },
                { value: 'pl', label: 'Polski' },
              ]}
            />
          </View>
        </View>
        <Divider />
        <View style={styles.settingRow}>
          <Text style={styles.rowLabel}>{t('profile.units')}</Text>
          <View style={styles.control}>
            <Segmented<Units>
              value={s.settings.units}
              onChange={(u) => s.setSettings({ units: u })}
              options={[
                { value: 'kg', label: 'kg' },
                { value: 'lb', label: 'lb' },
              ]}
            />
          </View>
        </View>
        <Divider />
        <View style={styles.settingCol}>
          <Text style={styles.rowLabel}>{t('profile.restTimer')}</Text>
          <Segmented
            value={String(s.settings.restSec)}
            onChange={(v) => s.setSettings({ restSec: Number(v) })}
            options={['60', '90', '120', '180'].map((v) => ({ value: v, label: clock(Number(v)) }))}
          />
        </View>
        <Divider />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('profile.haptics')}</Text>
          <Switch
            value={s.settings.haptics}
            onValueChange={(haptics) => s.setSettings({ haptics })}
            trackColor={{ true: colors.accent, false: colors.track }}
            thumbColor={s.settings.haptics ? colors.textOnAccent : colors.textPrimary}
            accessibilityLabel={t('profile.haptics')}
          />
        </View>
      </Card>

      <SectionTitle style={styles.section} title={t('profile.data')} />
      <View style={styles.dataButtons}>
        <Button label={t('profile.onboarding')} variant="secondary" icon={ArrowsClockwiseIcon} onPress={() => router.push('/onboarding')} />
        <Button label={t('profile.reset')} variant="danger" icon={TrashIcon} onPress={() => setConfirm(true)} />
      </View>
      <Text style={styles.version}>GameChanger · {t('profile.version', { v: Constants.expoConfig?.version ?? '1.0.0' })}</Text>

      <ConfirmSheet
        visible={confirm}
        title={t('profile.reset')}
        body={t('profile.resetBody')}
        confirmLabel={t('common.delete')}
        destructive
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          s.resetAll();
          setConfirm(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: space.md, paddingVertical: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52, paddingVertical: space.sm },
  rowLabel: { ...type.body, color: colors.textPrimary, flex: 1 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  settingCol: { gap: space.md, paddingVertical: space.md },
  control: { width: 170 },
  section: { marginTop: space.xxl },
  dataButtons: { gap: space.sm, marginTop: space.lg },
  version: { ...type.caption, color: colors.textSecondary, textAlign: 'center', marginTop: space.xxl },
});
