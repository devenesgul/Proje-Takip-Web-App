// JSON yedek düğmeleri: dışa aktar (indir) ve içe aktar (dosya seç → doğrula → onayla → yükle).
import { useRef } from 'react';
import { downloadProjectJson } from '../../storage/exportJson';
import { parseProjectJson } from '../../storage/importJson';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';

export function BackupButtons() {
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceProject = useProjectStore((state) => state.replaceProject);
  const showNotice = useUiStore((state) => state.showNotice);

  const handleFile = async (file: File) => {
    const result = parseProjectJson(await file.text());
    if (!result.ok) {
      showNotice({ kind: 'error', text: `"${file.name}" içe aktarılamadı: ${result.error}.` });
      return;
    }
    const current = useProjectStore.getState().project.name;
    const confirmed = window.confirm(
      `Açık proje ("${current}") "${result.project.name}" ile değiştirilecek.\n` +
        'Mevcut veriyi korumak istiyorsanız önce "Dışa aktar" ile yedek alın.\n\nDevam edilsin mi?',
    );
    if (!confirmed) return;
    replaceProject(result.project);
    showNotice({ kind: 'info', text: `"${result.project.name}" içe aktarıldı.` });
  };

  return (
    <>
      <button
        type="button"
        className="button"
        onClick={() => downloadProjectJson(useProjectStore.getState().project)}
        title="Projeyi JSON dosyası olarak indir"
      >
        ⤓ Dışa aktar
      </button>
      <button
        type="button"
        className="button"
        onClick={() => fileRef.current?.click()}
        title="JSON yedeğinden geri yükle"
      >
        ⤒ İçe aktar
      </button>
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
    </>
  );
}
