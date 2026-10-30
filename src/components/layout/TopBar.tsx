// Üst bar: proje adı, genel ilerleme çubuğu, ağırlık uyarısı, kayıt durumu ve ana işlemler.
import { useState } from 'react';
import { checkWeights, overallProgress } from '../../domain/progress';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore, type SaveStatus } from '../../store/uiStore';
import type { Theme } from '../../types';
import { formatPercent } from '../../utils/number';
import { ColumnManager } from '../columns/ColumnManager';
import { ProgressBar } from '../common/ProgressBar';
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

function WeightNotice() {
  const groups = useProjectStore((state) => state.project.groups);
  const { total, diff, state } = checkWeights(groups);
  if (state === 'ok') {
    return <span className="weight-ok">✔ Ağırlık toplamı {formatPercent(total)}</span>;
  }
  const detail = state === 'missing' ? 'eksik' : 'fazla';
  return (
    <span className="weight-warning" role="status">
      ⚠ Ağırlık toplamı {formatPercent(total)} ({formatPercent(diff)} {detail})
    </span>
  );
}

export function TopBar() {
  const project = useProjectStore((state) => state.project);
  const addGroup = useProjectStore((state) => state.addGroup);
  const setTheme = useProjectStore((state) => state.setTheme);
  const saveStatus = useUiStore((state) => state.saveStatus);
  const [infoOpen, setInfoOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);

  const progress = overallProgress(project.groups);

  return (
    <header className="top-bar">
      <div className="top-bar-row">
        <h1 className="project-title">{project.name}</h1>
        <div className="toolbar">
          <span className={`save-status save-${saveStatus}`} aria-live="polite">
            {SAVE_LABELS[saveStatus]}
          </span>
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
      <div className="top-bar-row overall">
        <span className="overall-value">{formatPercent(progress)}</span>
        <span className="overall-label">genel ilerleme</span>
        <ProgressBar value={progress} label="Genel ilerleme" size="large" />
        <WeightNotice />
      </div>
      {infoOpen && <ProjectInfoModal onClose={() => setInfoOpen(false)} />}
      {columnsOpen && <ColumnManager onClose={() => setColumnsOpen(false)} />}
    </header>
  );
}
