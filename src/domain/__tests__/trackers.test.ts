// Periyot takibi hesap testleri: son gün, aşım, kaçırılan periyot, kesinti ve doğrulama.
import { describe, expect, it } from 'vitest';
import type { Tracker } from '../../types';
import {
  checkEventDate,
  checkTracker,
  daysLeftLabel,
  trackerReport,
  trackersSummary,
} from '../trackers';

const base: Tracker = {
  id: 't1',
  name: 'Döküm takibi',
  responsible: 'Kalıpçı',
  eventLabel: 'Döküm',
  start: '2026-11-01',
  intervalDays: 15,
  penaltyMode: 'perDay',
  penaltyAmount: 1000,
  events: [],
};

const withEvents = (dates: string[], patch: Partial<Tracker> = {}): Tracker => ({
  ...base,
  ...patch,
  events: dates.map((date, i) => ({ id: `e${i}`, date })),
});

describe('trackerReport', () => {
  it('başlangıçtan önce: başlamadı, ilk son gün başlangıç + periyot', () => {
    const r = trackerReport(base, '2026-10-20T10:00');
    expect(r.state).toBe('notStarted');
    expect(r.nextDeadline).toBe('2026-11-16');
    expect(r.totalPenalty).toBe(0);
  });

  it('son gün dahil süre içinde: aşım yok, kalan gün doğru', () => {
    const r = trackerReport(base, '2026-11-10T09:00');
    expect(r.state).toBe('ok');
    expect(r.nextDeadline).toBe('2026-11-16');
    expect(r.daysLeft).toBe(6);
    expect(r.violations).toEqual([]);
  });

  it('son güne 3 gün veya daha az kaldıysa yaklaşıyor', () => {
    expect(trackerReport(base, '2026-11-13T09:00').state).toBe('dueSoon');
    expect(trackerReport(base, '2026-11-16T23:00').state).toBe('dueSoon');
  });

  it('hiç döküm yoksa son günden sonraki her gün aşım (süren aşım)', () => {
    const r = trackerReport(base, '2026-11-20T09:00');
    expect(r.state).toBe('overdue');
    expect(r.daysLeft).toBe(-4);
    expect(r.violations).toEqual([
      {
        deadline: '2026-11-16',
        resolvedOn: undefined,
        lateDays: 4,
        missedPeriods: 1,
        penalty: 4000,
      },
    ]);
  });

  it('dökümler son günü sıfırlar; geç yapılan döküm aşımı kapatır', () => {
    // 01.11 → 10.11 (9 gün) → 30.11 (20 gün: 5 gün aşım) → bugün 05.12 (5 gün)
    const r = trackerReport(withEvents(['2026-11-30', '2026-11-10']), '2026-12-05T12:00');
    expect(r.lastEvent).toBe('2026-11-30');
    expect(r.nextDeadline).toBe('2026-12-15');
    expect(r.state).toBe('ok');
    expect(r.violations).toEqual([
      {
        deadline: '2026-11-25',
        resolvedOn: '2026-11-30',
        lateDays: 5,
        missedPeriods: 1,
        penalty: 5000,
      },
    ]);
    expect(r.totalLateDays).toBe(5);
    expect(r.eventCount).toBe(2);
  });

  it('periyot başına kesinti: 16. gün 1, 30. gün 1, 31. gün 2 periyot kaçırılmış', () => {
    const perPeriod = { penaltyMode: 'perPeriod' as const, penaltyAmount: 10000 };
    const missed = (date: string) =>
      trackerReport(withEvents([date], perPeriod), `${date}T12:00`).violations[0];
    expect(
      trackerReport(withEvents(['2026-11-16'], perPeriod), '2026-11-16T12:00').violations,
    ).toEqual([]);
    expect(missed('2026-11-17')).toMatchObject({ lateDays: 1, missedPeriods: 1, penalty: 10000 });
    expect(missed('2026-12-01')).toMatchObject({ lateDays: 15, missedPeriods: 1, penalty: 10000 });
    expect(missed('2026-12-02')).toMatchObject({ lateDays: 16, missedPeriods: 2, penalty: 20000 });
  });

  it('aynı gün iki kayıt tek sayılır; başlangıç öncesi ve ileri tarihli kayıt yok sayılır', () => {
    const r = trackerReport(
      withEvents(['2026-10-01', '2026-11-05', '2026-11-05', '2026-12-30']),
      '2026-11-10T09:00',
    );
    expect(r.eventCount).toBe(1);
    expect(r.lastEvent).toBe('2026-11-05');
  });

  it('bitiş tarihi geçince takip biter, aşım bitişe kadar hesaplanır', () => {
    const r = trackerReport({ ...base, end: '2026-11-20' }, '2027-01-01T09:00');
    expect(r.state).toBe('ended');
    expect(r.nextDeadline).toBeUndefined();
    expect(r.totalLateDays).toBe(4);
  });

  it('özet: aşımdaki takip sayısı ve toplam kesinti', () => {
    const summary = trackersSummary(
      [base, withEvents(['2026-11-18'], { id: 't2' })],
      '2026-11-20T09:00',
    );
    expect(summary).toEqual({ overdue: 1, dueSoon: 0, totalPenalty: 4000 + 2000 });
  });
});

describe('doğrulama', () => {
  const draft = { ...base } as Partial<Tracker>;
  delete draft.id;
  delete draft.events;
  const valid = draft as Omit<Tracker, 'id' | 'events'>;

  it('geçerli tanım kabul edilir, hatalılar mesajla reddedilir', () => {
    expect(checkTracker(valid).ok).toBe(true);
    expect(checkTracker({ ...valid, responsible: ' ' })).toMatchObject({ ok: false });
    expect(checkTracker({ ...valid, intervalDays: 0 })).toMatchObject({ ok: false });
    expect(checkTracker({ ...valid, intervalDays: 2.5 })).toMatchObject({ ok: false });
    expect(checkTracker({ ...valid, penaltyAmount: -1 })).toMatchObject({ ok: false });
    expect(checkTracker({ ...valid, end: '2026-10-01' })).toMatchObject({ ok: false });
  });

  it('kayıt tarihi başlangıçtan önce ya da ileri tarihli olamaz', () => {
    expect(checkEventDate(base, '2026-11-05', '2026-11-10T09:00').ok).toBe(true);
    expect(checkEventDate(base, '2026-11-10', '2026-11-10T09:00').ok).toBe(true);
    expect(checkEventDate(base, '2026-10-31', '2026-11-10T09:00').ok).toBe(false);
    expect(checkEventDate(base, '2026-11-11', '2026-11-10T09:00').ok).toBe(false);
    expect(checkEventDate(base, '', '2026-11-10T09:00').ok).toBe(false);
  });

  it('kalan gün etiketi', () => {
    expect(daysLeftLabel(5)).toBe('5 gün kaldı');
    expect(daysLeftLabel(0)).toBe('Bugün son gün');
    expect(daysLeftLabel(-3)).toBe('3 gün aşıldı');
  });
});
