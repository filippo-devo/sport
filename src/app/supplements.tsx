import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { PillIcon, PlusIcon, TrashIcon, XIcon } from '../components/icons';
import { dosesPerDay, takenOn } from '../components/nutrition/SupplementsCard';
import { Button, Card, Divider, SectionTitle } from '../components/ui/controls';
import { NavBar } from '../components/ui/headers';
import { Screen } from '../components/ui/layout';
import { ConfirmSheet, Sheet } from '../components/ui/sheets';
import { TimeSheet } from '../components/ui/TimeSheet';
import type { Supplement } from '../data/types';
import { useT } from '../i18n';
import { dayKey, fromKey } from '../lib/date';
import { useStore } from '../store';
import { colors, fonts, radius, space, type } from '../theme/tokens';

const EMPTY: Supplement = { id: '', name: '', dose: '', times: ['08:00'], reminders: true };

/** Supplements: today's intake, the list with reminder times, and the intake history. */
export default function SupplementsScreen() {
  const { t, dateLong } = useT();
  const supplements = useStore((s) => s.supplements);
  const logs = useStore((s) => s.supplementLogs);
  const take = useStore((s) => s.takeSupplement);
  const deleteLog = useStore((s) => s.deleteSupplementLog);
  const [editing, setEditing] = useState<Supplement | null>(null);
  const active = supplements.filter((s) => !s.archived);
  const today = dayKey();

  const history = useMemo(() => {
    const byDay = new Map<string, typeof logs>();
    for (const l of [...logs].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))) {
      byDay.set(l.date, [...(byDay.get(l.date) ?? []), l]);
    }
    return [...byDay.entries()].slice(0, 30);
  }, [logs]);

  return (
    <Screen top={<NavBar title={t('supp.title')} />}>
      <SectionTitle title={t('supp.today')} />
      <Card style={styles.list}>
        {active.length === 0 && <Text style={[styles.meta, { paddingVertical: space.md }]}>{t('supp.none')}</Text>}
        {active.map((s, i) => {
          const taken = takenOn(logs, s.id, today);
          return (
            <View key={s.id}>
              {i > 0 && <Divider />}
              <Pressable style={styles.row} onPress={() => setEditing(s)} accessibilityRole="button" accessibilityLabel={t('supp.edit')}>
                <PillIcon size={20} color={taken.length >= dosesPerDay(s) ? colors.success : colors.textSecondary} weight="fill" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {s.name}
                    {s.dose ? <Text style={styles.meta}> · {s.dose}</Text> : null}
                  </Text>
                  <Text style={styles.meta}>
                    {s.times.join(' · ')} · {taken.length}/{dosesPerDay(s)}
                    {s.reminders ? '' : ` · ${t('supp.reminders')}: —`}
                  </Text>
                </View>
                <Button label={t('supp.take')} size="sm" variant={taken.length >= dosesPerDay(s) ? 'secondary' : 'primary'} onPress={() => take(s.id)} />
              </Pressable>
            </View>
          );
        })}
      </Card>
      <Button label={t('supp.add')} icon={PlusIcon} variant="secondary" onPress={() => setEditing(EMPTY)} style={{ marginTop: space.md }} />

      <SectionTitle style={styles.section} title={t('supp.history')} />
      {history.length === 0 && <Text style={[styles.meta, { marginTop: space.sm }]}>{t('supp.historyEmpty')}</Text>}
      {history.map(([date, items]) => (
        <View key={date} style={{ marginTop: space.md }}>
          <Text style={styles.day}>{dateLong(fromKey(date))}</Text>
          <Card style={styles.list}>
            {items.map((l, i) => (
              <View key={l.id}>
                {i > 0 && <Divider />}
                <View style={styles.row}>
                  <Text style={styles.time}>{l.time}</Text>
                  <Text style={[styles.name, { flex: 1 }]} numberOfLines={1}>
                    {l.name}
                    {l.dose ? <Text style={styles.meta}> · {l.dose}</Text> : null}
                  </Text>
                  <Pressable onPress={() => deleteLog(l.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.delete')}>
                    <XIcon size={16} color={colors.textSecondary} weight="bold" />
                  </Pressable>
                </View>
              </View>
            ))}
          </Card>
        </View>
      ))}

      <SupplementSheet supplement={editing} onClose={() => setEditing(null)} />
    </Screen>
  );
}

function SupplementSheet({ supplement, onClose }: { supplement: Supplement | null; onClose: () => void }) {
  const { t } = useT();
  return (
    <Sheet visible={!!supplement} onClose={onClose} title={supplement?.id ? t('supp.edit') : t('supp.add')}>
      {supplement && <SupplementEditor initial={supplement} onClose={onClose} />}
    </Sheet>
  );
}

function SupplementEditor({ initial, onClose }: { initial: Supplement; onClose: () => void }) {
  const { t } = useT();
  const save = useStore((s) => s.saveSupplement);
  const remove = useStore((s) => s.deleteSupplement);
  const [draft, setDraft] = useState(initial);
  const [timeIndex, setTimeIndex] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  const valid = draft.name.trim().length > 0;
  const times = [...draft.times].sort();

  return (
    <>
      <TextInput
        value={draft.name}
        onChangeText={(name) => setDraft({ ...draft, name })}
        placeholder={t('supp.namePlaceholder')}
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
        maxLength={40}
        accessibilityLabel={t('supp.name')}
      />
      <TextInput
        value={draft.dose}
        onChangeText={(dose) => setDraft({ ...draft, dose })}
        placeholder={t('supp.dosePlaceholder')}
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
        maxLength={24}
        accessibilityLabel={t('supp.dose')}
      />
      <View>
        <Text style={styles.meta}>{t('supp.times')}</Text>
        <View style={styles.times}>
          {times.map((time, i) => (
            <View key={`${time}-${i}`} style={styles.timeChip}>
              <Pressable onPress={() => setTimeIndex(draft.times.indexOf(time))} accessibilityRole="button" hitSlop={6}>
                <Text style={styles.timeText}>{time}</Text>
              </Pressable>
              {draft.times.length > 1 && (
                <Pressable onPress={() => setDraft({ ...draft, times: draft.times.filter((x) => x !== time) })} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.delete')}>
                  <XIcon size={13} color={colors.textSecondary} weight="bold" />
                </Pressable>
              )}
            </View>
          ))}
          {draft.times.length < 6 && (
            <Pressable style={[styles.timeChip, styles.timeAdd]} onPress={() => setTimeIndex(-1)} accessibilityRole="button">
              <PlusIcon size={13} color={colors.accent} weight="bold" />
              <Text style={[styles.timeText, { color: colors.accent }]}>{t('supp.addTime')}</Text>
            </Pressable>
          )}
        </View>
      </View>
      <View style={styles.switchRow}>
        <Text style={[styles.name, { flex: 1 }]}>{t('supp.reminders')}</Text>
        <Switch
          value={draft.reminders}
          onValueChange={(reminders) => setDraft({ ...draft, reminders })}
          trackColor={{ true: colors.accent, false: colors.track }}
          thumbColor={draft.reminders ? colors.textOnAccent : colors.textPrimary}
          accessibilityLabel={t('supp.reminders')}
        />
      </View>
      <Button
        label={t('common.save')}
        disabled={!valid}
        onPress={() => {
          save({ ...draft, name: draft.name.trim(), dose: draft.dose.trim(), times: [...new Set(draft.times)].sort() });
          onClose();
        }}
      />
      {initial.id ? <Button label={t('supp.delete')} variant="danger" icon={TrashIcon} onPress={() => setConfirm(true)} /> : null}

      <TimeSheet
        visible={timeIndex != null}
        title={t('supp.times')}
        value={timeIndex != null && timeIndex >= 0 ? draft.times[timeIndex] : '12:00'}
        onClose={() => setTimeIndex(null)}
        onSave={(v) => setDraft({ ...draft, times: timeIndex != null && timeIndex >= 0 ? draft.times.map((x, i) => (i === timeIndex ? v : x)) : [...draft.times, v] })}
      />
      <ConfirmSheet
        visible={confirm}
        title={t('supp.delete')}
        body={t('supp.deleteBody')}
        confirmLabel={t('common.delete')}
        destructive
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          remove(initial.id);
          setConfirm(false);
          onClose();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xxl },
  list: { marginTop: space.md, paddingVertical: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  name: { ...type.itemTitle, color: colors.textPrimary },
  meta: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  day: { ...type.body, color: colors.textSecondary, textTransform: 'capitalize' },
  time: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textSecondary, width: 48 },
  input: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardStroke,
    paddingHorizontal: space.md,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
    fontSize: 16,
  },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  timeChip: { flexDirection: 'row', alignItems: 'center', gap: space.sm, height: 36, paddingHorizontal: space.md, borderRadius: radius.pill, backgroundColor: colors.control },
  timeAdd: { backgroundColor: 'transparent', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.cardStroke },
  timeText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textPrimary },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
