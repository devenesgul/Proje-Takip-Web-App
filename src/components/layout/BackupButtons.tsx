// "Dosya" menüsü: JSON yedek al / yükle (doğrula → onayla → yükle), Excel indir, yazdır / PDF.
// Yerleşik <details> açılır menüsü kullanılır (klavye ile açılır, ek kütüphane yok).
import { useRef } from 'react';
import { downloadExcel } from '../../storage/exportExcel';
import { downloadProjectJson } from '../../storage/exportJson';
import { parseProjectJson } from '../../storage/importJson';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { toIso } from '../../utils/date';

export function BackupButtons() {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceProject = useProjectStore((state) => state.replaceProject);
  const showNotice = useUiStore((state) => state.showNotice);

  /** Menü öğesi: işlemi yapar ve menüyü kapatır. */
  const run = (action: () => void) => {
    if (menuRef.current) menuRef.current.open = false;
    action();
  };

  const handleFile = async (file: File) => {
    const result = parseProjectJson(await file.text());
    if (!result.ok) {
      showNotice({ kind: 'error', text: `"${file.name}" içe aktarılamadı: ${result.error}.` });
      return;
    }
    const current = useProjectStore.getState().project.name;
    const confirmed = window.confirm(
      `Açık proje ("${current}") "${result.project.name}" ile değiştirilecek.\n` +
        'Mevcut veriyi korumak istiyorsanız önce "JSON yedek al" ile yedek alın.\n\nDevam edilsin mi?',
    );
    if (!confirmed) return;
    replaceProject(result.project);
    showNotice({ kind: 'info', text: `"${result.project.name}" içe aktarıldı.` });
  };

  const exportExcel = async () => {
    try {
      await downloadExcel(useProjectStore.getState().project, toIso(new Date()));
    } catch (error) {
      console.error('Excel hatası', error);
      showNotice({
        kind: 'error',
        text: 'Excel dosyası oluşturulamadı. Çevrimdışıysanız Excel modülü henüz indirilmemiş olabilir.',
      });
    }
  };

  return (
    <details className="menu" ref={menuRef}>
      <summary className="button">Dosya ▾</summary>
      <div className="menu-panel">
        <button
          type="button"
          className="menu-item"
          onClick={() => run(() => downloadProjectJson(useProjectStore.getState().project))}
        >
          ⤓ JSON yedek al
        </button>
        <button
          type="button"
          className="menu-item"
          onClick={() => run(() => fileRef.current?.click())}
        >
          ⤒ JSON yedekten yükle
        </button>
        <button type="button" className="menu-item" onClick={() => run(() => void exportExcel())}>
          ⤓ Excel (.xlsx) indir
        </button>
        <button type="button" className="menu-item" onClick={() => run(() => window.print())}>
          🖨 Yazdır / PDF
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Aynı dosya yeniden seçilebilsin diye değer sıfırlanır.
          event.target.value = '';
          if (file) void handleFile(file);
        }}
      />
    </details>
  );
}
