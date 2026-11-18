// Periyot takibi hesapları (örn. "Kalıpçı işe başlamadan itibaren 15 günde 1 döküm yapmalı").
// Kural: başlangıçtan ya da son kayıttan sonra en geç `intervalDays` gün içinde yeni kayıt olmalı.
// Son gün geçince aşım başlar; bir sonraki kayda (yoksa bugüne) kadar sürer.
// Kesinti: perDay → aşımdaki her gün × tutar, perPeriod → kaçırılan her periyot × tutar.
// Saf fonksiyonlar; "bugün" parametre olarak verilir. Tarihler "yyyy-aa-gg".
import type { ISODateTime, PenaltyMode, Tracker } from '../types';
import type { CheckResult } from './validation';
import { dayNumber, isoFromDay } from '../utils/date';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_LENGTH = 10;
/** Son güne bu kadar ya da daha az gün kaldıysa "yaklaşıyor" uyarısı */
export const DUE_SOON_DAYS = 3;

export const PENALTY_MODE_LABELS: Record<PenaltyMode, string> = {
  perDay: 'Geciken her gün için',
  perPeriod: 'Kaçırılan her periyot için',
};

/** "yyyy-aa-gg" → tam gün sayısı; geçersizse null. */
export function dayOf(date: string): number | null {
  if (!DATE_PATTERN.test(date)) return null;
  return dayNumber(`${date}T00:00`);
}

/** Tam gün sayısı → "yyyy-aa-gg". */
export const dateOfDay = (day: number): string => isoFromDay(day).slice(0, DATE_LENGTH);

/** Süre aşımı: son gün geçtiği hâlde kayıt girilmemiş dönem. */
export interface Violation {
  /** Kaydın en geç yapılması gereken gün */
  deadline: string;
  /** Aşımı kapatan kaydın günü; henüz kayıt yoksa undefined (aşım sürüyor) */
  resolvedOn?: string;
  /** Son günden sonra geçen gün sayısı */
  lateDays: number;
  /** Kaçırılan periyot sayısı */
  missedPeriods: number;
  penalty: number;
}

export type TrackerState = 'notStarted' | 'ok' | 'dueSoon' | 'overdue' | 'ended';

export const TRACKER_STATE_LABELS: Record<TrackerState, string> = {
  notStarted: 'Başlamadı',
  ok: 'Zamanında',
  dueSoon: 'Son gün yaklaşıyor',
  overdue: 'Süre aşıldı',
  ended: 'Takip bitti',
};

export interface TrackerReport {
  state: TrackerState;
  /** Değerlendirmeye giren son kayıt */
  lastEvent?: string;
  /** Bir sonraki kaydın en geç günü; takip bittiyse undefined */
  nextDeadline?: string;
  /** Son güne kalan gün (negatif: aşım) */
  daysLeft?: number;
  violations: Violation[];
  totalLateDays: number;
  totalMissed: number;
  totalPenalty: number;
  /** Değerlendirmeye giren kayıt sayısı */
  eventCount: number;
}

/** Bir aralık (son kayıttan sonraki gün sayısı) için aşım; aşım yoksa null. */
function violationFor(
  tracker: Tracker,
  anchor: number,
  elapsed: number,
  resolvedOn?: number,
): Violation | null {
  const interval = tracker.intervalDays;
  if (elapsed <= interval) return null;
  const lateDays = elapsed - interval;
  // 16. günde yapılan döküm 1, 31. günde yapılan 2 periyot kaçırmış sayılır.
  const missedPeriods = Math.ceil(elapsed / interval) - 1;
  const units = tracker.penaltyMode === 'perDay' ? lateDays : missedPeriods;
  return {
    deadline: dateOfDay(anchor + interval),
    resolvedOn: resolvedOn === undefined ? undefined : dateOfDay(resolvedOn),
    lateDays,
    missedPeriods,
    penalty: units * tracker.penaltyAmount,
  };
}

/** Takibin bugüne (ya da bitiş tarihine) kadar değerlendirmesi. */
export function trackerReport(tracker: Tracker, now: ISODateTime): TrackerReport {
  const start = dayOf(tracker.start);
  const today = dayNumber(now);
  const end = tracker.end ? dayOf(tracker.end) : null;
  const empty: TrackerReport = {
    state: 'notStarted',
    violations: [],
    totalLateDays: 0,
    totalMissed: 0,
    totalPenalty: 0,
    eventCount: 0,
  };
  if (start === null || today === null || tracker.intervalDays <= 0) return empty;

  const todayDay = Math.floor(today);
  if (todayDay < start) {
    return { ...empty, nextDeadline: dateOfDay(start + tracker.intervalDays) };
  }

  const ended = end !== null && todayDay > end;
  const limit = ended ? end : todayDay;
  const days = [
    ...new Set(
      tracker.events
        .map((event) => dayOf(event.date))
        .filter((day): day is number => day !== null && day >= start && day <= limit),
    ),
  ].sort((a, b) => a - b);

  const violations: Violation[] = [];
  let anchor = start;
  for (const day of days) {
    const violation = violationFor(tracker, anchor, day - anchor, day);
    if (violation) violations.push(violation);
    anchor = day;
  }
  const open = violationFor(tracker, anchor, limit - anchor);
  if (open) violations.push(open);

  const sum = (pick: (v: Violation) => number) => violations.reduce((t, v) => t + pick(v), 0);
  const deadline = anchor + tracker.intervalDays;
  const daysLeft = deadline - todayDay;
  let state: TrackerState = 'ok';
  if (ended) state = 'ended';
  else if (daysLeft < 0) state = 'overdue';
  else if (daysLeft <= DUE_SOON_DAYS) state = 'dueSoon';

  return {
    state,
    lastEvent: days.length > 0 ? dateOfDay(days[days.length - 1]) : undefined,
    nextDeadline: ended ? undefined : dateOfDay(deadline),
    daysLeft: ended ? undefined : daysLeft,
    violations,
    totalLateDays: sum((v) => v.lateDays),
    totalMissed: sum((v) => v.missedPeriods),
    totalPenalty: sum((v) => v.penalty),
    eventCount: days.length,
  };
}

/** Kartlar için: süresi aşılmış takip sayısı ve toplam kesinti. */
export function trackersSummary(trackers: Tracker[], now: ISODateTime) {
  const reports = trackers.map((tracker) => trackerReport(tracker, now));
  return {
    overdue: reports.filter((r) => r.state === 'overdue').length,
    dueSoon: reports.filter((r) => r.state === 'dueSoon').length,
    totalPenalty: reports.reduce((total, r) => total + r.totalPenalty, 0),
  };
}

/** "5 gün kaldı" / "Bugün son gün" / "3 gün aşıldı" */
export function daysLeftLabel(days: number): string {
  if (days > 0) return `${days} gün kaldı`;
  if (days === 0) return 'Bugün son gün';
  return `${-days} gün aşıldı`;
}

const currency = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 2,
});

/** "₺1.250,00" */
export function formatMoney(value: number): string {
  return currency.format(value);
}

/** Takipte formdan düzenlenen alanlar (kayıtlar hariç). */
export type TrackerDraft = Omit<Tracker, 'id' | 'events'>;

/** Takip tanımı kuralları: ad ve sorumlu dolu, periyot ≥ 1 tam gün, tutar ≥ 0, bitiş ≥ başlangıç. */
export function checkTracker(draft: TrackerDraft): CheckResult {
  if (draft.name.trim() === '') return { ok: false, message: 'Takip adı boş olamaz' };
  if (draft.responsible.trim() === '') return { ok: false, message: 'Sorumlu boş olamaz' };
  if (draft.eventLabel.trim() === '') return { ok: false, message: 'Kayıt adı boş olamaz' };
  if (dayOf(draft.start) === null)
    return { ok: false, message: 'Geçerli bir başlangıç tarihi girin' };
  // Boş bitiş = süresiz takip
  const end = draft.end || undefined;
  if (end !== undefined && dayOf(end) === null) {
    return { ok: false, message: 'Geçerli bir bitiş tarihi girin' };
  }
  if (end !== undefined && end < draft.start) {
    return { ok: false, message: 'Bitiş tarihi başlangıçtan önce olamaz' };
  }
  if (!Number.isInteger(draft.intervalDays) || draft.intervalDays < 1) {
    return { ok: false, message: 'Periyot en az 1 tam gün olmalı' };
  }
  if (!Number.isFinite(draft.penaltyAmount) || draft.penaltyAmount < 0) {
    return { ok: false, message: 'Kesinti tutarı negatif olamaz' };
  }
  return { ok: true };
}

/** Yeni kayıt tarihi: geçerli, takip başlangıcından önce ve bugünden sonra olamaz. */
export function checkEventDate(tracker: Tracker, date: string, now: ISODateTime): CheckResult {
  if (dayOf(date) === null) return { ok: false, message: 'Geçerli bir tarih girin' };
  if (date < tracker.start) {
    return { ok: false, message: 'Tarih takip başlangıcından önce olamaz' };
  }
  if (date > now.slice(0, DATE_LENGTH)) {
    return { ok: false, message: 'İleri tarihli kayıt girilemez' };
  }
  return { ok: true };
}
