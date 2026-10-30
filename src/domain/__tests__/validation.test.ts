// validation.ts birim testleri: tamamlanma sınırlama, ağırlık ve tarih aralığı kontrolleri.
import { describe, expect, it } from 'vitest';
import { checkDateRange, checkWeight, clampProgress } from '../validation';

describe('clampProgress', () => {
  it('0–100 aralığına sınırlar', () => {
    expect(clampProgress(-5)).toBe(0);
    expect(clampProgress(150)).toBe(100);
    expect(clampProgress(42.5)).toBe(42.5);
  });

  it('geçersiz sayıyı 0 yapar', () => {
    expect(clampProgress(Number.NaN)).toBe(0);
    expect(clampProgress(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('checkWeight', () => {
  it('0–100 arası geçerli (ondalık dahil)', () => {
    expect(checkWeight(0)).toEqual({ ok: true });
    expect(checkWeight(0.5)).toEqual({ ok: true });
    expect(checkWeight(100)).toEqual({ ok: true });
  });

  it('negatif, 100 üstü ve sayı olmayan değerleri reddeder', () => {
    expect(checkWeight(-1).ok).toBe(false);
    expect(checkWeight(100.01).ok).toBe(false);
    expect(checkWeight(Number.NaN).ok).toBe(false);
  });
});

describe('checkDateRange', () => {
  it('bitiş başlangıçtan önceyse reddeder', () => {
    expect(checkDateRange({ start: '2026-08-10T08:00', end: '2026-08-01T17:00' }).ok).toBe(false);
  });

  it('aynı gün içinde saate göre karşılaştırır', () => {
    expect(checkDateRange({ start: '2026-08-10T10:00', end: '2026-08-10T09:00' }).ok).toBe(false);
    expect(checkDateRange({ start: '2026-08-10T10:00', end: '2026-08-10T10:00' }).ok).toBe(true);
  });

  it('alanlardan biri boşsa geçerli', () => {
    expect(checkDateRange({ start: '2026-08-10T08:00' }).ok).toBe(true);
    expect(checkDateRange({}).ok).toBe(true);
  });
});
