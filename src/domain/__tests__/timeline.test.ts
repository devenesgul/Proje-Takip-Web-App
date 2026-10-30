// timeline.ts ve rows.ts birim testleri: aralık hizalama, konum, çubuk, başlıklar, görünür satırlar.
import { describe, expect, it } from 'vitest';
import { sampleProject } from '../../data/sampleProject';
import type { Group, Item, Project } from '../../types';
import { dayNumber, dayParts } from '../../utils/date';
import { visibleRows } from '../rows';
import {
  axisHeader,
  barGeometry,
  DAY_WIDTH,
  groupSpan,
  MIN_BAR_WIDTH,
  monthTicks,
  RANGE_PADDING_DAYS,
  timelineRange,
  timelineWidth,
  xOf,
} from '../timeline';

function item(start?: string, end?: string): Item {
  return {
    id: crypto.randomUUID(),
    name: 'k',
    order: 0,
    weight: 1,
    planned: { start, end },
    actual: {},
    progress: 0,
    status: 'notStarted',
    custom: {},
  };
}

function group(items: Item[], expanded = true): Group {
  return { id: crypto.randomUUID(), name: 'g', color: '#000', order: 0, expanded, items };
}

function project(groups: Group[]): Project {
  return {
    ...sampleProject,
    start: '2026-10-07T08:00', // Çarşamba
    end: '2026-10-20T17:00',
    groups,
  };
}

const day = (iso: string) => Math.floor(dayNumber(iso) ?? Number.NaN);

describe('timelineRange', () => {
  it('gün görünümünde iki uca boşluk ekler', () => {
    const range = timelineRange(project([]), 'day');
    expect(range.startDay).toBe(day('2026-10-07T00:00') - RANGE_PADDING_DAYS);
    expect(range.endDay).toBe(day('2026-10-20T00:00') + RANGE_PADDING_DAYS + 1);
  });

  it('hafta görünümünde pazartesiden pazartesiye hizalar', () => {
    const range = timelineRange(project([]), 'week');
    expect(dayParts(range.startDay).weekday).toBe(0);
    expect(dayParts(range.endDay).weekday).toBe(0);
  });

  it("ay görünümünde ayın 1'inden ayın 1'ine hizalar", () => {
    const range = timelineRange(project([]), 'month');
    expect(dayParts(range.startDay)).toMatchObject({ year: 2026, month: 9, day: 1 });
    expect(dayParts(range.endDay)).toMatchObject({ year: 2026, month: 11, day: 1 });
  });

  it('proje dışına taşan kalem tarihlerini de kapsar', () => {
    const range = timelineRange(
      project([group([item('2026-12-01T08:00', '2027-02-01T17:00')])]),
      'day',
    );
    expect(range.endDay).toBe(day('2027-02-01T00:00') + RANGE_PADDING_DAYS + 1);
  });
});

describe('xOf / barGeometry', () => {
  const range = { startDay: day('2026-10-01T00:00'), endDay: day('2026-11-01T00:00') };

  it('gün ve saati piksele çevirir', () => {
    expect(xOf('2026-10-01T00:00', range, 'day')).toBe(0);
    expect(xOf('2026-10-03T12:00', range, 'day')).toBe(2.5 * DAY_WIDTH.day);
    expect(xOf('bozuk', range, 'day')).toBeNull();
  });

  it('çubuk genişliği süreyle orantılı', () => {
    expect(
      barGeometry({ start: '2026-10-02T00:00', end: '2026-10-09T00:00' }, range, 'week'),
    ).toEqual({
      left: DAY_WIDTH.week,
      width: 7 * DAY_WIDTH.week,
    });
  });

  it('çok kısa işte en küçük genişliği kullanır', () => {
    const bar = barGeometry({ start: '2026-10-02T08:00', end: '2026-10-02T09:00' }, range, 'month');
    expect(bar?.width).toBe(MIN_BAR_WIDTH);
  });

  it('tarihi eksik kalem çizilmez', () => {
    expect(barGeometry({ start: '2026-10-02T08:00' }, range, 'day')).toBeNull();
    expect(barGeometry({}, range, 'day')).toBeNull();
  });
});

describe('groupSpan', () => {
  it('en erken başlangıçtan en geç bitişe', () => {
    const g = group([
      item('2026-10-05T08:00', '2026-10-10T17:00'),
      item('2026-10-01T08:00', '2026-10-08T17:00'),
      item(undefined, undefined),
    ]);
    expect(groupSpan(g)).toEqual({ start: '2026-10-01T08:00', end: '2026-10-10T17:00' });
  });

  it('tarihli kalem yoksa null', () => {
    expect(groupSpan(group([item()]))).toBeNull();
    expect(groupSpan(group([]))).toBeNull();
  });
});

describe('axisHeader', () => {
  it('ay görünümü: yıl ve ay başlıkları, genişlikler toplam genişliğe eşit', () => {
    const range = { startDay: day('2026-11-01T00:00'), endDay: day('2027-03-01T00:00') };
    const { top, bottom } = axisHeader(range, 'month');
    expect(top.map((s) => s.label)).toEqual(['2026', '2027']);
    expect(bottom.map((s) => s.label)).toEqual(['Kas', 'Ara', 'Oca', 'Şub']);
    expect(bottom[0].width).toBe(30 * DAY_WIDTH.month);
    const total = bottom.reduce((sum, s) => sum + s.width, 0);
    expect(total).toBeCloseTo(timelineWidth(range, 'month'));
  });

  it('hafta görünümü: pazartesi tarihleriyle hafta, üstte ay', () => {
    const range = { startDay: day('2026-09-28T00:00'), endDay: day('2026-10-19T00:00') };
    const { top, bottom } = axisHeader(range, 'week');
    expect(bottom.map((s) => s.label)).toEqual(['28.09', '05.10', '12.10']);
    expect(top.map((s) => s.label)).toEqual(['Eylül 2026', 'Ekim 2026']);
  });

  it('gün görünümü: her gün bir bölüm', () => {
    const range = { startDay: day('2026-10-30T00:00'), endDay: day('2026-11-02T00:00') };
    const { top, bottom } = axisHeader(range, 'day');
    expect(bottom.map((s) => s.label)).toEqual(['30', '31', '1']);
    expect(bottom[2].left).toBe(2 * DAY_WIDTH.day);
    expect(top.map((s) => s.label)).toEqual(['Ekim 2026', 'Kasım 2026']);
  });
});

describe('visibleRows', () => {
  it('kapalı grubun kalemlerini gizler, boş gruba yer tutucu satır ekler', () => {
    const open = group([item(), item()]);
    const closed = group([item()], false);
    const empty = group([]);
    const rows = visibleRows([open, closed, empty]);
    expect(rows.map((r) => r.kind)).toEqual(['group', 'item', 'item', 'group', 'group', 'empty']);
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
  });
});

describe('monthTicks', () => {
  it('ay başlarını verir, sınırı aşarsa seyreltir', () => {
    const start = day('2026-07-24T00:00');
    const end = day('2028-07-13T00:00');
    const all = monthTicks(start, end, 100);
    expect(all[0].label).toBe('Ağu 2026');
    expect(all.at(-1)?.label).toBe('Tem 2028');
    expect(all).toHaveLength(24);
    const few = monthTicks(start, end, 8);
    expect(few.length).toBeLessThanOrEqual(8);
    expect(few.map((t) => t.label).slice(0, 2)).toEqual(['Ağu 2026', 'Kas 2026']);
  });
});
