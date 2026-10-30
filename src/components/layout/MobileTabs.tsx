// Mobil sekme çubuğu (yalnızca dar ekranda görünür): Panel | Tablo | Gantt.
// Hangi bölümün gösterileceğine CSS karar verir (<main data-mobile-tab>); masaüstünde etkisizdir.
import { useUiStore, type MobileTab } from '../../store/uiStore';

const TAB_LABELS: Record<MobileTab, string> = {
  panel: 'Panel',
  table: 'Tablo',
  gantt: 'Gantt',
};

export function MobileTabs() {
  const tab = useUiStore((state) => state.mobileTab);
  const setTab = useUiStore((state) => state.setMobileTab);

  return (
    <nav className="mobile-tabs" aria-label="Görünüm">
      {(Object.keys(TAB_LABELS) as MobileTab[]).map((value) => (
        <button
          key={value}
          type="button"
          className="mobile-tab"
          aria-pressed={tab === value}
          onClick={() => setTab(value)}
        >
          {TAB_LABELS[value]}
        </button>
      ))}
    </nav>
  );
}
