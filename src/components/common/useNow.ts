// "Şimdi" (ISO yerel zaman) — dakikada bir güncellenir; gecikme ve bugün çizgisi bunu kullanır.
import { useEffect, useState } from 'react';
import type { ISODateTime } from '../../types';
import { toIso } from '../../utils/date';

const TICK_MS = 60_000;

export function useNow(): ISODateTime {
  const [now, setNow] = useState(() => toIso(new Date()));
  useEffect(() => {
    const timer = setInterval(() => setNow(toIso(new Date())), TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
}
