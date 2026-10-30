// Otomatik kayıt ve açılışta yükleme (IndexedDB, idb-keyval).
// Store her değiştiğinde kısa bir gecikmeyle kaydeder; sekme gizlenirken bekleyen kaydı hemen yazar.
// Sayfa kapanırken asenkron IndexedDB yazması yarıda kalabileceği için, henüz onaylanmamış
// değişiklik eşzamanlı olarak localStorage'a "acil kayıt" olarak da yazılır; açılışta o tercih edilir.
// Kayıtlı veri okunamazsa üzerine yazılmaz: önce ayrı bir anahtara yedeklenir.
import { get, set } from 'idb-keyval';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import type { Project } from '../types';

export const STORAGE_KEY = 'proje-takip:project';
/** localStorage anahtarı: sayfa kapanırken kaydedilememiş son durum */
export const EMERGENCY_KEY = 'proje-takip:acil-kayit';
const BROKEN_KEY_PREFIX = 'proje-takip:okunamayan-kayit:';

/** Art arda değişikliklerde yazmayı bu kadar bekletir (ms). */
export const SAVE_DEBOUNCE_MS = 400;

/** Kayıtlı değeri projeye çevirir; geçersizse hata mesajı döner. */
export type ProjectReader = (
  raw: unknown,
) => { ok: true; project: Project } | { ok: false; error: string };

/** Okunamayan kaydı ayrı anahtarla saklar ve kullanıcıyı uyarır. */
async function keepBroken(raw: unknown, error: string): Promise<void> {
  const backupKey = BROKEN_KEY_PREFIX + new Date().toISOString();
  await set(backupKey, raw);
  useUiStore.getState().showNotice({
    kind: 'error',
    text: `Kayıtlı proje okunamadı (${error}). Eski kayıt "${backupKey}" adıyla saklandı; örnek proje açıldı.`,
  });
}

/** Acil kaydı okur; varsa IndexedDB'ye aktarıp siler. Geçerli proje bulunduysa true. */
async function recoverEmergency(read: ProjectReader): Promise<boolean> {
  const text = localStorage.getItem(EMERGENCY_KEY);
  if (text === null) return false;

  let raw: unknown = text;
  try {
    raw = JSON.parse(text);
  } catch {
    // Ayrıştırılamayan metin olduğu gibi yedeklenir.
  }
  const result = read(raw);
  if (result.ok) {
    await set(STORAGE_KEY, result.project);
    useProjectStore.getState().replaceProject(result.project);
  } else {
    await keepBroken(raw, result.error);
  }
  localStorage.removeItem(EMERGENCY_KEY);
  return result.ok;
}

/**
 * Kayıtlı projeyi okuyup store'a yükler. Kayıt yoksa store'daki örnek proje kalır.
 * Kayıt bozuksa yedeklenir ve kullanıcı uyarılır.
 */
async function loadInto(read: ProjectReader): Promise<void> {
  if (await recoverEmergency(read)) return;

  const raw: unknown = await get(STORAGE_KEY);
  if (raw === undefined) return;

  const result = read(raw);
  if (result.ok) {
    useProjectStore.getState().replaceProject(result.project);
  } else {
    await keepBroken(raw, result.error);
  }
}

/** Store değişikliklerini dinleyip kaydeden aboneliği başlatır; durdurma fonksiyonu döner. */
function startAutoSave(): () => void {
  const ui = useUiStore.getState();
  let timer: ReturnType<typeof setTimeout> | undefined;
  /** IndexedDB'ye yazıldığı henüz doğrulanmamış son durum */
  let unsaved: Project | undefined;

  const flush = async () => {
    clearTimeout(timer);
    timer = undefined;
    const project = unsaved;
    if (!project) return;
    try {
      await set(STORAGE_KEY, project);
      // Yazma sürerken yeni değişiklik geldiyse o kayıt beklemeye devam eder.
      if (unsaved === project) {
        unsaved = undefined;
        // Her şey kaydedildi: eski acil kayıt açılışta yeni veriyi ezmesin.
        localStorage.removeItem(EMERGENCY_KEY);
        ui.setSaveStatus('saved');
      }
    } catch (error) {
      console.error('Kayıt hatası', error);
      ui.setSaveStatus('error');
      ui.showNotice({
        kind: 'error',
        text: 'Değişiklikler tarayıcıya kaydedilemedi. Veri kaybetmemek için JSON yedeği alın.',
      });
    }
  };

  /** Sayfa kapanırken: bekleyen durumu eşzamanlı yaz, sonra normal kaydı da dene. */
  const flushOnExit = () => {
    if (unsaved) {
      try {
        localStorage.setItem(EMERGENCY_KEY, JSON.stringify(unsaved));
      } catch (error) {
        console.error('Acil kayıt yazılamadı', error);
      }
    }
    void flush();
  };

  const unsubscribe = useProjectStore.subscribe((state, previous) => {
    if (state.project === previous.project) return;
    unsaved = state.project;
    ui.setSaveStatus('pending');
    clearTimeout(timer);
    timer = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS);
  });

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') flushOnExit();
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', flushOnExit);

  return () => {
    unsubscribe();
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', flushOnExit);
  };
}

const NOOP = () => {};

/** Açılışta bir kez çağrılır: yükler, sonra otomatik kaydı başlatır. Durdurma fonksiyonu döner. */
export async function initPersistence(read: ProjectReader): Promise<() => void> {
  const ui = useUiStore.getState();
  try {
    await loadInto(read);
    ui.setSaveStatus('saved');
  } catch (error) {
    console.error('Yükleme hatası', error);
    ui.setSaveStatus('error');
    ui.showNotice({
      kind: 'error',
      text: 'Tarayıcı depolamasına erişilemedi (gizli pencere olabilir). Değişiklikler kaydedilmeyebilir.',
    });
    return NOOP;
  }
  return startAutoSave();
}
