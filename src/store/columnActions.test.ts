// Sütun aksiyonlarının store üzerinden testleri: ekle/sil/sırala/gizle, tip değişimi, seçenekler,
// hücre değerleri ve JSON'a yansıması (silinen sütunun değeri JSON'da kalmamalı).
import { beforeEach, describe, expect, it } from 'vitest';
import { sampleProject } from '../data/sampleProject';
import { sortColumns } from '../domain/columns';
import { projectToJson } from '../storage/exportJson';
import { parseProjectJson } from '../storage/importJson';
import { useProjectStore } from './projectStore';

const store = () => useProjectStore.getState();
const project = () => store().project;
const firstItem = () => project().groups[0].items[0];
const ids = () => sortColumns(project().columns).map((c) => c.id);

/** Örnek veride: col-responsible (metin), col-inspected (onay) */
const RESPONSIBLE = 'col-responsible';
const INSPECTED = 'col-inspected';

beforeEach(() => {
  useProjectStore.setState({ project: sampleProject });
});

describe('sütun ekleme / düzenleme', () => {
  it('sona ekler, görünür yapar; seçim tipine boş seçenek listesi verir', () => {
    const id = store().addColumn('Taşeron', 'select');
    const column = project().columns.find((c) => c.id === id);
    expect(column).toMatchObject({
      name: 'Taşeron',
      type: 'select',
      visible: true,
      order: 2,
      options: [],
    });
    expect(ids()).toEqual([RESPONSIBLE, INSPECTED, id]);
  });

  it('yeni sütunda mevcut kalemler boş kalır (değer yazılmaz)', () => {
    const id = store().addColumn('Not', 'text');
    expect(
      project()
        .groups.flatMap((g) => g.items)
        .every((i) => !(id in i.custom)),
    ).toBe(true);
  });

  it('yeniden adlandırır ve gizler', () => {
    store().updateColumn(RESPONSIBLE, { name: 'Sorumlu kişi', visible: false });
    expect(project().columns[0]).toMatchObject({ name: 'Sorumlu kişi', visible: false });
  });

  it('sırayı değiştirir; uçlarda bir şey yapmaz', () => {
    const c = store().addColumn('C', 'text');
    store().moveColumn(c, -1);
    expect(ids()).toEqual([RESPONSIBLE, c, INSPECTED]);
    store().moveColumn(RESPONSIBLE, -1);
    expect(ids()).toEqual([RESPONSIBLE, c, INSPECTED]);
    store().moveColumn(INSPECTED, 1);
    expect(ids()).toEqual([RESPONSIBLE, c, INSPECTED]);
    expect(sortColumns(project().columns).map((col) => col.order)).toEqual([0, 1, 2]);
  });
});

describe('sütun silme', () => {
  it('tanımı ve tüm değerleri siler; JSON yedeğinde de kalmaz', () => {
    expect(firstItem().custom[RESPONSIBLE]).toBe('Saha şefi');
    store().removeColumn(RESPONSIBLE);
    expect(project().columns.map((c) => c.id)).toEqual([INSPECTED]);
    expect(project().columns[0].order).toBe(0);
    const json = projectToJson(project());
    expect(json).not.toContain(RESPONSIBLE);
    expect(json).not.toContain('Saha şefi');
  });
});

describe('tip değişimi', () => {
  it('metinden seçime geçince değerler seçenek olur', () => {
    store().setColumnType(RESPONSIBLE, 'select');
    const column = project().columns.find((c) => c.id === RESPONSIBLE);
    expect(column?.type).toBe('select');
    expect(column?.options?.map((o) => o.value)).toEqual(['Saha şefi']);
    expect(firstItem().custom[RESPONSIBLE]).toBe('Saha şefi');
  });

  it('seçimden çıkınca seçenek listesi kaldırılır', () => {
    store().setColumnType(RESPONSIBLE, 'select');
    store().setColumnType(RESPONSIBLE, 'text');
    expect(project().columns.find((c) => c.id === RESPONSIBLE)).not.toHaveProperty('options');
  });

  it('dönüşmeyen değerler silinir', () => {
    store().setColumnType(RESPONSIBLE, 'number');
    expect(RESPONSIBLE in firstItem().custom).toBe(false);
  });
});

describe('seçenekler', () => {
  let col = '';
  beforeEach(() => {
    col = store().addColumn('Taşeron', 'select');
    store().addOption(col, 'ABC Yapı');
    store().addOption(col, 'XYZ İnşaat');
    const group = project().groups[0];
    store().setCustomValue(group.id, group.items[0].id, col, 'ABC Yapı');
  });

  const options = () => project().columns.find((c) => c.id === col)?.options ?? [];

  it('boş veya yinelenen seçenek eklenmez', () => {
    expect(store().addOption(col, '  ').ok).toBe(false);
    expect(store().addOption(col, 'ABC Yapı').ok).toBe(false);
    expect(options()).toHaveLength(2);
  });

  it('yeniden adlandırma hücre değerini de günceller', () => {
    expect(store().renameOption(col, 'ABC Yapı', 'ABC Yapı A.Ş.').ok).toBe(true);
    expect(options().map((o) => o.value)).toEqual(['ABC Yapı A.Ş.', 'XYZ İnşaat']);
    expect(firstItem().custom[col]).toBe('ABC Yapı A.Ş.');
    expect(store().renameOption(col, 'XYZ İnşaat', 'ABC Yapı A.Ş.').ok).toBe(false);
  });

  it('renk değiştirir', () => {
    store().setOptionColor(col, 'XYZ İnşaat', '#000000');
    expect(options()[1].color).toBe('#000000');
  });

  it('silinen seçeneğin hücreleri boşalır', () => {
    store().removeOption(col, 'ABC Yapı');
    expect(options().map((o) => o.value)).toEqual(['XYZ İnşaat']);
    expect(col in firstItem().custom).toBe(false);
  });
});

describe('hücre değeri', () => {
  it('yazar; null veya boş metin anahtarı kaldırır', () => {
    const group = project().groups[0];
    const itemId = group.items[1].id;
    store().setCustomValue(group.id, itemId, RESPONSIBLE, 'Ayşe');
    expect(project().groups[0].items[1].custom[RESPONSIBLE]).toBe('Ayşe');
    store().setCustomValue(group.id, itemId, RESPONSIBLE, '');
    expect(RESPONSIBLE in project().groups[0].items[1].custom).toBe(false);
  });

  it('özel sütunlu proje JSON üzerinden birebir geri gelir', () => {
    const col = store().addColumn('Belge', 'link');
    const group = project().groups[0];
    store().setCustomValue(group.id, group.items[0].id, col, 'https://ornek.com/rapor.pdf');
    store().updateColumn(INSPECTED, { visible: false });
    store().moveColumn(col, -2);
    expect(parseProjectJson(projectToJson(project()))).toEqual({ ok: true, project: project() });
  });
});
