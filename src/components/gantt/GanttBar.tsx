// Gantt çubuğu: planlanan aralık + içinde tamamlanma dolgusu. Renk durumdan gelir;
// durum ve yüzde ipucu (title) ve ekran okuyucu metniyle de verilir.
import type { CSSProperties } from 'react';
import type { Geometry } from '../../domain/timeline';
import { formatPercent } from '../../utils/number';

/** Yüzde etiketinin çubuk içine sığması için gereken en küçük genişlik (px). */
const LABEL_MIN_WIDTH = 40;

interface GanttBarProps {
  geometry: Geometry;
  progress: number;
  /** CSS sınıf eki: status-delayed, status-done, group … */
  variant: string;
  title: string;
  color?: string;
}

export function GanttBar({ geometry, progress, variant, title, color }: GanttBarProps) {
  const style = {
    left: geometry.left,
    width: geometry.width,
    '--bar-color': color,
  } as CSSProperties;

  return (
    <div
      className={`gantt-bar ${variant}`}
      style={style}
      title={title}
      role="img"
      aria-label={title}
    >
      <div className="gantt-bar-fill" style={{ width: `${progress}%` }} />
      {geometry.width >= LABEL_MIN_WIDTH && (
        <span className="gantt-bar-label" aria-hidden="true">
          {formatPercent(progress)}
        </span>
      )}
    </div>
  );
}
