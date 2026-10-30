// Uygulama kök bileşeni. Aşama 0: yalnızca iskeletin çalıştığını gösterir.
import { sampleProject } from './data/sampleProject';

function App() {
  const itemCount = sampleProject.groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <main className="app">
      <h1>Proje Takip</h1>
      <p>
        {sampleProject.name}: {sampleProject.groups.length} iş kısmı, {itemCount} imalat kalemi
      </p>
    </main>
  );
}

export default App;
