import { useT } from '../i18n';
import { fromDisplayWeight, toDisplayWeight } from '../lib/units';
import { useStore } from '../store';
import { latestWeighIn } from '../store/derived';
import { NumberSheet } from './ui/sheets';

/** Logs today's body weight in the user's unit. */
export function LogWeightSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useT();
  const units = useStore((s) => s.settings.units);
  const weighIns = useStore((s) => s.weighIns);
  const logWeight = useStore((s) => s.logWeight);
  const last = latestWeighIn(weighIns)?.kg ?? 80;
  return (
    <NumberSheet
      visible={visible}
      onClose={onClose}
      title={t('weight.title')}
      value={toDisplayWeight(last, units)}
      unit={units}
      step={units === 'kg' ? 0.1 : 0.2}
      decimals={1}
      min={20}
      max={units === 'kg' ? 300 : 660}
      onSave={(v) => logWeight(Math.round(fromDisplayWeight(v, units) * 10) / 10)}
    />
  );
}
