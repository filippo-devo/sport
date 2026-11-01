import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useT } from '../../i18n';
import { colors, fonts, radius, space } from '../../theme/tokens';
import { MinusIcon, PlusIcon } from '../icons';
import { Button, IconButton, Segmented } from './controls';
import { Sheet } from './sheets';

const pad = (n: number) => String(n).padStart(2, '0');
const MINUTES = ['00', '15', '30', '45'];

/** Picks a time of day (HH:MM) with an hour stepper and quarter-hour minutes. */
export function TimeSheet({ visible, title, value, onSave, onClose }: { visible: boolean; title: string; value: string; onSave: (v: string) => void; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {visible && <TimeEditor value={value} onSave={(v) => (onSave(v), onClose())} />}
    </Sheet>
  );
}

function TimeEditor({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const { t } = useT();
  const [h0, m0] = value.split(':').map(Number);
  const [hour, setHour] = useState(Number.isFinite(h0) ? h0 : 8);
  const [minute, setMinute] = useState(MINUTES.includes(pad(m0)) ? pad(m0) : '00');
  return (
    <>
      <View style={styles.row}>
        <IconButton icon={MinusIcon} label="−1 h" size={52} onPress={() => setHour((hour + 23) % 24)} />
        <View style={styles.display}>
          <Text style={styles.time}>
            {pad(hour)}:{minute}
          </Text>
        </View>
        <IconButton icon={PlusIcon} label="+1 h" size={52} onPress={() => setHour((hour + 1) % 24)} />
      </View>
      <Segmented value={minute} onChange={setMinute} options={MINUTES.map((m) => ({ value: m, label: `:${m}` }))} />
      <Button label={t('common.save')} onPress={() => onSave(`${pad(hour)}:${minute}`)} />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  display: {
    flex: 1,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardStroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: { fontFamily: fonts.bold, fontSize: 32, color: colors.textPrimary },
});
