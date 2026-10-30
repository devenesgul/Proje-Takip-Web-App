// Hızlı filtreler (Tümü / Bu hafta / Gecikenler / Devam eden / Bitenler) ve "bu hafta yapılacaklar".
// Hafta pazartesi 00:00'da başlar, sonraki pazartesi 00:00'da biter.
import type { Group, ISODateTime, Item } from '../types';
import { dayNumber, dayParts, isoFromDay } from '../utils/date';
import { effectiveStatus, isDelayed } from './schedule';
import { MAX_PERCENT } from './validation';

export type QuickFilter = 'all' | 'thisWeek' | 'delayed' | 'inProgress' | 'done';

export const QUICK_FILTER_LABELS: Record<QuickFilter, string> = {
  all: 'Tümü',
  thisWeek: 'Bu hafta',
  delayed: 'Gecikenler',
  inProgress: 'Devam eden',
  done: 'Bitenler',
};

const DAYS_PER_WEEK = 7;

export interface Period {
  start: ISODateTime;
  /** Hariç uç */
  end: ISODateTime;
}

/** `now` tarihinin içinde bulunduğu hafta (pazartesi–pazartesi). */
export function weekOf(now: ISODateTime): Period {
  const today = Math.floor(dayNumber(now) ?? 0);
  const monday = today - dayParts(today).weekday;
  return { start: isoFromDay(monday), end: isoFromDay(monday + DAYS_PER_WEEK) };
}

/**
 * Bu hafta yapılacak mı? Planlanan aralığı bu haftayla kesişen ve bitmemiş kalem.
 * Tek tarih girilmişse o tarih tek günlük aralık sayılır; hiç tarih yoksa hayır.
 */
export function isThisWeek(item: Item, now: ISODateTime): boolean {
  if (item.progress >= MAX_PERCENT) return false;
  const start = item.planned.start ?? item.planned.end;
  const end = item.planned.end ?? item.planned.start;
  if (!start || !end) return false;
  const week = weekOf(now);
  return start < week.end && end >= week.start;
}

export function matchesFilter(item: Item, filter: QuickFilter, now: ISODateTime): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'thisWeek':
      return isThisWeek(item, now);
    case 'delayed':
      return isDelayed(item, now);
    case 'inProgress':
      return effectiveStatus(item, now) === 'inProgress';
    case 'done':
      return effectiveStatus(item, now) === 'done';
  }
}

/** Filtreye uyan kalem sayısı (kartlar ve filtre düğmeleri için). */
export function countMatching(groups: Group[], filter: QuickFilter, now: ISODateTime): number {
  return groups.flatMap((g) => g.items).filter((item) => matchesFilter(item, filter, now)).length;
}
