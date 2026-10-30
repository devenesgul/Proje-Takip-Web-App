// columns.ts birim testleri: sıralama, değer sayımı/temizliği, tip dönüştürme, seçenekler, güvenli bağlantı.
import { describe, expect, it } from 'vitest';
import type { ColumnDefinition, CustomValue, Group, Item } from '../../types';
import {
  changeColumnType,
  clearOptionValues,
  convertValue,
  countColumnValues,
  countOptionUses,
  removeColumnValues,
  renameOptionValues,
  safeHref,
  sortColumns,
  visibleColumns,
} from '../columns';

const COL = 'c1';

function item(value?: CustomValue): Item {
  return {
    id: crypto.randomUUID(),
    name: 'k',
    order: 0,
    weight: 1,
    planned: {},
    actual: {},
    progress: 0,
    status: 'notStarted',
    custom: value === undefined ? { other: 'x' } : { [COL]: value, other: 'x' },
  };
}

function groups(...values: (CustomValue | undefined)[]): Group[] {
  return [{ id: 'g', name: 'g', color: '', order: 0, expanded: true, items: values.map(item) }];
}

const valuesOf = (gs: Group[]) => gs[0].items.map((i) => i.custom[COL]);

function column(id: string, order: number, visible = true): ColumnDefinition {
  return { id, name: id, type: 'text', visible, order };
}

describe('sortColumns / visibleColumns', () => {
  it('sıraya göre dizer ve gizlileri ayıklar, girdiyi değiştirmez', () => {
    const input = [column('b', 1), column('c', 2, false), column('a', 0)];
    expect(sortColumns(input).map((c) => c.id)).toEqual(['a', 'b', 'c']);
    expect(visibleColumns(input).map((c) => c.id)).toEqual(['a', 'b']);
    expect(input.map((c) => c.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('countColumnValues / removeColumnValues', () => {
  it('yalnızca dolu değerleri sayar (boş metin, null ve işaretsiz onay sayılmaz)', () => {
    expect(countColumnValues(groups('a', '', null, false, true, 0, undefined), COL)).toBe(3);
  });

  it('sütunun değerlerini anahtarıyla birlikte kaldırır, diğer sütunlara dokunmaz', () => {
    const input = groups('a', undefined);
    const result = removeColumnValues(input, COL);
    expect(result[0].items.every((i) => !(COL in i.custom))).toBe(true);
    expect(result[0].items.every((i) => i.custom.other === 'x')).toBe(true);
    expect(COL in input[0].items[0].custom).toBe(true);
  });
});

describe('convertValue', () => {
  it('metne her şey dönüşür', () => {
    expect(convertValue(12.5, 'text')).toEqual({ ok: true, value: '12.5' });
    expect(convertValue(true, 'text')).toEqual({ ok: true, value: 'Evet' });
  });

  it('sayıya: Türkçe ondalık okunur, sayı olmayan reddedilir', () => {
    expect(convertValue('12,5', 'number')).toEqual({ ok: true, value: 12.5 });
    expect(convertValue('abc', 'number')).toEqual({ ok: false });
    expect(convertValue(true, 'number')).toEqual({ ok: false });
  });

  it('tarihe: yyyy-aa-gg ile başlayan metin kabul edilir, saat atılır', () => {
    expect(convertValue('2026-10-30T08:00', 'date')).toEqual({ ok: true, value: '2026-10-30' });
    expect(convertValue('30.10.2026', 'date')).toEqual({ ok: false });
  });

  it('onaya: evet/hayır benzeri kelimeler', () => {
    expect(convertValue('Evet', 'checkbox')).toEqual({ ok: true, value: true });
    expect(convertValue('HAYIR', 'checkbox')).toEqual({ ok: true, value: false });
    expect(convertValue(1, 'checkbox')).toEqual({ ok: true, value: true });
    expect(convertValue('belki', 'checkbox')).toEqual({ ok: false });
  });

  it('null her tipte null kalır', () => {
    expect(convertValue(null, 'number')).toEqual({ ok: true, value: null });
  });
});

describe('changeColumnType', () => {
  it('dönüştürülemeyen değerleri siler ve sayar', () => {
    const result = changeColumnType(groups('12', 'abc', '3,5', undefined), COL, 'number');
    expect(valuesOf(result.groups)).toEqual([12, undefined, 3.5, undefined]);
    expect(result.lost).toBe(1);
  });

  it('seçime geçerken mevcut değerlerden benzersiz seçenekler üretir', () => {
    const result = changeColumnType(groups('Ali', 'Ayşe', 'Ali', ''), COL, 'select');
    expect(result.options?.map((o) => o.value)).toEqual(['Ali', 'Ayşe']);
    expect(result.options?.every((o) => o.color)).toBe(true);
    expect(result.lost).toBe(0);
  });
});

describe('seçenek işlemleri', () => {
  it('yeniden adlandırma değerleri de günceller', () => {
    const result = renameOptionValues(groups('Ali', 'Veli', 'Ali'), COL, 'Ali', 'Ali K.');
    expect(valuesOf(result)).toEqual(['Ali K.', 'Veli', 'Ali K.']);
  });

  it('kullanım sayısı ve silinen seçeneğin değerlerini boşaltma', () => {
    const input = groups('Ali', 'Veli', 'Ali');
    expect(countOptionUses(input, COL, 'Ali')).toBe(2);
    expect(valuesOf(clearOptionValues(input, COL, 'Ali'))).toEqual([undefined, 'Veli', undefined]);
  });
});

describe('safeHref', () => {
  it('şemasız adrese https ekler', () => {
    expect(safeHref('ornek.com/belge')).toBe('https://ornek.com/belge');
  });

  it('http, https ve mailto kabul edilir', () => {
    expect(safeHref('http://a.com')).toBe('http://a.com/');
    expect(safeHref('mailto:ali@ornek.com')).toBe('mailto:ali@ornek.com');
  });

  it('tehlikeli şemaları ve boşu reddeder', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('  JavaScript:alert(1)')).toBeNull();
    expect(safeHref('data:text/html,<b>x</b>')).toBeNull();
    expect(safeHref('')).toBeNull();
  });
});
