// Tarih ve sayı biçimlendirme yardımcılarının testleri.
import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, fromInputValue, todayStamp, toInputValue } from './date';
import { formatNumber, formatPercent, parseDecimal } from './number';

describe('date', () => {
  it('ISO → gg.aa.yyyy SS:dd', () => {
    expect(formatDateTime('2026-07-24T08:00')).toBe('24.07.2026 08:00');
    expect(formatDateTime('2026-07-24T08:00:30')).toBe('24.07.2026 08:00');
    expect(formatDateTime(undefined)).toBe('');
  });

  it('yalnızca tarih → gg.aa.yyyy', () => {
    expect(formatDate('2026-10-30')).toBe('30.10.2026');
    expect(formatDate('')).toBe('');
    expect(formatDate('başka')).toBe('başka');
  });

  it('input değeri ↔ ISO', () => {
    expect(toInputValue('2026-07-24T08:00')).toBe('2026-07-24T08:00');
    expect(toInputValue(undefined)).toBe('');
    expect(fromInputValue('2026-07-24T08:00:15')).toBe('2026-07-24T08:00');
    expect(fromInputValue('')).toBeUndefined();
  });

  it('dosya adı için bugünün tarihi', () => {
    expect(todayStamp(new Date(2026, 9, 3))).toBe('2026-10-03');
  });
});

describe('number', () => {
  it('Türkçe biçimler', () => {
    expect(formatNumber(1234.56)).toBe('1.234,56');
    expect(formatNumber(42.555)).toBe('42,56');
    expect(formatPercent(42.5)).toBe('%42,5');
  });

  it('virgüllü, noktalı ve yüzde işaretli girdiyi okur', () => {
    expect(parseDecimal('12,5')).toBe(12.5);
    expect(parseDecimal('12.5')).toBe(12.5);
    expect(parseDecimal(' %8 ')).toBe(8);
    expect(parseDecimal('1.234,5')).toBe(1234.5);
    expect(parseDecimal('-3')).toBe(-3);
  });

  it('sayı olmayan girdide null döner', () => {
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
    expect(parseDecimal('1,2,3')).toBeNull();
  });
});
