import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { CaretRightIcon, CheckCircleIcon, MapPinIcon, QrCodeIcon } from '../../components/icons';
import { Badge, Button, Card, Divider, SectionTitle } from '../../components/ui/controls';
import { NavBar } from '../../components/ui/headers';
import { Screen } from '../../components/ui/layout';
import { Sheet } from '../../components/ui/sheets';
import { PARTNER_GYMS } from '../../data/gyms';
import type { PartnerGym } from '../../data/types';
import { useT } from '../../i18n';
import { gymQrPayload } from '../../lib/gyms';
import { useStore } from '../../store';
import { startOfMonth } from '../../store/stats';
import { colors, fonts, radius, space, type } from '../../theme/tokens';

/** Partner-gym check-ins: scan entry point, visit stats, partner list and visit history. */
export default function GymScreen() {
  const { t, dateShort, monthYear } = useT();
  const visits = useStore((s) => s.gymVisits);
  const [qrFor, setQrFor] = useState<PartnerGym | null>(null);

  const sorted = useMemo(() => [...visits].sort((a, b) => b.at - a.at), [visits]);
  const thisMonth = visits.filter((v) => v.at >= startOfMonth().getTime()).length;
  const last = sorted[0];
  const byMonth = useMemo(() => {
    const m = new Map<string, typeof sorted>();
    for (const v of sorted) {
      const k = v.date.slice(0, 7);
      m.set(k, [...(m.get(k) ?? []), v]);
    }
    return [...m.entries()];
  }, [sorted]);

  return (
    <Screen top={<NavBar title={t('gym.title')} />}>
      <Card style={styles.hero}>
        <View style={styles.heroIcon}>
          <QrCodeIcon size={28} color={colors.textOnAccent} weight="bold" />
        </View>
        <Text style={styles.heroTitle}>{t('gym.heroTitle')}</Text>
        <Text style={styles.hint}>{t('gym.heroBody')}</Text>
        <Button label={t('gym.scan')} icon={QrCodeIcon} onPress={() => router.push('/gym/scan')} style={{ alignSelf: 'stretch' }} />
      </Card>

      <View style={styles.stats}>
        <Stat value={String(thisMonth)} label={t('gym.thisMonth')} />
        <Stat value={String(visits.length)} label={t('gym.total')} />
        <Stat value={last ? dateShort(new Date(last.at)) : '—'} label={t('gym.lastVisit')} />
      </View>

      <SectionTitle style={styles.section} title={t('gym.partners')} />
      <Card style={styles.list}>
        {PARTNER_GYMS.map((g, i) => (
          <View key={g.id}>
            {i > 0 && <Divider />}
            <Pressable style={styles.row} disabled={!g.test} onPress={() => setQrFor(g)} accessibilityRole={g.test ? 'button' : undefined}>
              <MapPinIcon size={20} color={colors.accent} weight="fill" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {g.name}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {g.test ? t('gym.testBody') : `${g.address}, ${g.city}`}
                </Text>
              </View>
              {g.test && <Badge label={t('gym.test')} tone="muted" />}
              {g.test && <CaretRightIcon size={14} color={colors.textSecondary} weight="bold" />}
            </Pressable>
          </View>
        ))}
      </Card>
      <Text style={[styles.meta, { marginTop: space.sm }]}>{t('gym.partnersNote')}</Text>

      <SectionTitle style={styles.section} title={t('gym.history')} />
      {byMonth.length === 0 && <Text style={[styles.hint, { marginTop: space.sm }]}>{t('gym.historyEmpty')}</Text>}
      {byMonth.map(([month, items]) => (
        <View key={month} style={{ marginTop: space.md }}>
          <Text style={styles.month}>
            {monthYear(new Date(items[0].at))} · {items.length}
          </Text>
          <Card style={styles.list}>
            {items.map((v, i) => (
              <View key={v.id}>
                {i > 0 && <Divider />}
                <View style={styles.row}>
                  <CheckCircleIcon size={20} color={v.method === 'qr+gps' ? colors.success : colors.warning} weight="fill" />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {v.gymName}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {dateShort(new Date(v.at))} · {v.time}
                      {v.address ? ` · ${v.address}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.method}>{v.method === 'qr+gps' ? 'QR + GPS' : 'QR'}</Text>
                </View>
              </View>
            ))}
          </Card>
        </View>
      ))}

      <Sheet visible={!!qrFor} onClose={() => setQrFor(null)} title={qrFor?.name}>
        {qrFor && (
          <View style={styles.qrBox}>
            <View style={styles.qrWhite}>
              <QRCode value={gymQrPayload(qrFor)} size={200} backgroundColor="#ffffff" color="#091017" />
            </View>
            <Text style={styles.payload} selectable>
              {gymQrPayload(qrFor)}
            </Text>
            <Text style={[styles.hint, { textAlign: 'center' }]}>{t('gym.testQrBody')}</Text>
          </View>
        )}
      </Sheet>
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Card style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.meta}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl },
  heroIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.textPrimary, marginTop: space.xs },
  hint: { ...type.body, color: colors.textSecondary, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  stat: { flex: 1, padding: space.md, gap: 2 },
  statValue: { fontFamily: fonts.bold, fontSize: 20, color: colors.textPrimary },
  section: { marginTop: space.xxl },
  list: { marginTop: space.md, paddingVertical: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  name: { ...type.itemTitle, color: colors.textPrimary },
  meta: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  method: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textSecondary },
  month: { ...type.body, color: colors.textSecondary, textTransform: 'capitalize' },
  payload: { fontFamily: fonts.medium, fontSize: 13, color: colors.textPrimary },
  qrBox: { alignItems: 'center', gap: space.md },
  qrWhite: { padding: space.lg, backgroundColor: '#fff', borderRadius: radius.lg },
});
