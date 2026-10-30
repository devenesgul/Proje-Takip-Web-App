// S-eğrisi hesapları (PROJECT.md Bölüm 3.2): planlanan ilerleme, sapma, eğri verisi ve ilerleme kayıtları.
// Planlanan ilerleme her kalem için başlangıç–bitiş arasında doğrusal kabul edilir; bu yüzden proje
// eğrisi parçalı doğrusaldır ve yalnızca kalem başlangıç/bitiş anlarında nokta almak eğriyi birebir verir.
import type { Group, ISODateTime, Item, ProgressSnapshot } from '../types';
import { dayNumber } from '../utils/date';
import { overallProgress, round2 } from './progress';

const PERCENT = 100;
/** "yyyy-aa-gg" uzunluğu: aynı güne ait kayıtları bulmak için */
const DATE_PREFIX_LENGTH = 10;

/**
 * kalemPlan(t): t anında kalemin planlanan tamamlanma oranı (0..1).
 * Tarihi eksik veya okunamayan kalem için null (planlanamaz).
 */
export function itemPlanFraction(item: Item, t: ISODateTime): number | null {
  const { start, end } = item.planned;
  if (!start || !end) return null;
  const s = dayNumber(start);
  const e = dayNumber(end);
  const now = dayNumber(t);
  if (s === null || e === null || now === null) return null;
  if (now >= e) return 1;
  if (now <= s) return 0;
  return (now - s) / (e - s);
}

/** PlanlananGenel(t) = Σ(ağırlık × kalemPlan(t)), yüzde. Tarihsiz kalemler katkı vermez. */
export function plannedProgress(groups: Group[], t: ISODateTime): number {
  let total = 0;
  for (const item of groups.flatMap((g) => g.items)) {
    total += item.weight * (itemPlanFraction(item, t) ?? 0);
  }
  return round2(total);
}

/** Sapma = GerçekleşenGenel(bugün) − PlanlananGenel(bugün). (+) öndeyiz, (−) gerideyiz. */
export function deviation(groups: Group[], now: ISODateTime): number {
  return round2(overallProgress(groups) - plannedProgress(groups, now));
}

/** Planlanamayan (tarihi eksik) kalemlerin ağırlık toplamı: eğri %100'e ulaşmazsa açıklaması budur. */
export function unplannedWeight(groups: Group[]): number {
  const items = groups.flatMap((g) => g.items);
  return round2(
    items.filter((i) => !i.planned.start || !i.planned.end).reduce((s, i) => s + i.weight, 0),
  );
}

export interface CurvePoint {
  date: ISODateTime;
  value: number;
}

export interface SCurve {
  planned: CurvePoint[];
  actual: CurvePoint[];
}

/**
 * S-eğrisi verisi.
 * - Planlanan: proje başlangıç/bitişi ve tüm kalem başlangıç/bitiş anlarında, tarih sırasıyla.
 * - Gerçekleşen: ilerleme kayıtları (tarih sırasıyla) + şu anki genel ilerleme (son kayıttan sonraysa).
 */
export function sCurve(
  groups: Group[],
  snapshots: ProgressSnapshot[],
  projectStart: ISODateTime,
  projectEnd: ISODateTime,
  now: ISODateTime,
): SCurve {
  const breakpoints = new Set<ISODateTime>([projectStart, projectEnd]);
  for (const item of groups.flatMap((g) => g.items)) {
    if (item.planned.start && item.planned.end) {
      breakpoints.add(item.planned.start);
      breakpoints.add(item.planned.end);
    }
  }
  const planned = [...breakpoints]
    .filter((d) => dayNumber(d) !== null)
    .sort()
    .map((date) => ({ date, value: plannedProgress(groups, date) }));

  const actual = [...snapshots]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((s) => ({ date: s.date, value: s.overallProgress }));
  const last = actual.at(-1);
  if (!last || last.date < now) actual.push({ date: now, value: overallProgress(groups) });

  return { planned, actual };
}

/**
 * Eğrinin `date` anındaki değeri: noktalar arasında doğrusal ara değer (çizilen çizgiyle aynı).
 * İlk noktadan önce veya son noktadan sonra null (çizgi orada yok).
 */
export function valueAt(points: CurvePoint[], date: ISODateTime): number | null {
  const t = dayNumber(date);
  if (t === null || points.length === 0) return null;
  for (let i = 0; i < points.length; i++) {
    const x = dayNumber(points[i].date);
    if (x === null) continue;
    if (t === x) return points[i].value;
    if (t < x) {
      if (i === 0) return null;
      const prevX = dayNumber(points[i - 1].date) ?? x;
      const ratio = x === prevX ? 1 : (t - prevX) / (x - prevX);
      return round2(points[i - 1].value + (points[i].value - points[i - 1].value) * ratio);
    }
  }
  return null;
}

/**
 * Yeni ilerleme kaydı ekler: aynı güne ait kayıt varsa onun yerine geçer (günde tek kayıt).
 * Değer son kayıtla aynıysa listeyi değiştirmez. Girdiyi değiştirmez.
 */
export function upsertSnapshot(
  snapshots: ProgressSnapshot[],
  now: ISODateTime,
  value: number,
): ProgressSnapshot[] {
  const rounded = round2(Math.min(PERCENT, Math.max(0, value)));
  const day = now.slice(0, DATE_PREFIX_LENGTH);
  const sameDay = snapshots.findIndex((s) => s.date.slice(0, DATE_PREFIX_LENGTH) === day);
  if (sameDay >= 0) {
    if (snapshots[sameDay].overallProgress === rounded) return snapshots;
    return snapshots.map((s, i) => (i === sameDay ? { date: now, overallProgress: rounded } : s));
  }
  const latest = snapshots.reduce<ProgressSnapshot | undefined>(
    (acc, s) => (!acc || s.date > acc.date ? s : acc),
    undefined,
  );
  if (latest && latest.overallProgress === rounded) return snapshots;
  return [...snapshots, { date: now, overallProgress: rounded }];
}
