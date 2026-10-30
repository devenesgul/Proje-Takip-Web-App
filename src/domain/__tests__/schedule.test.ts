// schedule.ts birim testleri: gecikme, kalan gün, durum önerisi.
import { describe, expect, it } from 'vitest';
import type { Group, Item } from '../../types';
import {
  delayedItems,
  effectiveStatus,
  isDelayed,
  remainingDays,
  remainingDaysLabel,
  suggestStatus,
} from '../schedule';

const NOW = '2026-10-30T12:00';

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: crypto.randomUUID(),
    name: 'k',
    order: 0,
    weight: 1,
    planned: { start: '2026-10-01T08:00', end: '2026-10-20T17:00' },
    actual: {},
    progress: 50,
    status: 'notStarted',
    custom: {},
    ...overrides,
  };
}

describe('isDelayed', () => {
  it('bitişi geçmiş ve bitmemiş kalem gecikmiştir', () => {
    expect(isDelayed(item(), NOW)).toBe(true);
  });

  it('%100 olan kalem gecikmiş sayılmaz', () => {
    expect(isDelayed(item({ progress: 100 }), NOW)).toBe(false);
  });

  it('elle "Bitti" seçilen kalem gecikmiş sayılmaz', () => {
    expect(isDelayed(item({ status: 'done', statusManual: true }), NOW)).toBe(false);
  });

  it('elle seçilmemiş saklı "done" durumu gecikmeyi gizlemez', () => {
    expect(isDelayed(item({ status: 'done' }), NOW)).toBe(true);
  });

  it('bitişi gelecekte veya tam şimdi olan kalem gecikmemiştir', () => {
    expect(isDelayed(item({ planned: { end: '2026-11-01T17:00' } }), NOW)).toBe(false);
    expect(isDelayed(item({ planned: { end: NOW } }), NOW)).toBe(false);
  });

  it('aynı gün içinde saate göre karar verir', () => {
    expect(isDelayed(item({ planned: { end: '2026-10-30T11:59' } }), NOW)).toBe(true);
    expect(isDelayed(item({ planned: { end: '2026-10-30T17:00' } }), NOW)).toBe(false);
  });

  it('bitiş tarihi yoksa gecikme yoktur', () => {
    expect(isDelayed(item({ planned: {} }), NOW)).toBe(false);
  });
});

describe('delayedItems', () => {
  it('tüm gruplardaki gecikenleri döner', () => {
    const late = item({ name: 'geç' });
    const groups: Group[] = [
      {
        id: 'a',
        name: 'a',
        color: '',
        order: 0,
        expanded: true,
        items: [late, item({ progress: 100 })],
      },
      { id: 'b', name: 'b', color: '', order: 1, expanded: false, items: [item({ planned: {} })] },
    ];
    expect(delayedItems(groups, NOW)).toEqual([late]);
  });
});

describe('remainingDays', () => {
  it('takvim günü farkını verir, saat dikkate alınmaz', () => {
    expect(remainingDays('2026-11-09T08:00', NOW)).toBe(10);
    expect(remainingDays('2026-10-30T23:59', NOW)).toBe(0);
  });

  it('geçmişte bitmişse negatif', () => {
    expect(remainingDays('2026-10-25T17:00', NOW)).toBe(-5);
  });

  it('artık yıl ve yıl geçişini doğru sayar', () => {
    expect(remainingDays('2028-03-01T00:00', '2028-02-28T00:00')).toBe(2);
    expect(remainingDays('2027-01-01T00:00', '2026-12-31T23:59')).toBe(1);
  });

  it('yaz saati geçişinde gün kaymaz', () => {
    // Avrupa'da 29.03.2026 saat ileri alınır; yine de 1 gün.
    expect(remainingDays('2026-03-30T00:00', '2026-03-29T00:00')).toBe(1);
  });

  it('örnek proje süresi: 24.07.2026 → 13.07.2028', () => {
    expect(remainingDays('2028-07-13T17:00', '2026-07-24T08:00')).toBe(720);
  });

  it('okunamayan tarihte null', () => {
    expect(remainingDays('tarih değil', NOW)).toBeNull();
  });
});

describe('remainingDaysLabel', () => {
  it('pozitif, sıfır ve negatif', () => {
    expect(remainingDaysLabel(310)).toBe('310 gün kalan');
    expect(remainingDaysLabel(0)).toBe('Bugün bitiyor');
    expect(remainingDaysLabel(-5)).toBe('5 gün gecikti');
  });
});

describe('suggestStatus / effectiveStatus', () => {
  const future = { start: '2026-11-01T08:00', end: '2026-12-01T17:00' };

  it('%100 → Bitti', () => {
    expect(suggestStatus(item({ progress: 100 }), NOW)).toBe('done');
  });

  it('bitişi geçmiş → Gecikti', () => {
    expect(suggestStatus(item(), NOW)).toBe('delayed');
  });

  it('ilerleme var veya gerçek başlangıç geçmişte → Devam ediyor', () => {
    expect(suggestStatus(item({ planned: future, progress: 10 }), NOW)).toBe('inProgress');
    expect(
      suggestStatus(
        item({ planned: future, progress: 0, actual: { start: '2026-10-29T08:00' } }),
        NOW,
      ),
    ).toBe('inProgress');
  });

  it('hiç başlanmamış → Başlamadı', () => {
    expect(suggestStatus(item({ planned: future, progress: 0 }), NOW)).toBe('notStarted');
  });

  it('elle seçilen durum öneriyi ezer (ör. Beklemede)', () => {
    const onHold = item({ status: 'onHold', statusManual: true });
    expect(effectiveStatus(onHold, NOW)).toBe('onHold');
    expect(effectiveStatus(item({ status: 'onHold' }), NOW)).toBe('delayed');
  });
});
