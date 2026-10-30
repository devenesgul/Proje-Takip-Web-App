// Bildirim çubuğu: hata ve bilgi mesajlarını kapatılabilir şekilde gösterir.
import { useUiStore } from '../../store/uiStore';

export function NoticeBar() {
  const notice = useUiStore((state) => state.notice);
  const clearNotice = useUiStore((state) => state.clearNotice);
  if (!notice) return null;

  return (
    <div
      className={`notice notice-${notice.kind}`}
      role={notice.kind === 'error' ? 'alert' : 'status'}
    >
      <span>{notice.text}</span>
      <button
        type="button"
        className="icon-button"
        onClick={clearNotice}
        aria-label="Bildirimi kapat"
      >
        ✕
      </button>
    </div>
  );
}
