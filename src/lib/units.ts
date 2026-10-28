import type { Units } from '../data/types';

const LB_PER_KG = 2.20462;

export function toDisplayWeight(kg: number, units: Units): number {
  return units === 'lb' ? kg * LB_PER_KG : kg;
}

export function fromDisplayWeight(value: number, units: Units): number {
  return units === 'lb' ? value / LB_PER_KG : value;
}

/** Rounds to a plate-friendly step: 0.5 kg / 1 lb. */
export function roundWeight(value: number, units: Units): number {
  const step = units === 'lb' ? 1 : 0.5;
  return Math.round(value / step) * step;
}

// Set from the language setting (Polish uses a decimal comma).
let decimalSeparator = '.';
export function setDecimalSeparator(sep: '.' | ',') {
  decimalSeparator = sep;
}

export function formatNumber(n: number, digits = 1): string {
  const r = Math.round(n * 10 ** digits) / 10 ** digits;
  const s = Number.isInteger(r) ? String(r) : r.toFixed(digits);
  return decimalSeparator === '.' ? s : s.replace('.', decimalSeparator);
}

/** "72.5 kg" / "160 lb". */
export function formatWeight(kg: number, units: Units, withUnit = true): string {
  const v = roundWeight(toDisplayWeight(kg, units), units);
  return withUnit ? `${formatNumber(v)} ${units}` : formatNumber(v);
}

/** Body weight keeps one decimal in both units. */
export function formatBodyWeight(kg: number, units: Units): string {
  return `${formatNumber(toDisplayWeight(kg, units), 1)} ${units}`;
}

/** Large volumes: 12 450 kg → "12.5 t" / "27.4k lb". */
export function formatVolume(kg: number, units: Units): string {
  const v = toDisplayWeight(kg, units);
  if (units === 'kg' && v >= 1000) return `${formatNumber(v / 1000, 1)} t`;
  if (units === 'lb' && v >= 1000) return `${formatNumber(v / 1000, 1)}k lb`;
  return `${Math.round(v)} ${units}`;
}
