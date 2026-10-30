// Gantt çizelgesi: tablo ile aynı satır listesinden çizilir (her satır aynı yükseklikte).
// Izgara çizgileri, bugün çizgisi, işe başlama/bitim işaretleri ve kalem/grup çubuklarını içerir.
import type { Ref, UIEventHandler } from 'react';
import { groupProgress } from '../../domain/progress';
import type { Row } from '../../domain/rows';
import { effectiveStatus, STATUS_LABELS } from '../../domain/schedule';
import {
  axisHeader,
  barGeometry,
  groupSpan,
  itemBar,
  timelineWidth,
  xOf,
  type TimelineRange,
} from '../../domain/timeline';
import type { GanttZoom, ISODateTime, Project } from '../../types';
import { formatDateTime } from '../../utils/date';
import { formatPercent } from '../../utils/number';
import { GanttBar } from './GanttBar';
import { GanttHeader, type Marker } from './GanttHeader';

interface GanttChartProps {
  project: Project;
  rows: Row[];
  now: ISODateTime;
  range: TimelineRange;
  zoom: GanttZoom;
  scrollRef: Ref<HTMLDivElement>;
  onScroll: UIEventHandler<HTMLDivElement>;
}

const periodText = (start?: string, end?: string) =>
  `${formatDateTime(start)} – ${formatDateTime(end)}`;

function RowBar({
  row,
  now,
  range,
  zoom,
}: {
  row: Row;
  now: ISODateTime;
  range: TimelineRange;
  zoom: GanttZoom;
}) {
  if (row.kind === 'group') {
    const span = groupSpan(row.group);
    const geometry = span && barGeometry(span, range, zoom);
    if (!span || !geometry) return null;
    const progress = groupProgress(row.group);
    return (
      <GanttBar
        geometry={geometry}
        progress={progress}
        variant="group-bar"
        color={row.group.color}
        title={`${row.group.name}: ${periodText(span.start, span.end)} · ${formatPercent(progress)}`}
      />
    );
  }
  if (row.kind === 'item') {
    const geometry = itemBar(row.item, range, zoom);
    if (!geometry) return null;
    const status = effectiveStatus(row.item, now);
    const { name, planned, progress } = row.item;
    return (
      <GanttBar
        geometry={geometry}
        progress={progress}
        variant={`status-${status}`}
        title={`${name}: ${periodText(planned.start, planned.end)} · ${formatPercent(progress)} · ${STATUS_LABELS[status]}`}
      />
    );
  }
  return null;
}

export function GanttChart({
  project,
  rows,
  now,
  range,
  zoom,
  scrollRef,
  onScroll,
}: GanttChartProps) {
  const axis = axisHeader(range, zoom);
  const width = timelineWidth(range, zoom);
  const todayX = xOf(now, range, zoom);
  const startX = xOf(project.start, range, zoom);
  const endX = xOf(project.end, range, zoom);

  const markers: Marker[] = [];
  if (startX !== null) {
    markers.push({
      key: 'start',
      label: '▶ Başlama',
      x: startX,
      kind: 'project',
      title: `İşe başlama: ${formatDateTime(project.start)}`,
    });
  }
  if (endX !== null) {
    markers.push({
      key: 'end',
      label: '■ Bitim',
      x: endX,
      kind: 'project',
      title: `İş bitimi: ${formatDateTime(project.end)}`,
    });
  }
  const todayVisible = todayX !== null && todayX >= 0 && todayX <= width;
  if (todayVisible) {
    markers.push({
      key: 'today',
      label: 'Bugün',
      x: todayX,
      kind: 'today',
      title: `Bugün: ${formatDateTime(now)}`,
    });
  }

  return (
    <div
      className="pane gantt-pane"
      ref={scrollRef}
      onScroll={onScroll}
      aria-label="Gantt çizelgesi"
    >
      <div className="gantt-inner" style={{ width }}>
        <GanttHeader axis={axis} markers={markers} />
        <div className="gantt-body">
          {axis.bottom.map((segment) => (
            <div key={segment.key} className="gantt-gridline" style={{ left: segment.left }} />
          ))}
          {startX !== null && (
            <div className="gantt-line gantt-line-project" style={{ left: startX }} />
          )}
          {endX !== null && (
            <div className="gantt-line gantt-line-project" style={{ left: endX }} />
          )}
          {todayVisible && <div className="gantt-line gantt-line-today" style={{ left: todayX }} />}
          {rows.map((row) => (
            <div key={row.key} className={`gantt-row gantt-row-${row.kind}`}>
              <RowBar row={row} now={now} range={range} zoom={zoom} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
