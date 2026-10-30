// Uygulama giriş noktası: kayıtlı projeyi yükler, otomatik kaydı başlatır ve React kökünü oluşturur.
// Yayın derlemesinde çevrimdışı çalışma için service worker kaydedilir (geliştirmede kapalı).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/app.css';
import './styles/print.css';
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

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error: unknown) => {
      console.error('Service worker kaydedilemedi', error);
    });
  });
}
