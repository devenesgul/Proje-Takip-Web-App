// scurve.ts birim testleri: kalemPlan(t), PlanlananGenel(t), sapma, eğri verisi, ilerleme kayıtları.
import { describe, expect, it } from 'vitest';
import { sampleProject } from '../../data/sampleProject';
import type { Group, Item, ProgressSnapshot } from '../../types';
import {
  deviation,
  itemPlanFraction,
  plannedProgress,
  sCurve,
  unplannedWeight,
  upsertSnapshot,
  valueAt,
} from '../scurve';

function item(weight: number, start?: string, end?: string, progress = 0): Item {
  return {
    id: crypto.randomUUID(),
    name: 'k',
    order: 0,
    weight,
    planned: { start, end },
    actual: {},
    progress,
    status: 'notStarted',
    custom: {},
  };
}

const group = (...items: Item[]): Group => ({
  id: crypto.randomUUID(),
  name: 'g',
  color: '',
  order: 0,
  expanded: true,
  items,
});

// 10 günlük kalem: 01.10 00:00 → 11.10 00:00
const TEN_DAYS = item(40, '2026-10-01T00:00', '2026-10-11T00:00');

describe('itemPlanFraction (kalemPlan)', () => {
  it('başlangıçtan önce 0, bitişten sonra 1', () => {
    expect(itemPlanFraction(TEN_DAYS, '2026-09-30T00:00')).toBe(0);
    expect(itemPlanFraction(TEN_DAYS, '2026-10-01T00:00')).toBe(0);
    expect(itemPlanFraction(TEN_DAYS, '2026-10-11T00:00')).toBe(1);
    expect(itemPlanFraction(TEN_DAYS, '2027-01-01T00:00')).toBe(1);
  });

  it('arada doğrusal (saat dahil)', () => {
    expect(itemPlanFraction(TEN_DAYS, '2026-10-06T00:00')).toBe(0.5);
    expect(itemPlanFraction(TEN_DAYS, '2026-10-01T12:00')).toBeCloseTo(0.05);
  });

  it('sıfır süreli kalem: bitişte 1', () => {
    const instant = item(1, '2026-10-05T08:00', '2026-10-05T08:00');
    expect(itemPlanFraction(instant, '2026-10-05T07:59')).toBe(0);
    expect(itemPlanFraction(instant, '2026-10-05T08:00')).toBe(1);
  });

  it('tarihi eksikse null', () => {
    expect(itemPlanFraction(item(1, '2026-10-01T00:00'), '2026-10-05T00:00')).toBeNull();
  });
});

describe('plannedProgress (PlanlananGenel)', () => {
  const groups = [group(TEN_DAYS, item(60, '2026-10-06T00:00', '2026-10-16T00:00'))];

  it('Σ ağırlık × kalemPlan(t)', () => {
    // 06.10: ilki %50 → 20, ikincisi 0 → toplam 20
    expect(plannedProgress(groups, '2026-10-06T00:00')).toBe(20);
    // 11.10: ilki 1 → 40, ikincisi %50 → 30 → 70
    expect(plannedProgress(groups, '2026-10-11T00:00')).toBe(70);
  });

  it('tüm kalemlerin bitişinden sonra %100 (kabul kriteri 10.2)', () => {
    expect(plannedProgress(groups, '2026-12-01T00:00')).toBe(100);
    expect(plannedProgress(sampleProject.groups, sampleProject.end)).toBe(100);
  });

  it('tarihsiz kalem katkı vermez ve ayrıca raporlanır', () => {
    const withUndated = [group(TEN_DAYS, item(60))];
    expect(plannedProgress(withUndated, '2027-01-01T00:00')).toBe(40);
    expect(unplannedWeight(withUndated)).toBe(60);
  });
});

describe('deviation (sapma)', () => {
  it('(+) öndeyiz, (−) gerideyiz', () => {
    const ahead = [group(item(100, '2026-10-01T00:00', '2026-10-11T00:00', 70))];
    expect(deviation(ahead, '2026-10-06T00:00')).toBe(20);
    const behind = [group(item(100, '2026-10-01T00:00', '2026-10-11T00:00', 30))];
    expect(deviation(behind, '2026-10-06T00:00')).toBe(-20);
  });
});

describe('sCurve', () => {
  const groups = [group(TEN_DAYS, item(60, '2026-10-06T00:00', '2026-10-16T00:00', 10))];
  const snapshots: ProgressSnapshot[] = [
    { date: '2026-10-08T17:00', overallProgress: 5 },
    { date: '2026-10-03T17:00', overallProgress: 2 },
  ];

  it('planlanan: kırılma noktalarında, tarih sırasıyla, 0 → 100', () => {
    const { planned } = sCurve(
      groups,
      [],
      '2026-09-28T00:00',
      '2026-10-20T00:00',
      '2026-10-10T00:00',
    );
    expect(planned.map((p) => p.date)).toEqual([
      '2026-09-28T00:00',
      '2026-10-01T00:00',
      '2026-10-06T00:00',
      '2026-10-11T00:00',
      '2026-10-16T00:00',
      '2026-10-20T00:00',
    ]);
    expect(planned.map((p) => p.value)).toEqual([0, 0, 20, 70, 100, 100]);
  });

  it('gerçekleşen: kayıtlar sıralı + şu anki değer', () => {
    const { actual } = sCurve(
      groups,
      snapshots,
      '2026-09-28T00:00',
      '2026-10-20T00:00',
      '2026-10-10T00:00',
    );
    expect(actual).toEqual([
      { date: '2026-10-03T17:00', value: 2 },
      { date: '2026-10-08T17:00', value: 5 },
      { date: '2026-10-10T00:00', value: 6 },
    ]);
  });
});

describe('upsertSnapshot', () => {
  const base: ProgressSnapshot[] = [{ date: '2026-10-29T17:00', overallProgress: 10 }];

  it('yeni güne kayıt ekler', () => {
    expect(upsertSnapshot(base, '2026-10-30T09:00', 12)).toEqual([
      ...base,
      { date: '2026-10-30T09:00', overallProgress: 12 },
    ]);
  });

  it('aynı gün içinde öncekinin yerine geçer (günde tek kayıt)', () => {
    const once = upsertSnapshot(base, '2026-10-30T09:00', 12);
    expect(upsertSnapshot(once, '2026-10-30T15:00', 14)).toEqual([
      ...base,
      { date: '2026-10-30T15:00', overallProgress: 14 },
    ]);
  });

  it('değer değişmediyse aynı listeyi döner', () => {
    expect(upsertSnapshot(base, '2026-10-30T09:00', 10)).toBe(base);
    expect(upsertSnapshot(base, '2026-10-29T18:00', 10)).toBe(base);
  });

  it('değeri 0–100 arasında ve 2 haneye yuvarlar', () => {
    expect(upsertSnapshot([], '2026-10-30T09:00', 12.3456)[0].overallProgress).toBe(12.35);
  });
});

describe('valueAt', () => {
  const points = [
    { date: '2026-10-01T00:00', value: 0 },
    { date: '2026-10-11T00:00', value: 40 },
    { date: '2026-10-21T00:00', value: 100 },
  ];

  it('noktada değeri, arada doğrusal ara değeri verir', () => {
    expect(valueAt(points, '2026-10-11T00:00')).toBe(40);
    expect(valueAt(points, '2026-10-06T00:00')).toBe(20);
    expect(valueAt(points, '2026-10-16T00:00')).toBe(70);
  });

  it('eğrinin dışında null', () => {
    expect(valueAt(points, '2026-09-30T00:00')).toBeNull();
    expect(valueAt(points, '2026-10-22T00:00')).toBeNull();
    expect(valueAt([], '2026-10-06T00:00')).toBeNull();
  });

  it('planlanan eğride plannedProgress ile aynı sonucu verir (parçalı doğrusal)', () => {
    const groups = [group(TEN_DAYS, item(60, '2026-10-06T00:00', '2026-10-16T00:00'))];
    const { planned } = sCurve(
      groups,
      [],
      '2026-09-28T00:00',
      '2026-10-20T00:00',
      '2026-10-10T00:00',
    );
    for (const t of ['2026-10-03T06:00', '2026-10-08T12:00', '2026-10-13T18:00']) {
      expect(valueAt(planned, t)).toBeCloseTo(plannedProgress(groups, t), 1);
    }
  });
});
