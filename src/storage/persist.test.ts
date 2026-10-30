// persist.ts testleri: IndexedDB bellekte taklit edilir (idb-keyval mock).
// Açılışta yükleme, bozuk kaydın yedeklenmesi, gecikmeli otomatik kayıt ve acil kayıt doğrulanır.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleProject } from '../data/sampleProject';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import type { Project } from '../types';
import {
  EMERGENCY_KEY,
  initPersistence,
  SAVE_DEBOUNCE_MS,
  STORAGE_KEY,
  type ProjectReader,
} from './persist';

const db = new Map<string, unknown>();

vi.mock('idb-keyval', () => ({
  get: (key: string) => Promise.resolve(db.get(key)),
  set: (key: string, value: unknown) => {
    db.set(key, value);
    return Promise.resolve();
  },
}));

const readAny: ProjectReader = (raw) =>
  typeof raw === 'object' && raw !== null && 'id' in raw
    ? { ok: true, project: raw as Project }
    : { ok: false, error: 'geçersiz' };

/** localStorage'ın bellek içi taklidi */
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
}

let stop: () => void = () => {};
const start = async () => {
  stop = await initPersistence(readAny);
};

/** Sayfa kapanışını taklit eder. */
const leavePage = () => window.dispatchEvent(new Event('pagehide'));

beforeEach(() => {
  db.clear();
  vi.stubGlobal('localStorage', memoryStorage());
  // Node ortamında tarayıcı olay hedeflerini taklit et.
  vi.stubGlobal('document', Object.assign(new EventTarget(), { visibilityState: 'visible' }));
  vi.stubGlobal('window', new EventTarget());
  useProjectStore.setState({ project: sampleProject });
  useUiStore.setState({ saveStatus: 'loading', notice: null });
});

afterEach(() => {
  stop();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('initPersistence', () => {
  it('kayıt yoksa örnek proje kalır', async () => {
    await start();
    expect(useProjectStore.getState().project).toBe(sampleProject);
    expect(useUiStore.getState().saveStatus).toBe('saved');
  });

  it('kayıtlı projeyi yükler', async () => {
    const stored = { ...sampleProject, name: 'Kayıtlı Proje' };
    db.set(STORAGE_KEY, stored);
    await start();
    expect(useProjectStore.getState().project.name).toBe('Kayıtlı Proje');
  });

  it('bozuk kaydı silmez, yedekler ve uyarır', async () => {
    db.set(STORAGE_KEY, 'bozuk veri');
    await start();
    expect(db.get(STORAGE_KEY)).toBe('bozuk veri');
    const backups = [...db.entries()].filter(([key]) => key !== STORAGE_KEY);
    expect(backups).toHaveLength(1);
    expect(backups[0][1]).toBe('bozuk veri');
    expect(useUiStore.getState().notice?.kind).toBe('error');
  });

  it('değişiklikleri gecikmeyle kaydeder', async () => {
    await start();
    vi.useFakeTimers();
    useProjectStore.getState().updateProject({ name: 'İlk' });
    useProjectStore.getState().updateProject({ name: 'Son' });
    expect(useUiStore.getState().saveStatus).toBe('pending');
    expect(db.has(STORAGE_KEY)).toBe(false);

    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
    expect((db.get(STORAGE_KEY) as Project).name).toBe('Son');
    expect(useUiStore.getState().saveStatus).toBe('saved');
  });

  it('sekme gizlenince bekleyen kaydı hemen yazar', async () => {
    await start();
    vi.useFakeTimers();
    useProjectStore.getState().updateProject({ name: 'Hemen' });
    Object.assign(document, { visibilityState: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect((db.get(STORAGE_KEY) as Project).name).toBe('Hemen');
  });
});

describe('acil kayıt (sayfa kapanırken)', () => {
  it("kaydedilmemiş değişikliği sayfa kapanırken localStorage'a eşzamanlı yazar", async () => {
    await start();
    vi.useFakeTimers();
    useProjectStore.getState().updateProject({ name: 'Son saniye' });
    leavePage();
    expect(JSON.parse(localStorage.getItem(EMERGENCY_KEY) ?? '{}').name).toBe('Son saniye');
  });

  it('kaydedilecek bir şey yoksa acil kayıt yazmaz', async () => {
    await start();
    leavePage();
    expect(localStorage.getItem(EMERGENCY_KEY)).toBeNull();
  });

  it("açılışta acil kaydı tercih eder, IndexedDB'ye aktarır ve siler", async () => {
    db.set(STORAGE_KEY, { ...sampleProject, name: 'Eski' });
    localStorage.setItem(EMERGENCY_KEY, JSON.stringify({ ...sampleProject, name: 'Yeni' }));
    await start();
    expect(useProjectStore.getState().project.name).toBe('Yeni');
    expect((db.get(STORAGE_KEY) as Project).name).toBe('Yeni');
    expect(localStorage.getItem(EMERGENCY_KEY)).toBeNull();
  });

  it('sonradan başarılı kayıt olursa eski acil kaydı siler (yeni veriyi ezmesin)', async () => {
    await start();
    vi.useFakeTimers();
    useProjectStore.getState().updateProject({ name: 'Sekme gizlenmeden önce' });
    leavePage();
    await vi.advanceTimersByTimeAsync(0);
    useProjectStore.getState().updateProject({ name: 'Geri dönünce' });
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
    expect(localStorage.getItem(EMERGENCY_KEY)).toBeNull();
    expect((db.get(STORAGE_KEY) as Project).name).toBe('Geri dönünce');
  });

  it('okunamayan acil kaydı silmeden yedekler', async () => {
    localStorage.setItem(EMERGENCY_KEY, '{ bozuk');
    await start();
    const backups = [...db.entries()].filter(([key]) => key !== STORAGE_KEY);
    expect(backups.map(([, value]) => value)).toEqual(['{ bozuk']);
    expect(localStorage.getItem(EMERGENCY_KEY)).toBeNull();
    expect(useUiStore.getState().notice?.kind).toBe('error');
  });
});
