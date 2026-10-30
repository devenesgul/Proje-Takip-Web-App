// Tarih biçimlendirme: ISO metin (yerel zaman, "2026-07-24T08:00") ↔ ekranda "24.07.2026 08:00".
// Saat dilimi kaymasını önlemek için Date nesnesine çevrilmeden metin üzerinden çalışılır.
import type { ISODateTime } from '../types';

const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;
/** "yyyy-aa-ggTSS:dd" uzunluğu */
const ISO_MINUTES_LENGTH = 16;

/** ISO → "gg.aa.yyyy SS:dd". Boşsa boş metin; tanınmayan biçim olduğu gibi döner. */
export function formatDateTime(value?: ISODateTime): string {
  if (!value) return '';
  const match = ISO_PATTERN.exec(value);
  if (!match) return value;
  const [, year, month, day, hour, minute] = match;
  return `${day}.${month}.${year} ${hour}:${minute}`;
}

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Yalnızca tarih "yyyy-aa-gg" → "gg.aa.yyyy". Tanınmayan biçim olduğu gibi döner. */
export function formatDate(value?: string): string {
  if (!value) return '';
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  return `${day}.${month}.${year}`;
}

/** ISO → <input type="datetime-local"> değeri. */
export function toInputValue(value?: ISODateTime): string {
  return value ? value.slice(0, ISO_MINUTES_LENGTH) : '';
}

/** <input type="datetime-local"> değeri → ISO (saniyeler atılır). Boşsa undefined. */
export function fromInputValue(value: string): ISODateTime | undefined {
  return value === '' ? undefined : value.slice(0, ISO_MINUTES_LENGTH);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Bugünün tarihi "yyyy-aa-gg" (yerel zaman), dosya adları için. */
export function todayStamp(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Date → ISO yerel zaman "yyyy-aa-ggTSS:dd". */
export function toIso(date: Date): ISODateTime {
  return `${todayStamp(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const MS_PER_DAY = 86_400_000;
const MINUTES_PER_DAY = 1440;
const MINUTES_PER_HOUR = 60;
const DAYS_PER_WEEK = 7;

/**
 * ISO → takvim günü sayısı (1970-01-01 = 0), saat kesirli kısım olarak eklenir.
 * Yerel tarih bileşenleri UTC gibi hesaplandığından yaz saati geçişleri günü kaydırmaz.
 * Tanınmayan biçimde null döner.
 */
export function dayNumber(value: ISODateTime): number | null {
  const match = ISO_PATTERN.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const days = Date.UTC(year, month - 1, day) / MS_PER_DAY;
  return days + (hour * MINUTES_PER_HOUR + minute) / MINUTES_PER_DAY;
}

export interface DayParts {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
  /** 0 = Pazartesi … 6 = Pazar */
  weekday: number;
}

/** Tam gün sayısını (dayNumber çıktısı) takvim bileşenlerine çevirir. */
export function dayParts(dayIndex: number): DayParts {
  const date = new Date(Math.floor(dayIndex) * MS_PER_DAY);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    weekday: (date.getUTCDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK,
  };
}

/** Tam gün sayısı → o günün başlangıcı ISO "yyyy-aa-ggT00:00". */
export function isoFromDay(dayIndex: number): ISODateTime {
  const { year, month, day } = dayParts(dayIndex);
  return `${year}-${pad(month)}-${pad(day)}T00:00`;
}

export const MONTH_NAMES = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

export const MONTH_SHORT_NAMES = MONTH_NAMES.map((name) => name.slice(0, 3));

/** "gg.aa" kısa gün etiketi (hafta başlıkları için). */
export function formatDayMonth(parts: DayParts): string {
  return `${pad(parts.day)}.${pad(parts.month)}`;
}
