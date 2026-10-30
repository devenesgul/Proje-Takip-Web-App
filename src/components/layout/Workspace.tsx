// Çalışma alanı: hızlı filtreler + zoom araç çubuğu, altında yan yana tablo ve Gantt.
// İki bölmenin dikey kaydırması birbirine bağlıdır; zoom değişince Gantt bugüne kaydırılır.
// Filtre tablo ve Gantt'a birlikte uygulanır (aynı satır listesi).
import { useLayoutEffect, useRef, type UIEvent } from 'react';
import {
  countMatching,
  matchesFilter,
  QUICK_FILTER_LABELS,
  type QuickFilter,
} from '../../domain/filters';
import { visibleRows } from '../../domain/rows';
import { timelineRange, xOf } from '../../domain/timeline';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import type { GanttZoom, ISODateTime } from '../../types';
import { GanttChart } from '../gantt/GanttChart';
import { ProjectTable } from '../table/ProjectTable';

const ZOOM_LABELS: Record<GanttZoom, string> = { day: 'Gün', week: 'Hafta', month: 'Ay' };

/** "Bugün" çizgisi görünür alanın soldan bu oranında durur. */
const TODAY_VIEW_RATIO = 1 / 3;

export function Workspace({ now }: { now: ISODateTime }) {
  const project = useProjectStore((state) => state.project);
  const addGroup = useProjectStore((state) => state.addGroup);
  const setGanttZoom = useProjectStore((state) => state.setGanttZoom);
  const filter = useUiStore((state) => state.filter);
  const setFilter = useUiStore((state) => state.setFilter);
  const mobileTab = useUiStore((state) => state.mobileTab);
  const tableRef = useRef<HTMLDivElement>(null);
  const ganttRef = useRef<HTMLDivElement>(null);

  const zoom = project.settings.ganttZoom;
  const rows = visibleRows(
    project.groups,
    filter === 'all' ? undefined : (item) => matchesFilter(item, filter, now),
  );
  const range = timelineRange(project, zoom);
  const todayX = xOf(now, range, zoom);

  const scrollToToday = () => {
    const gantt = ganttRef.current;
    if (gantt && todayX !== null) {
      gantt.scrollLeft = todayX - gantt.clientWidth * TODAY_VIEW_RATIO;
    }
  };

  // Açılışta, zoom değişince ve mobilde Gantt sekmesine geçince bugünü göster
  // (gizli bölmede kaydırma uygulanamaz). Düzenlemelerde kaydırmaz.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(scrollToToday, [zoom, mobileTab]);

  /** Bir bölme kaydırılınca diğerinin dikey konumunu eşitler. */
  const syncFrom = (target: HTMLDivElement | null) => (event: UIEvent<HTMLDivElement>) => {
    const top = event.currentTarget.scrollTop;
    if (target && target.scrollTop !== top) target.scrollTop = top;
  };

  if (project.groups.length === 0) {
    return (
      <section className="empty-state">
        <p>Henüz iş kısmı yok.</p>
        <button type="button" className="button primary" onClick={() => addGroup()}>
          İlk iş kısmını ekle
        </button>
      </section>
    );
  }

  return (
    <section className="workspace">
      <div className="workspace-toolbar">
        <div className="filter-chips" role="group" aria-label="Hızlı filtre">
          {(Object.keys(QUICK_FILTER_LABELS) as QuickFilter[]).map((value) => (
            <button
              key={value}
              type="button"
              className="chip"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {QUICK_FILTER_LABELS[value]}
              <span className="chip-count">{countMatching(project.groups, value, now)}</span>
            </button>
          ))}
        </div>
        <span className="toolbar-spacer" />
        <div className="segmented" role="group" aria-label="Gantt ölçeği">
          {(Object.keys(ZOOM_LABELS) as GanttZoom[]).map((value) => (
            <button
              key={value}
              type="button"
              className="button"
              aria-pressed={zoom === value}
              onClick={() => setGanttZoom(value)}
            >
              {ZOOM_LABELS[value]}
            </button>
          ))}
        </div>
        <button type="button" className="button" onClick={scrollToToday} disabled={todayX === null}>
          Bugüne git
        </button>
      </div>
      {rows.length === 0 && (
        <p className="filter-empty">
          “{QUICK_FILTER_LABELS[filter]}” filtresine uyan kalem yok.{' '}
          <button type="button" className="link-button" onClick={() => setFilter('all')}>
            Tümünü göster
          </button>
        </p>
      )}
      <div className="split">
        <ProjectTable
          rows={rows}
          now={now}
          scrollRef={tableRef}
          onScroll={(e) => syncFrom(ganttRef.current)(e)}
        />
        <GanttChart
          project={project}
          rows={rows}
          now={now}
          range={range}
          zoom={zoom}
          scrollRef={ganttRef}
          onScroll={(e) => syncFrom(tableRef.current)(e)}
        />
      </div>
    </section>
  );
}
