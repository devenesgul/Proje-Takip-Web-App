// JSON dışa/içe aktarma testleri: birebir geri yükleme, bozuk/eksik dosyalar, şema sürümü.
import { beforeEach, describe, expect, it } from 'vitest';
import { sampleProject } from '../data/sampleProject';
import { useProjectStore } from '../store/projectStore';
import { CURRENT_SCHEMA_VERSION, type Project } from '../types';
import { exportFileName, projectToJson } from './exportJson';
import { parseProjectJson, readProject } from './importJson';

/** Örnek projenin JSON kopyası üzerinde değişiklik yapıp metne çevirir. */
function mutated(change: (data: Project) => void): string {
  const data = structuredClone(sampleProject);
  change(data);
  return JSON.stringify(data);
}

function expectError(text: string, fragment: string) {
  const result = parseProjectJson(text);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error).toContain(fragment);
}

beforeEach(() => {
  useProjectStore.setState({ project: sampleProject });
});

describe('dışa aktar → içe aktar', () => {
  it('örnek proje birebir aynı geri gelir', () => {
    const result = parseProjectJson(projectToJson(sampleProject));
    expect(result).toEqual({ ok: true, project: sampleProject });
  });

  it('düzenlenmiş proje (yeni grup, kalem, künye) birebir aynı geri gelir', () => {
    const store = useProjectStore.getState();
    const groupId = store.addGroup();
    const itemId = store.addItem(groupId);
    store.updateItem(groupId, itemId, {
      name: 'Saatli kalem',
      weight: 0.5,
      planned: { start: '2026-11-02T09:30', end: '2026-11-03T14:15' },
      note: 'Çok satırlı\nnot',
    });
    store.setInfo([{ key: 'Yüklenici', value: 'ABC İnşaat' }]);
    const project = useProjectStore.getState().project;

    const result = parseProjectJson(projectToJson(project));
    expect(result).toEqual({ ok: true, project });
  });

  it('IndexedDB kaydı gibi ayrıştırılmış nesneyi de okur', () => {
    expect(readProject(structuredClone(sampleProject))).toEqual({
      ok: true,
      project: sampleProject,
    });
  });
});

describe('bozuk veya eksik dosya', () => {
  it('JSON değilse çökmeden hata verir', () => {
    expectError('{ bozuk', 'geçerli bir JSON değil');
    expectError('', 'geçerli bir JSON değil');
  });

  it('nesne değilse hata verir', () => {
    expectError('[]', 'proje nesnesi içermiyor');
    expectError('42', 'proje nesnesi içermiyor');
  });

  it('eksik alanı yoluyla bildirir', () => {
    expectError(
      mutated((d) => delete (d as Partial<typeof d>).groups),
      '"groups" alanı liste olmalı',
    );
    expectError(
      mutated((d) => delete (d as Partial<typeof d>).schemaVersion),
      '"schemaVersion" alanı sayı olmalı',
    );
  });

  it('yanlış tipi yoluyla bildirir', () => {
    expectError(
      mutated((d) => Object.assign(d.groups[1].items[0], { weight: '5' })),
      '"groups[1].items[0].weight" alanı sayı olmalı',
    );
    expectError(
      mutated((d) => Object.assign(d.groups[0].items[0], { status: 'bitti' })),
      'groups[0].items[0].status',
    );
  });

  it('geçersiz ağırlığı reddeder', () => {
    expectError(
      mutated((d) => Object.assign(d.groups[0].items[0], { weight: -2 })),
      'negatif olamaz',
    );
  });

  it('yinelenen ID varsa reddeder', () => {
    expectError(
      mutated((d) => Object.assign(d.groups[0].items[1], { id: d.groups[0].items[0].id })),
      'aynı ID',
    );
  });

  it('tamamlanmayı 0–100 aralığına sınırlar', () => {
    const result = parseProjectJson(
      mutated((d) => Object.assign(d.groups[0].items[0], { progress: 140 })),
    );
    expect(result.ok && result.project.groups[0].items[0].progress).toBe(100);
  });

  it('bilinmeyen fazladan alanları atar', () => {
    const result = parseProjectJson(mutated((d) => Object.assign(d, { reklam: 'x' })));
    expect(result.ok && 'reklam' in result.project).toBe(false);
  });
});

describe('şema sürümü', () => {
  it('daha yeni sürümü anlaşılır hatayla reddeder', () => {
    expectError(
      mutated((d) => Object.assign(d, { schemaVersion: CURRENT_SCHEMA_VERSION + 1 })),
      'daha yeni bir uygulama sürümüyle',
    );
  });

  it('taşıması tanımlı olmayan eski sürümü reddeder', () => {
    expectError(
      mutated((d) => Object.assign(d, { schemaVersion: 0 })),
      'taşıma tanımlı değil',
    );
  });
});

describe('exportFileName', () => {
  it('Türkçe karakterleri sadeleştirir ve tarih ekler', () => {
    const name = exportFileName(
      { ...sampleProject, name: 'Kentsel Dönüşüm İş Programı (Örnek)' },
      new Date(2026, 9, 30),
    );
    expect(name).toBe('kentsel-donusum-is-programi-ornek-2026-10-30.json');
  });

  it('ad boşsa varsayılan ad kullanır', () => {
    expect(exportFileName({ ...sampleProject, name: '!!!' }, new Date(2026, 0, 5))).toBe(
      'proje-2026-01-05.json',
    );
  });
});

describe('eski yedek uyumluluğu', () => {
  it('Aşama 1–2 döneminde alınmış yedek (şema 1) değişmeden yüklenir', async () => {
    const { default: text } = await import('./__fixtures__/backup-v1.json?raw');
    const result = parseProjectJson(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project.columns.map((c) => [c.name, c.type, c.visible])).toEqual([
      ['Sorumlu', 'text', true],
      ['Kontrol', 'checkbox', false],
    ]);
    expect(result.project.groups[0].items[0].custom).toEqual({
      'c-text': 'Saha şefi',
      'c-check': true,
    });
    expect(JSON.parse(projectToJson(result.project))).toEqual(JSON.parse(text));
  });
});
