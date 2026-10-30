// Geri al / Yinele ve ilerleme kaydı testleri (store üzerinden).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleProject } from '../data/sampleProject';
import { HISTORY_LIMIT } from './history';
import { useProjectStore } from './projectStore';

const store = () => useProjectStore.getState();
const project = () => store().project;
const firstGroup = () => project().groups[0];

beforeEach(() => {
  useProjectStore.setState({ project: sampleProject, past: [], future: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('geri al / yinele', () => {
  it('veri değişikliğini geri alır ve yineler', () => {
    store().updateGroup(firstGroup().id, { name: 'A' });
    store().updateGroup(firstGroup().id, { name: 'B' });
    store().undo();
    expect(firstGroup().name).toBe('A');
    store().undo();
    expect(firstGroup().name).toBe(sampleProject.groups[0].name);
    store().redo();
    store().redo();
    expect(firstGroup().name).toBe('B');
  });

  it('silinen kalemi geri getirir', () => {
    const item = firstGroup().items[0];
    store().removeItem(firstGroup().id, item.id);
    store().undo();
    expect(firstGroup().items[0]).toEqual(item);
  });

  it('yeni değişiklik yineleme geçmişini siler', () => {
    store().updateGroup(firstGroup().id, { name: 'A' });
    store().undo();
    store().updateGroup(firstGroup().id, { name: 'C' });
    expect(store().future).toHaveLength(0);
    store().redo();
    expect(firstGroup().name).toBe('C');
  });

  it('boş geçmişte hiçbir şey yapmaz', () => {
    const before = project();
    store().undo();
    store().redo();
    expect(project()).toBe(before);
  });

  it('başarısız değişiklik geçmişe yazılmaz', () => {
    store().updateItem(firstGroup().id, firstGroup().items[0].id, { weight: -5 });
    expect(store().past).toHaveLength(0);
  });

  it('görünüm değişiklikleri (tema, zoom, aç/kapat) geçmişe yazılmaz ve geri almada korunur', () => {
    store().updateGroup(firstGroup().id, { name: 'A' });
    store().setTheme('dark');
    store().setGanttZoom('day');
    store().toggleGroup(firstGroup().id);
    expect(store().past).toHaveLength(1);
    store().undo();
    expect(firstGroup().name).toBe(sampleProject.groups[0].name);
    expect(project().settings).toEqual({ theme: 'dark', ganttZoom: 'day' });
    expect(firstGroup().expanded).toBe(!sampleProject.groups[0].expanded);
  });

  it(`en fazla ${HISTORY_LIMIT} adım tutar`, () => {
    for (let i = 0; i <= HISTORY_LIMIT + 5; i++) {
      store().updateGroup(firstGroup().id, { name: `n${i}` });
    }
    expect(store().past).toHaveLength(HISTORY_LIMIT);
  });

  it('proje değiştirilince (içe aktarma/yükleme) geçmiş temizlenir', () => {
    store().updateGroup(firstGroup().id, { name: 'A' });
    store().replaceProject(sampleProject);
    expect(store().past).toHaveLength(0);
    expect(store().future).toHaveLength(0);
  });
});

describe('ilerleme kaydı', () => {
  it('tamamlanma değişince günün kaydı eklenir/güncellenir; geri almada geri döner', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 5, 10, 0)); // 05.11.2026 10:00
    const before = project().progressSnapshots;
    const item = firstGroup().items[3]; // Kat betonları, %5

    store().updateItem(firstGroup().id, item.id, { progress: 50 });
    const afterFirst = project().progressSnapshots;
    expect(afterFirst).toHaveLength(before.length + 1);
    expect(afterFirst.at(-1)?.date).toBe('2026-11-05T10:00');

    vi.setSystemTime(new Date(2026, 10, 5, 15, 30));
    store().updateItem(firstGroup().id, item.id, { progress: 60 });
    expect(project().progressSnapshots).toHaveLength(before.length + 1);
    expect(project().progressSnapshots.at(-1)?.date).toBe('2026-11-05T15:30');

    store().undo();
    store().undo();
    expect(project().progressSnapshots).toEqual(before);
  });

  it('ilerlemeyi değiştirmeyen düzenleme kayıt eklemez', () => {
    const before = project().progressSnapshots;
    store().updateGroup(firstGroup().id, { name: 'A' });
    expect(project().progressSnapshots).toBe(before);
  });
});
