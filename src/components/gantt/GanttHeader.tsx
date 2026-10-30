// Gantt başlığı: iki satır zaman ekseni (yıl/ay + ay/hafta/gün) ve işaret satırı
// (işe başlama, iş bitimi, bugün). Kaydırırken üstte sabit kalır.
import type { AxisHeader } from '../../domain/timeline';

export interface Marker {
  key: string;
  label: string;
  x: number;
  kind: 'today' | 'project';
  title: string;
}

interface GanttHeaderProps {
  axis: AxisHeader;
  markers: Marker[];
}

export function GanttHeader({ axis, markers }: GanttHeaderProps) {
  return (
    <div className="gantt-header">
      {[axis.top, axis.bottom].map((segments, rowIndex) => (
        <div key={rowIndex} className="gantt-header-row">
          {segments.map((segment) => (
            <div
              key={segment.key}
              className="gantt-segment"
              style={{ left: segment.left, width: segment.width }}
              title={segment.label}
            >
              {segment.label}
            </div>
          ))}
        </div>
      ))}
      <div className="gantt-header-row gantt-markers">
        {markers.map((marker) => (
          <span
            key={marker.key}
            className={`gantt-flag gantt-flag-${marker.kind}`}
            style={{ left: marker.x }}
            title={marker.title}
          >
            {marker.label}
          </span>
        ))}
      </div>
    </div>
  );
}
