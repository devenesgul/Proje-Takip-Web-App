// Uygulama kök bileşeni: üst bar, bildirimler, özet kartlar, çalışma alanı (tablo + Gantt) ve S-eğrisi.
// Temayı <html data-theme> üzerinden uygular; "şimdi" tek yerden alınıp tüm bölümlere verilir.
// Dar ekranda bölümler sekmelere ayrılır; yazdırırken ayrı yazdırma görünümü çizilir.
import { useEffect } from 'react';
import { useNow } from './components/common/useNow';
import { useUndoShortcuts } from './components/common/useUndoShortcuts';
import { SCurvePanel } from './components/dashboard/SCurvePanel';
import { SummaryCards } from './components/dashboard/SummaryCards';
import { MobileTabs } from './components/layout/MobileTabs';
import { NoticeBar } from './components/layout/NoticeBar';
import { TopBar } from './components/layout/TopBar';
import { Workspace } from './components/layout/Workspace';
import { PrintView } from './components/print/PrintView';
import { usePrinting } from './components/print/usePrinting';
import { useProjectStore } from './store/projectStore';
import { useUiStore } from './store/uiStore';

function App() {
  const project = useProjectStore((state) => state.project);
  const mobileTab = useUiStore((state) => state.mobileTab);
  const now = useNow();
  const printing = usePrinting();
  useUndoShortcuts();

  const theme = project.settings.theme;
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <>
      <div className="app">
        <TopBar />
        <NoticeBar />
        <MobileTabs />
        <main data-mobile-tab={mobileTab}>
          <SummaryCards now={now} />
          <Workspace now={now} />
          <SCurvePanel now={now} />
        </main>
      </div>
      {printing && <PrintView project={project} now={now} />}
    </>
  );
}

export default App;
