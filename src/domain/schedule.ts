// Takvim hesapları (PROJECT.md Bölüm 3.2–3.3): gecikme, kalan gün, durum önerisi.
// "Şimdi" her zaman parametre olarak verilir; fonksiyonlar saftır ve saate bağlı değildir.
import type { Group, ISODateTime, Item, Status } from '../types';
import { dayNumber } from '../utils/date';
import { MAX_PERCENT } from './validation';

/**
 * Geciken = (planlanan bitiş < şimdi) VE (tamamlanma < 100) VE (durum ≠ Bitti).
 * Elle "Bitti" seçilmiş kalem gecikmiş sayılmaz. Bitiş tarihi yoksa gecikme olmaz.
 */
export function isDelayed(item: Item, now: ISODateTime): boolean {
  const end = item.planned.end;
  if (!end || end >= now) return false;
  if (item.progress >= MAX_PERCENT) return false;
  return !(item.statusManual && item.status === 'done');
}

/** Tüm geciken kalemler (grup sırasıyla). */
export function delayedItems(groups: Group[], now: ISODateTime): Item[] {
  return groups.flatMap((group) => group.items.filter((item) => isDelayed(item, now)));
}

/**
 * Kalan gün = proje bitiş günü − bugün (takvim günü, saat dikkate alınmaz).
 * Negatifse proje o kadar gün gecikmiştir. Tarih okunamazsa null.
 */
export function remainingDays(projectEnd: ISODateTime, now: ISODateTime): number | null {
  const end = dayNumber(projectEnd);
  const today = dayNumber(now);
  if (end === null || today === null) return null;
  return Math.floor(end) - Math.floor(today);
}

/** "310 gün kalan" / "Bugün bitiyor" / "5 gün gecikti" */
export function remainingDaysLabel(days: number): string {
  if (days > 0) return `${days} gün kalan`;
  if (days === 0) return 'Bugün bitiyor';
  return `${-days} gün gecikti`;
}

/**
 * Yüzde ve tarihten otomatik durum önerisi. "Beklemede" hiçbir zaman önerilmez,
 * yalnızca elle seçilir.
 */
export function suggestStatus(item: Item, now: ISODateTime): Status {
  if (item.progress >= MAX_PERCENT) return 'done';
  if (isDelayed(item, now)) return 'delayed';
  if (item.progress > 0 || (item.actual.start && item.actual.start <= now)) return 'inProgress';
  return 'notStarted';
}

/** Ekranda gösterilecek durum: elle seçildiyse o, değilse öneri. */
export function effectiveStatus(item: Item, now: ISODateTime): Status {
  return item.statusManual ? item.status : suggestStatus(item, now);
}

export const STATUS_LABELS: Record<Status, string> = {
  notStarted: 'Başlamadı',
  inProgress: 'Devam ediyor',
  done: 'Bitti',
  delayed: 'Gecikti',
  onHold: 'Beklemede',
};
