// Uygulama giriş noktası: kayıtlı projeyi yükler, otomatik kaydı başlatır ve React kökünü oluşturur.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/app.css';
import App from './App';
import { readProject } from './storage/importJson';
import { initPersistence } from './storage/persist';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Kök eleman (#root) bulunamadı');
}

void initPersistence(readProject).then(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
