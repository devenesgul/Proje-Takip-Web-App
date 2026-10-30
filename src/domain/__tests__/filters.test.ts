// filters.ts ve rows.ts filtre davranışı testleri.
import { describe, expect, it } from 'vitest';
import type { Group, Item } from '../../types';
import { countMatching, isThisWeek, matchesFilter, weekOf } from '../filters';
import { visibleRows } from '../rows';

// 30.10.2026 Cuma → hafta: 26.10 Pazartesi – 02.11 Pazartesi
const NOW = '2026-10-30T12:00';

function item(start?: string, end?: string, progress = 0, overrides: Partial<Item> = {}): Item {
  return {
    id: crypto.randomUUID(),
    name: 'k',
    order: 0,
    weight: 1,
    planned: { start, end },
    actual: {},
    progress,
    status: 'notStarted',
    custom: {},
    ...overrides,
  };
}

const group = (items: Item[], expanded = true): Group => ({
  id: crypto.randomUUID(),
  name: 'g',
  color: '',
  order: 0,
  expanded,
  items,
});

describe('weekOf', () => {
  it('pazartesi 00:00 – sonraki pazartesi 00:00', () => {
    expect(weekOf(NOW)).toEqual({ start: '2026-10-26T00:00', end: '2026-11-02T00:00' });
    expect(weekOf('2026-10-26T00:00').start).toBe('2026-10-26T00:00');
    expect(weekOf('2026-11-01T23:59').start).toBe('2026-10-26T00:00');
  });
});

describe('isThisWeek', () => {
  it('haftayla kesişen bitmemiş kalem', () => {
    expect(isThisWeek(item('2026-10-01T08:00', '2026-12-01T17:00'), NOW)).toBe(true);
    expect(isThisWeek(item('2026-11-01T08:00', '2026-11-10T17:00'), NOW)).toBe(true);
    expect(isThisWeek(item('2026-10-20T08:00', '2026-10-26T08:00'), NOW)).toBe(true);
  });

  it('haftanın dışında, bitmiş veya tarihsiz kalem değil', () => {
    expect(isThisWeek(item('2026-11-02T00:00', '2026-11-10T17:00'), NOW)).toBe(false);
    expect(isThisWeek(item('2026-10-01T08:00', '2026-10-25T17:00'), NOW)).toBe(false);
    expect(isThisWeek(item('2026-10-27T08:00', '2026-10-29T17:00', 100), NOW)).toBe(false);
    expect(isThisWeek(item(), NOW)).toBe(false);
  });

  it('tek tarih girilmişse o gün sayılır', () => {
    expect(isThisWeek(item(undefined, '2026-10-31T17:00'), NOW)).toBe(true);
  });
});

describe('matchesFilter / countMatching', () => {
  const late = item('2026-10-01T08:00', '2026-10-20T17:00', 50);
  const running = item('2026-10-01T08:00', '2026-12-20T17:00', 30);
  const finished = item('2026-09-01T08:00', '2026-09-20T17:00', 100);
  const groups = [group([late, running, finished])];

  it('her filtre doğru kalemleri seçer', () => {
    expect(matchesFilter(late, 'delayed', NOW)).toBe(true);
    expect(matchesFilter(running, 'inProgress', NOW)).toBe(true);
    expect(matchesFilter(finished, 'done', NOW)).toBe(true);
    expect(countMatching(groups, 'all', NOW)).toBe(3);
    expect(countMatching(groups, 'thisWeek', NOW)).toBe(1);
  });

  it('elle seçilen durum dikkate alınır', () => {
    const onHold = item('2026-10-01T08:00', '2026-12-20T17:00', 30, {
      status: 'onHold',
      statusManual: true,
    });
    expect(matchesFilter(onHold, 'inProgress', NOW)).toBe(false);
  });
});

describe('visibleRows (filtreli)', () => {
  const a = item('2026-10-01T08:00', '2026-10-20T17:00', 50);
  const b = item('2026-10-01T08:00', '2026-12-20T17:00', 30);
  const withMatch = group([a, b]);
  const withoutMatch = group([b]);
  const empty = group([]);
  const onlyA = (i: Item) => i === a;

  it('yalnızca uyan kalemleri ve onları içeren grupları gösterir', () => {
    const rows = visibleRows([withMatch, withoutMatch, empty], onlyA);
    expect(rows.map((r) => r.kind)).toEqual(['group', 'item']);
    expect(rows[1].kind === 'item' && rows[1].item).toBe(a);
  });

  it('grup satırı grubun tamamını taşır (toplamlar filtreden etkilenmez)', () => {
    const [groupRow] = visibleRows([withMatch], onlyA);
    expect(groupRow.group.items).toHaveLength(2);
  });

  it('kapalı grup filtrede de kapalı kalır', () => {
    expect(visibleRows([group([a], false)], onlyA).map((r) => r.kind)).toEqual(['group']);
  });
});
