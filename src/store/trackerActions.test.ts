// Periyot takibi store aksiyonları: ekle/düzenle/sil, kayıt ekleme doğrulaması ve geri alma.
import { beforeEach, describe, expect, it } from 'vitest';
import { sampleProject } from '../data/sampleProject';
import type { TrackerDraft } from '../domain/trackers';
import { useProjectStore } from './projectStore';

const store = () => useProjectStore.getState();
const project = () => store().project;

const draft: TrackerDraft = {
  name: '  Döküm takibi ',
  responsible: 'Kalıpçı',
  eventLabel: 'Döküm',
  start: '2026-01-01',
  intervalDays: 15,
  penaltyMode: 'perDay',
  penaltyAmount: 500,
};

beforeEach(() => store().replaceProject({ ...sampleProject, trackers: [] }));

describe('periyot takibi aksiyonları', () => {
  it('takip eklenir (metinler kırpılır), geçersiz tanım eklenmez', () => {
    expect(store().addTracker(draft).ok).toBe(true);
    expect(project().trackers).toHaveLength(1);
    expect(project().trackers[0]).toMatchObject({ name: 'Döküm takibi', events: [] });

    expect(store().addTracker({ ...draft, intervalDays: 0 }).ok).toBe(false);
    expect(project().trackers).toHaveLength(1);
  });

  it('kayıtlar tarih sırasıyla tutulur, ileri tarihli kayıt reddedilir, silinebilir', () => {
    store().addTracker(draft);
    const id = project().trackers[0].id;
    store().addTrackerEvent(id, '2026-02-10', 'Kat 2');
    store().addTrackerEvent(id, '2026-01-20', '');
    expect(project().trackers[0].events.map((e) => [e.date, e.note])).toEqual([
      ['2026-01-20', undefined],
      ['2026-02-10', 'Kat 2'],
    ]);
    expect(store().addTrackerEvent(id, '2999-01-01', '').ok).toBe(false);

    store().removeTrackerEvent(id, project().trackers[0].events[0].id);
    expect(project().trackers[0].events).toHaveLength(1);
  });

  it('düzenleme kayıtları korur; silme geri alınabilir', () => {
    store().addTracker(draft);
    const id = project().trackers[0].id;
    store().addTrackerEvent(id, '2026-01-20', '');
    expect(store().updateTracker(id, { ...draft, intervalDays: 10, end: '' }).ok).toBe(true);
    expect(project().trackers[0]).toMatchObject({ intervalDays: 10, end: undefined });
    expect(project().trackers[0].events).toHaveLength(1);

    store().removeTracker(id);
    expect(project().trackers).toHaveLength(0);
    store().undo();
    expect(project().trackers[0].id).toBe(id);
  });
});
