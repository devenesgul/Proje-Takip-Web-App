// projectStore aksiyon testleri: grup/kalem ekleme, güncelleme, silme, kopyalama ve doğrulama.
import { beforeEach, describe, expect, it } from 'vitest';
import { sampleProject } from '../data/sampleProject';
import { COPY_SUFFIX, NEW_GROUP_NAME, NEW_ITEM_NAME, useProjectStore } from './projectStore';

const store = () => useProjectStore.getState();
const firstGroup = () => store().project.groups[0];

beforeEach(() => {
  useProjectStore.setState({ project: sampleProject });
});

describe('grup aksiyonları', () => {
  it('grup ekler, sonuna koyar ve ID döner', () => {
    const before = store().project.groups.length;
    const id = store().addGroup();
    const groups = store().project.groups;
    expect(groups).toHaveLength(before + 1);
    expect(groups.at(-1)).toMatchObject({ id, name: NEW_GROUP_NAME, order: before, items: [] });
  });

  it('grubu günceller ve aç/kapat yapar', () => {
    const { id, expanded } = firstGroup();
    store().updateGroup(id, { name: 'Temel İşleri' });
    store().toggleGroup(id);
    expect(firstGroup()).toMatchObject({ name: 'Temel İşleri', expanded: !expanded });
  });

  it('grubu siler ve sıraları yeniden numaralar', () => {
    const { id } = firstGroup();
    store().removeGroup(id);
    const groups = store().project.groups;
    expect(groups.some((g) => g.id === id)).toBe(false);
    expect(groups.map((g) => g.order)).toEqual(groups.map((_, i) => i));
  });

  it('örnek veriyi mutasyona uğratmaz', () => {
    const snapshot = structuredClone(sampleProject);
    store().updateGroup(firstGroup().id, { name: 'X' });
    store().removeGroup(firstGroup().id);
    expect(sampleProject).toEqual(snapshot);
  });
});

describe('kalem aksiyonları', () => {
  it('kalem ekler, boş değerlerle başlatır ve grubu açar', () => {
    const { id: groupId } = firstGroup();
    store().toggleGroup(groupId);
    const itemId = store().addItem(groupId);
    const group = firstGroup();
    expect(group.expanded).toBe(true);
    expect(group.items.at(-1)).toMatchObject({
      id: itemId,
      name: NEW_ITEM_NAME,
      weight: 0,
      progress: 0,
      order: group.items.length - 1,
    });
  });

  it('kalemi günceller', () => {
    const group = firstGroup();
    const item = group.items[0];
    const result = store().updateItem(group.id, item.id, {
      name: 'Hafriyat',
      weight: 4.5,
      planned: { end: '2026-12-31T17:00' },
    });
    expect(result.ok).toBe(true);
    const updated = firstGroup().items[0];
    expect(updated).toMatchObject({ name: 'Hafriyat', weight: 4.5 });
    // Tarih aralığının yalnızca verilen alanı değişir.
    expect(updated.planned).toEqual({ start: item.planned.start, end: '2026-12-31T17:00' });
  });

  it('tamamlanmayı 0–100 aralığına sınırlar', () => {
    const group = firstGroup();
    const item = group.items[0];
    store().updateItem(group.id, item.id, { progress: 140 });
    expect(firstGroup().items[0].progress).toBe(100);
    store().updateItem(group.id, item.id, { progress: -3 });
    expect(firstGroup().items[0].progress).toBe(0);
  });

  it('geçersiz ağırlığı kaydetmez ve hata döner', () => {
    const group = firstGroup();
    const item = group.items[0];
    expect(store().updateItem(group.id, item.id, { weight: -1 }).ok).toBe(false);
    expect(store().updateItem(group.id, item.id, { weight: 101 }).ok).toBe(false);
    expect(firstGroup().items[0].weight).toBe(item.weight);
  });

  it('bitişi başlangıçtan önce olan aralığı kaydetmez', () => {
    const group = firstGroup();
    const item = group.items[0];
    const result = store().updateItem(group.id, item.id, { planned: { end: '2000-01-01T00:00' } });
    expect(result.ok).toBe(false);
    expect(firstGroup().items[0].planned).toEqual(item.planned);
  });

  it('kalemi siler ve sıraları yeniden numaralar', () => {
    const group = firstGroup();
    const target = group.items[0];
    store().removeItem(group.id, target.id);
    const items = firstGroup().items;
    expect(items.some((i) => i.id === target.id)).toBe(false);
    expect(items.map((i) => i.order)).toEqual(items.map((_, i) => i));
  });

  it('kalemi kopyalar: yeni ID, hemen altına, derin kopya', () => {
    const group = firstGroup();
    const original = group.items[0];
    const copyId = store().duplicateItem(group.id, original.id);
    const items = firstGroup().items;
    expect(items).toHaveLength(group.items.length + 1);
    expect(items[1]).toMatchObject({ id: copyId, name: original.name + COPY_SUFFIX, order: 1 });
    expect(copyId).not.toBe(original.id);
    expect(items[1].planned).not.toBe(original.planned);
  });

  it('olmayan kalemde hata döner, veri değişmez', () => {
    const before = store().project;
    expect(store().updateItem('yok', 'yok', { name: 'x' }).ok).toBe(false);
    expect(store().duplicateItem('yok', 'yok')).toBeNull();
    expect(store().project).toBe(before);
  });
});

describe('proje aksiyonları', () => {
  it('künye ve temayı günceller', () => {
    store().setInfo([{ key: 'Yüklenici', value: 'ABC İnşaat' }]);
    store().setTheme('dark');
    store().setGanttZoom('day');
    expect(store().project.info).toEqual([{ key: 'Yüklenici', value: 'ABC İnşaat' }]);
    expect(store().project.settings).toEqual({ theme: 'dark', ganttZoom: 'day' });
  });
});
