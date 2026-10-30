// Üst bar: proje adı, kayıt durumu, geri al/yinele ve ana işlemler.
// Mobilde işlemler "☰ Menü" düğmesinin altına toplanır (CSS ile; masaüstünde hep görünür).
import { useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore, type SaveStatus } from '../../store/uiStore';
import type { Theme } from '../../types';
import { ColumnManager } from '../columns/ColumnManager';
import { BackupButtons } from './BackupButtons';
import { ProjectInfoModal } from './ProjectInfoModal';

const SAVE_LABELS: Record<SaveStatus, string> = {
  loading: 'Yükleniyor…',
  pending: 'Kaydediliyor…',
  saved: '✓ Kaydedildi',
  error: '⚠ Kaydedilemedi',
};

const THEME_LABELS: Record<Theme, string> = {
  system: 'Sistem teması',
  light: 'Açık tema',
  dark: 'Koyu tema',
};

export function TopBar() {
  const project = useProjectStore((state) => state.project);
  const addGroup = useProjectStore((state) => state.addGroup);
  const setTheme = useProjectStore((state) => state.setTheme);
  const undo = useProjectStore((state) => state.undo);
  const redo = useProjectStore((state) => state.redo);
  const canUndo = useProjectStore((state) => state.past.length > 0);
  const canRedo = useProjectStore((state) => state.future.length > 0);
  const saveStatus = useUiStore((state) => state.saveStatus);
  const [infoOpen, setInfoOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="top-bar">
      <div className="top-bar-row">
        <h1 className="project-title">{project.name}</h1>
        <div className="toolbar">
          <span className={`save-status save-${saveStatus}`} aria-live="polite">
            {SAVE_LABELS[saveStatus]}
          </span>
          <span className="segmented history-buttons" role="group" aria-label="Geçmiş">
            <button
              type="button"
              className="button"
              onClick={undo}
              disabled={!canUndo}
              title="Geri al (Ctrl/⌘+Z)"
              aria-label="Geri al"
            >
              ↶
            </button>
            <button
              type="button"
              className="button"
              onClick={redo}
              disabled={!canRedo}
              title="Yinele (Ctrl/⌘+Shift+Z)"
              aria-label="Yinele"
            >
              ↷
            </button>
          </span>
          <button
            type="button"
            className="button menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="toolbar-actions"
            onClick={() => setMenuOpen((open) => !open)}
          >
            ☰ Menü
          </button>
          <div id="toolbar-actions" className={`toolbar-actions ${menuOpen ? 'open' : ''}`}>
            <button type="button" className="button" onClick={() => addGroup()}>
              + İş kısmı
            </button>
            <button type="button" className="button" onClick={() => setInfoOpen(true)}>
              Künye
            </button>
            <button type="button" className="button" onClick={() => setColumnsOpen(true)}>
              Sütunlar
            </button>
            <BackupButtons />
            <select
              className="button"
              aria-label="Tema"
              value={project.settings.theme}
              onChange={(e) => setTheme(e.target.value as Theme)}
            >
              {Object.entries(THEME_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {infoOpen && <ProjectInfoModal onClose={() => setInfoOpen(false)} />}
      {columnsOpen && <ColumnManager onClose={() => setColumnsOpen(false)} />}
    </header>
  );
}
