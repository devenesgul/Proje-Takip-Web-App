// Arayüz durumu (proje verisinden ayrı, kaydedilmez): kayıt durumu, bildirim, hızlı filtre
// S-eğrisi panelinin açık/kapalı hâli ve mobil sekme.
import { create } from 'zustand';
import type { QuickFilter } from '../domain/filters';

/** Mobilde gösterilen bölüm (Bölüm 8.3: Panel | Tablo | Gantt) */
export type MobileTab = 'panel' | 'table' | 'gantt';

export type SaveStatus = 'loading' | 'saved' | 'pending' | 'error';

export interface Notice {
  kind: 'info' | 'error';
  text: string;
}

interface UiState {
  saveStatus: SaveStatus;
  notice: Notice | null;
  filter: QuickFilter;
  sCurveOpen: boolean;
  mobileTab: MobileTab;
  setMobileTab: (tab: MobileTab) => void;
  setFilter: (filter: QuickFilter) => void;
  toggleSCurve: () => void;
  setSaveStatus: (status: SaveStatus) => void;
  showNotice: (notice: Notice) => void;
  clearNotice: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  saveStatus: 'loading',
  notice: null,
  filter: 'all',
  sCurveOpen: true,
  mobileTab: 'panel',
  setMobileTab: (mobileTab) => set({ mobileTab }),
  setFilter: (filter) => set({ filter }),
  toggleSCurve: () => set((state) => ({ sCurveOpen: !state.sCurveOpen })),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  showNotice: (notice) => set({ notice }),
  clearNotice: () => set({ notice: null }),
}));
