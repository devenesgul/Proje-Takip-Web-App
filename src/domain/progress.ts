// İlerleme hesapları (PROJECT.md Bölüm 3.2): genel ilerleme, grup ağırlığı/ilerlemesi,
// ağırlık toplamı doğrulaması. Saf fonksiyonlar; React'ten bağımsızdır.
import type { Group, Item } from '../types';

/** Ağırlıkların toplamı bu değer olmalıdır (mutlak yüzde modeli). */
export const TARGET_WEIGHT_TOTAL = 100;

/** Kayan nokta hatalarına karşı sonuçlar bu kadar ondalık haneye yuvarlanır. */
export const RESULT_DECIMALS = 2;

const PERCENT = 100;

/** Sayıyı RESULT_DECIMALS haneye yuvarlar (-0 sonucunu 0'a çevirir). */
export function round2(value: number): number {
  const factor = 10 ** RESULT_DECIMALS;
  const rounded = Math.round(value * factor) / factor;
  return rounded === 0 ? 0 : rounded;
}

function allItems(groups: Group[]): Item[] {
  return groups.flatMap((group) => group.items);
}

function weightedSum(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.weight * item.progress, 0);
}

/** Grup ağırlığı = grubun kalemlerinin ağırlık toplamı (saklanmaz, hesaplanır). */
export function groupWeight(group: Group): number {
  return round2(group.items.reduce((sum, item) => sum + item.weight, 0));
}

/**
 * Grup tamamlanma yüzdesi = Σ(ağırlık × tamamlanma) / grup ağırlığı.
 * Grup ağırlığı 0 ise 0 döner.
 */
export function groupProgress(group: Group): number {
  const weight = group.items.reduce((sum, item) => sum + item.weight, 0);
  if (weight <= 0) return 0;
  return round2(weightedSum(group.items) / weight);
}

/** Genel ilerleme yüzdesi = Σ(ağırlık × tamamlanma / 100). */
export function overallProgress(groups: Group[]): number {
  return round2(weightedSum(allItems(groups)) / PERCENT);
}

/** Tüm kalemlerin ağırlık toplamı. */
export function totalWeight(groups: Group[]): number {
  return round2(allItems(groups).reduce((sum, item) => sum + item.weight, 0));
}

export type WeightState = 'ok' | 'missing' | 'excess';

export interface WeightCheck {
  total: number;
  /** Hedefle mutlak fark (her zaman ≥ 0) */
  diff: number;
  state: WeightState;
}

/** Ağırlık toplamı 100 mü? Değilse ne kadar eksik/fazla? */
export function checkWeights(groups: Group[]): WeightCheck {
  const total = totalWeight(groups);
  const signedDiff = round2(total - TARGET_WEIGHT_TOTAL);
  const state: WeightState = signedDiff === 0 ? 'ok' : signedDiff < 0 ? 'missing' : 'excess';
  return { total, diff: Math.abs(signedDiff), state };
}
