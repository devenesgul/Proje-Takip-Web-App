// Arayüz durumu (proje verisinden ayrı, kaydedilmez): kayıt durumu ve kullanıcıya gösterilen bildirim.
import { create } from 'zustand';

export type SaveStatus = 'loading' | 'saved' | 'pending' | 'error';

export interface Notice {
  kind: 'info' | 'error';
  text: string;
}

interface UiState {
  saveStatus: SaveStatus;
  notice: Notice | null;
  setSaveStatus: (status: SaveStatus) => void;
  showNotice: (notice: Notice) => void;
  clearNotice: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  saveStatus: 'loading',
  notice: null,
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  showNotice: (notice) => set({ notice }),
  clearNotice: () => set({ notice: null }),
}));
