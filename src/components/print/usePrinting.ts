// Yazdırma sırasında true döner. Yazdırma görünümü yalnızca bu sırada oluşturulur
// (ekranda boşuna çizilmesin). Ctrl/⌘+P ile de çalışır: beforeprint olayında eşzamanlı çizilir.
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

export function usePrinting(): boolean {
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    const before = () => flushSync(() => setPrinting(true));
    const after = () => setPrinting(false);
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);
  return printing;
}
