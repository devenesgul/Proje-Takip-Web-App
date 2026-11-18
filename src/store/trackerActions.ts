// Periyot takibi aksiyonları: proje üzerinde saf dönüşümler (Project → Project).
// Doğrulama domain/trackers.ts'teki kurallarla yapılır; geçersiz girişte proje değişmez.
import { checkEventDate, checkTracker, type TrackerDraft } from '../domain/trackers';
import type { CheckResult } from '../domain/validation';
import type { ISODateTime, Project, Tracker } from '../types';

type Result = { project: Project; check: CheckResult };

const OK: CheckResult = { ok: true };

function clean(draft: TrackerDraft): TrackerDraft {
  const note = draft.note?.trim();
  return {
    ...draft,
    name: draft.name.trim(),
    responsible: draft.responsible.trim(),
    eventLabel: draft.eventLabel.trim(),
    end: draft.end || undefined,
    note: note ? note : undefined,
  };
}

function mapTracker(project: Project, trackerId: string, fn: (t: Tracker) => Tracker): Project {
  return {
    ...project,
    trackers: project.trackers.map((t) => (t.id === trackerId ? fn(t) : t)),
  };
}

export function addTracker(project: Project, id: string, draft: TrackerDraft): Result {
  const check = checkTracker(draft);
  if (!check.ok) return { project, check };
  const tracker: Tracker = { ...clean(draft), id, events: [] };
  return { project: { ...project, trackers: [...project.trackers, tracker] }, check: OK };
}

export function updateTracker(project: Project, trackerId: string, draft: TrackerDraft): Result {
  const check = checkTracker(draft);
  if (!check.ok) return { project, check };
  if (!project.trackers.some((t) => t.id === trackerId)) {
    return { project, check: { ok: false, message: 'Takip bulunamadı' } };
  }
  return {
    project: mapTracker(project, trackerId, (t) => ({ ...t, ...clean(draft) })),
    check: OK,
  };
}

export function removeTracker(project: Project, trackerId: string): Project {
  return { ...project, trackers: project.trackers.filter((t) => t.id !== trackerId) };
}

/** Kayıt ekler; kayıtlar tarih sırasında tutulur. */
export function addTrackerEvent(
  project: Project,
  trackerId: string,
  eventId: string,
  date: string,
  note: string,
  now: ISODateTime,
): Result {
  const tracker = project.trackers.find((t) => t.id === trackerId);
  if (!tracker) return { project, check: { ok: false, message: 'Takip bulunamadı' } };
  const check = checkEventDate(tracker, date, now);
  if (!check.ok) return { project, check };
  const text = note.trim();
  const event = { id: eventId, date, note: text === '' ? undefined : text };
  const events = [...tracker.events, event].sort((a, b) => (a.date < b.date ? -1 : 1));
  return { project: mapTracker(project, trackerId, (t) => ({ ...t, events })), check: OK };
}

export function removeTrackerEvent(project: Project, trackerId: string, eventId: string): Project {
  return mapTracker(project, trackerId, (t) => ({
    ...t,
    events: t.events.filter((e) => e.id !== eventId),
  }));
}
