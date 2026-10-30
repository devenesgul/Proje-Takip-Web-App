// Uygulama kök bileşeni: üst bar, bildirimler ve çalışma alanı (tablo + Gantt).
// Temayı <html data-theme> üzerinden uygular.
import { useEffect } from 'react';
import { NoticeBar } from './components/layout/NoticeBar';
import { TopBar } from './components/layout/TopBar';
import { Workspace } from './components/layout/Workspace';
import { useProjectStore } from './store/projectStore';

function App() {
  const theme = useProjectStore((state) => state.project.settings.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div className="app">
      <TopBar />
      <NoticeBar />
      <main>
        <Workspace />
      </main>
    </div>
  );
}

export default App;
