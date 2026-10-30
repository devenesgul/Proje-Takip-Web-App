// Giriş kuralları (PROJECT.md Bölüm 11): ağırlık ve tamamlanma sınırları, tarih aralığı kontrolü.
// Saf fonksiyonlar; store ve hücre editörleri bu kuralları kullanır.
import type { DateRange } from '../types';

export const MIN_PERCENT = 0;
export const MAX_PERCENT = 100;

/** Tamamlanmayı 0–100 aralığına sınırlar (clamp). Geçersiz sayı 0 olur. */
export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return MIN_PERCENT;
  return Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, value));
}

export type CheckResult = { ok: true } | { ok: false; message: string };

/** Ağırlık 0–100 arasında olmalı; dışındaysa girişte engellenir. */
export function checkWeight(value: number): CheckResult {
  if (!Number.isFinite(value)) return { ok: false, message: 'Geçerli bir sayı girin' };
  if (value < MIN_PERCENT) return { ok: false, message: 'Ağırlık negatif olamaz' };
  if (value > MAX_PERCENT) return { ok: false, message: "Ağırlık 100'den büyük olamaz" };
  return { ok: true };
}

/**
 * Bitiş başlangıçtan önce olamaz. Alanlardan biri boşsa aralık geçerli sayılır.
 * ISO metinler (yyyy-aa-ggTSS:dd) sözlük sırasıyla karşılaştırılabilir.
 */
export function checkDateRange(range: DateRange): CheckResult {
  if (range.start && range.end && range.end < range.start) {
    return { ok: false, message: 'Bitiş tarihi başlangıçtan önce olamaz' };
  }
  return { ok: true };
}
