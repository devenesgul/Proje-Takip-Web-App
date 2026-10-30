// Gantt zaman ekseni hesapları: görünür tarih aralığı, tarih → piksel, çubuk geometrisi,
// grup kapsamı ve başlık bölümleri (yıl/ay/hafta/gün). Saf fonksiyonlar.
import type { GanttZoom, Group, ISODateTime, Item, Project } from '../types';
import {
  dayNumber,
  dayParts,
  formatDayMonth,
  MONTH_NAMES,
  MONTH_SHORT_NAMES,
  MS_PER_DAY,
  type DayParts,
} from '../utils/date';

const DAYS_PER_WEEK = 7;
const MONTHS_PER_YEAR = 12;

/** Zoom düzeyine göre bir günün piksel genişliği. */
export const DAY_WIDTH: Record<GanttZoom, number> = { day: 32, week: 8, month: 2.5 };

/** Aralığın iki ucuna eklenen boşluk (gün). */
export const RANGE_PADDING_DAYS = 7;

/** Çok kısa işlerin de görünmesi için en küçük çubuk genişliği (px). */
export const MIN_BAR_WIDTH = 3;

export interface TimelineRange {
  /** İlk görünen günün başlangıcı (tam gün sayısı) */
  startDay: number;
  /** Son görünen günün bitişi (tam gün sayısı, hariç) */
  endDay: number;
}

export interface Span {
  start: ISODateTime;
  end: ISODateTime;
}

export interface Segment {
  key: string;
  label: string;
  left: number;
  width: number;
}

export interface Geometry {
  left: number;
  width: number;
}

/** Grubun kalemlerinin planlanan tarihlerini kapsayan aralık; tarihli kalem yoksa null. */
export function groupSpan(group: Group): Span | null {
  const starts = group.items.map((i) => i.planned.start).filter((d): d is string => !!d);
  const ends = group.items.map((i) => i.planned.end).filter((d): d is string => !!d);
  if (starts.length === 0 || ends.length === 0) return null;
  return {
    start: starts.reduce((a, b) => (a < b ? a : b)),
    end: ends.reduce((a, b) => (a > b ? a : b)),
  };
}

/** Haftalık görünümde pazartesiye, aylık görünümde ayın 1'ine yuvarlar. */
function alignStart(day: number, zoom: GanttZoom): number {
  const parts = dayParts(day);
  if (zoom === 'week') return day - parts.weekday;
  if (zoom === 'month') return day - (parts.day - 1);
  return day;
}

/** Haftalık görünümde pazar sonrasına, aylık görünümde ay sonrasına yuvarlar (hariç uç). */
function alignEnd(day: number, zoom: GanttZoom): number {
  const parts = dayParts(day);
  if (zoom === 'week') return day + (DAYS_PER_WEEK - parts.weekday);
  if (zoom === 'month') return Date.UTC(parts.year, parts.month, 1) / MS_PER_DAY;
  return day + 1;
}

/** Proje ve tüm kalem tarihlerini, iki uca boşluk ekleyerek kapsayan görünür aralık. */
export function timelineRange(project: Project, zoom: GanttZoom): TimelineRange {
  const dates: ISODateTime[] = [project.start, project.end];
  for (const group of project.groups) {
    for (const item of group.items) {
      if (item.planned.start) dates.push(item.planned.start);
      if (item.planned.end) dates.push(item.planned.end);
    }
  }
  const days = dates.map(dayNumber).filter((d): d is number => d !== null);
  const min = Math.floor(Math.min(...days)) - RANGE_PADDING_DAYS;
  const max = Math.floor(Math.max(...days)) + RANGE_PADDING_DAYS;
  return { startDay: alignStart(min, zoom), endDay: alignEnd(max, zoom) };
}

export function timelineWidth(range: TimelineRange, zoom: GanttZoom): number {
  return (range.endDay - range.startDay) * DAY_WIDTH[zoom];
}

/** Tarihin yatay konumu (px); okunamazsa null. */
export function xOf(date: ISODateTime, range: TimelineRange, zoom: GanttZoom): number | null {
  const day = dayNumber(date);
  return day === null ? null : (day - range.startDay) * DAY_WIDTH[zoom];
}

/** Başlangıç–bitiş çubuğunun konumu ve genişliği; tarihlerden biri yoksa null. */
export function barGeometry(
  span: Partial<Span>,
  range: TimelineRange,
  zoom: GanttZoom,
): Geometry | null {
  if (!span.start || !span.end) return null;
  const left = xOf(span.start, range, zoom);
  const right = xOf(span.end, range, zoom);
  if (left === null || right === null) return null;
  return { left, width: Math.max(MIN_BAR_WIDTH, right - left) };
}

/** Kalemin planlanan çubuğu. */
export function itemBar(item: Item, range: TimelineRange, zoom: GanttZoom): Geometry | null {
  return barGeometry(item.planned, range, zoom);
}

type SegmentKey = (parts: DayParts, day: number) => { key: string; label: string };

const byYear: SegmentKey = (p) => ({ key: `${p.year}`, label: `${p.year}` });
const byMonth: SegmentKey = (p) => ({
  key: `${p.year}-${p.month}`,
  label: `${MONTH_NAMES[p.month - 1]} ${p.year}`,
});
const byShortMonth: SegmentKey = (p) => ({
  key: `${p.year}-${p.month}`,
  label: MONTH_SHORT_NAMES[p.month - 1],
});
const byWeek: SegmentKey = (p, day) => {
  const monday = day - p.weekday;
  return { key: `w${monday}`, label: formatDayMonth(dayParts(monday)) };
};
const byDay: SegmentKey = (p, day) => ({ key: `d${day}`, label: `${p.day}` });

/** Ardışık günleri aynı anahtara göre gruplayarak başlık bölümleri üretir. */
function segments(range: TimelineRange, zoom: GanttZoom, keyOf: SegmentKey): Segment[] {
  const width = DAY_WIDTH[zoom];
  const result: Segment[] = [];
  for (let day = range.startDay; day < range.endDay; day++) {
    const { key, label } = keyOf(dayParts(day), day);
    const last = result.at(-1);
    if (last && last.key === key) {
      last.width += width;
    } else {
      result.push({ key, label, left: (day - range.startDay) * width, width });
    }
  }
  return result;
}

export interface AxisHeader {
  /** Üst satır: ay/hafta/gün görünümünde ay, ay görünümünde yıl */
  top: Segment[];
  /** Alt satır: gün, hafta veya ay; dikey ızgara çizgileri de bunlardan çizilir */
  bottom: Segment[];
}

export function axisHeader(range: TimelineRange, zoom: GanttZoom): AxisHeader {
  switch (zoom) {
    case 'day':
      return { top: segments(range, zoom, byMonth), bottom: segments(range, zoom, byDay) };
    case 'week':
      return { top: segments(range, zoom, byMonth), bottom: segments(range, zoom, byWeek) };
    case 'month':
      return { top: segments(range, zoom, byYear), bottom: segments(range, zoom, byShortMonth) };
  }
}

export interface Tick {
  day: number;
  label: string;
}

/** Aralığa sığacak sayıda ay başı işareti; en fazla `maxTicks` olacak şekilde 1/2/3/6/12 ay arayla. */
export function monthTicks(startDay: number, endDay: number, maxTicks: number): Tick[] {
  const steps = [1, 2, 3, 6, 12];
  const first = dayParts(startDay);
  const months: Tick[] = [];
  for (let i = 0; ; i++) {
    const year = first.year + Math.floor((first.month - 1 + i) / MONTHS_PER_YEAR);
    const month = ((first.month - 1 + i) % MONTHS_PER_YEAR) + 1;
    const day = Date.UTC(year, month - 1, 1) / MS_PER_DAY;
    if (day > endDay) break;
    if (day >= startDay) {
      months.push({ day, label: `${MONTH_SHORT_NAMES[month - 1]} ${year}` });
    }
  }
  const step = steps.find((s) => Math.ceil(months.length / s) <= maxTicks) ?? MONTHS_PER_YEAR;
  return months.filter((_, index) => index % step === 0);
}
