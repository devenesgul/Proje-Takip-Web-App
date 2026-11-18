// Yazdırma görünümü (PROJECT.md 8.4): PDF'teki iş programı düzeni.
// Üstte künye, ortada tablo + sayfa genişliğine sığdırılmış aylık Gantt, altta imza bloğu.
// Yalnızca yazdırma sırasında oluşturulur; filtre ve açık/kapalı gruplardan bağımsız olarak tüm kalemleri basar.
import type { CSSProperties, ReactNode } from 'react';
import { formatCustomValue, visibleColumns } from '../../domain/columns';
import { groupProgress, groupWeight, overallProgress, totalWeight } from '../../domain/progress';
import { effectiveStatus, remainingDays, remainingDaysLabel } from '../../domain/schedule';
import { deviation } from '../../domain/scurve';
import {
  formatMoney,
  trackerReport,
  TRACKER_STATE_LABELS,
  daysLeftLabel,
} from '../../domain/trackers';
import {
  axisHeader,
  barGeometry,
  groupSpan,
  timelineRange,
  timelineWidth,
  xOf,
  type Geometry,
} from '../../domain/timeline';
import type { ISODateTime, Project } from '../../types';
import { formatDate, formatDateTime, formatDay } from '../../utils/date';
import { formatPercent, formatSigned } from '../../utils/number';

/** PDF'teki onay bloğu */
const SIGNATURE_ROLES = ['Yüklenici', 'İdare', 'Mimar', 'İnşaat Mühendisi', 'Mali / İdari İşler'];

const PRINT_ZOOM = 'month';
const PERCENT = 100;

const dateOnly = formatDay;

interface TimelineProps {
  width: number;
  monthLefts: number[];
  markers: number[];
  today: number | null;
  children?: ReactNode;
}

/** Bir satırın zaman şeridi: ay çizgileri, işaretler ve (varsa) çubuk; konumlar yüzde. */
function TimelineCell({ width, monthLefts, markers, today, children }: TimelineProps) {
  const pct = (x: number) => `${(x / width) * PERCENT}%`;
  return (
    <td className="print-timeline">
      <div className="print-lane">
        {monthLefts.map((left) => (
          <span key={left} className="print-month-line" style={{ left: pct(left) }} />
        ))}
        {markers.map((left) => (
          <span key={`m${left}`} className="print-marker" style={{ left: pct(left) }} />
        ))}
        {today !== null && <span className="print-today" style={{ left: pct(today) }} />}
        {children}
      </div>
    </td>
  );
}

function Bar({
  geometry,
  width,
  progress,
  className,
  color,
}: {
  geometry: Geometry;
  width: number;
  progress: number;
  className: string;
  color?: string;
}) {
  const style = {
    left: `${(geometry.left / width) * PERCENT}%`,
    width: `${(geometry.width / width) * PERCENT}%`,
    '--bar-color': color,
  } as CSSProperties;
  return (
    <span className={`print-bar ${className}`} style={style}>
      <span className="print-bar-fill" style={{ width: `${progress}%` }} />
    </span>
  );
}

export function PrintView({ project, now }: { project: Project; now: ISODateTime }) {
  const range = timelineRange(project, PRINT_ZOOM);
  const width = timelineWidth(range, PRINT_ZOOM);
  const axis = axisHeader(range, PRINT_ZOOM);
  const monthLefts = axis.bottom.map((s) => s.left);
  const markers = [
    xOf(project.start, range, PRINT_ZOOM),
    xOf(project.end, range, PRINT_ZOOM),
  ].filter((x): x is number => x !== null);
  const todayX = xOf(now, range, PRINT_ZOOM);
  const today = todayX !== null && todayX >= 0 && todayX <= width ? todayX : null;
  const pct = (x: number) => `${(x / width) * PERCENT}%`;
  /** Tabloda görünür özel sütunlar (ör. Sorumlu) çıktıda da basılır. */
  const columns = visibleColumns(project.columns);
  const blankColumns = columns.map((c) => <td key={c.id} />);
  const lane = { width, monthLefts, markers, today };

  const days = remainingDays(project.end, now);
  const allSummary: [string, string][] = [
    ['İşe başlama tarihi', dateOnly(project.start)],
    ['İş bitim tarihi', dateOnly(project.end)],
    ['Genel ilerleme', formatPercent(overallProgress(project.groups))],
    ['Sapma (plana göre)', `${formatSigned(deviation(project.groups, now))} puan`],
    ['Kalan süre', days === null ? '—' : remainingDaysLabel(days)],
    ['Rapor tarihi', formatDateTime(now)],
  ];
  // Künyede aynı adla girilmiş alan varsa tekrar basılmaz (örn. "İşe başlama tarihi").
  const infoKeys = new Set(project.info.map((f) => f.key.trim().toLocaleLowerCase('tr')));
  const summary = allSummary.filter(([key]) => !infoKeys.has(key.toLocaleLowerCase('tr')));

  /** Kalem sıra numaraları (PDF'teki "No" sütunu), gruplar boyunca kesintisiz */
  const rowNumbers = new Map(
    project.groups.flatMap((g) => g.items).map((item, index) => [item.id, index + 1]),
  );

  return (
    <div className="print-view">
      <header className="print-header">
        <h1>{project.name}</h1>
        <p>İş Programı</p>
      </header>

      <section className="print-info">
        {[...project.info.map((f): [string, string] => [f.key, f.value]), ...summary].map(
          ([key, value], index) => (
            <div key={`${key}-${index}`} className="print-info-row">
              <span className="print-info-key">{key}</span>
              <span className="print-info-value">{value}</span>
            </div>
          ),
        )}
      </section>

      <table className="print-table">
        <thead>
          <tr>
            <th rowSpan={2} className="num">
              No
            </th>
            <th rowSpan={2}>İş kısmı / İmalat kalemi</th>
            <th rowSpan={2} className="num">
              Pursantaj
            </th>
            <th rowSpan={2}>Başlangıç</th>
            <th rowSpan={2}>Bitiş</th>
            <th rowSpan={2} className="num">
              Tamaml.
            </th>
            {columns.map((column) => (
              <th key={column.id} rowSpan={2} className="print-custom">
                {column.name}
              </th>
            ))}
            <th className="print-timeline print-axis">
              <div className="print-lane">
                {axis.top.map((s) => (
                  <span
                    key={s.key}
                    className="print-axis-label"
                    style={{ left: pct(s.left), width: pct(s.width) }}
                  >
                    {s.label}
                  </span>
                ))}
              </div>
            </th>
          </tr>
          <tr>
            <th className="print-timeline print-axis">
              <div className="print-lane">
                {axis.bottom.map((s) => (
                  <span
                    key={s.key}
                    className="print-axis-label"
                    style={{ left: pct(s.left), width: pct(s.width) }}
                  >
                    {s.label}
                  </span>
                ))}
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {project.groups.map((group) => {
            const span = groupSpan(group);
            const geometry = span && barGeometry(span, range, PRINT_ZOOM);
            return [
              <tr key={group.id} className="print-group">
                <td />
                <td>{group.name}</td>
                <td className="num">{formatPercent(groupWeight(group))}</td>
                <td>{dateOnly(span?.start)}</td>
                <td>{dateOnly(span?.end)}</td>
                <td className="num">{formatPercent(groupProgress(group))}</td>
                {blankColumns}
                <TimelineCell {...lane}>
                  {geometry && (
                    <Bar
                      geometry={geometry}
                      width={width}
                      progress={groupProgress(group)}
                      className="group-bar"
                      color={group.color}
                    />
                  )}
                </TimelineCell>
              </tr>,
              ...group.items.map((item) => {
                const bar = barGeometry(item.planned, range, PRINT_ZOOM);
                return (
                  <tr key={item.id}>
                    <td className="num">{rowNumbers.get(item.id)}</td>
                    <td className="print-item-name">{item.name}</td>
                    <td className="num">{formatPercent(item.weight)}</td>
                    <td>{dateOnly(item.planned.start)}</td>
                    <td>{dateOnly(item.planned.end)}</td>
                    <td className="num">{formatPercent(item.progress)}</td>
                    {columns.map((column) => (
                      <td key={column.id} className="print-custom">
                        {formatCustomValue(column, item.custom[column.id])}
                      </td>
                    ))}
                    <TimelineCell {...lane}>
                      {bar && (
                        <Bar
                          geometry={bar}
                          width={width}
                          progress={item.progress}
                          className={`status-${effectiveStatus(item, now)}`}
                        />
                      )}
                    </TimelineCell>
                  </tr>
                );
              }),
            ];
          })}
          <tr className="print-total">
            <td />
            <td>TOPLAM</td>
            <td className="num">{formatPercent(totalWeight(project.groups))}</td>
            <td />
            <td />
            <td className="num">{formatPercent(overallProgress(project.groups))}</td>
            {blankColumns}
            <td />
          </tr>
        </tbody>
      </table>
      <p className="print-legend">
        Çubuk: planlanan süre · koyu dolgu: tamamlanma · kırmızı çizgi: rapor tarihi · kesikli
        çizgi: işe başlama / iş bitimi · kırmızı çubuk: geciken iş
      </p>

      {project.trackers.length > 0 && (
        <section className="print-trackers">
          <h2>Periyot takibi</h2>
          <table className="print-tracker-table">
            <thead>
              <tr>
                <th>Takip</th>
                <th>Sorumlu</th>
                <th>Kural</th>
                <th>Başlangıç</th>
                <th>Son kayıt</th>
                <th>Sonraki son gün</th>
                <th>Durum</th>
                <th className="num">Aşım (gün)</th>
                <th className="num">Kaçırılan</th>
                <th className="num">Kesinti</th>
              </tr>
            </thead>
            <tbody>
              {project.trackers.map((tracker) => {
                const report = trackerReport(tracker, now);
                return (
                  <tr key={tracker.id}>
                    <td>{tracker.name}</td>
                    <td>{tracker.responsible}</td>
                    <td>
                      {tracker.intervalDays} günde 1 {tracker.eventLabel.toLocaleLowerCase('tr')}
                    </td>
                    <td>{formatDate(tracker.start)}</td>
                    <td>{report.lastEvent ? formatDate(report.lastEvent) : '—'}</td>
                    <td>
                      {report.nextDeadline ? formatDate(report.nextDeadline) : '—'}
                      {report.daysLeft !== undefined && ` (${daysLeftLabel(report.daysLeft)})`}
                    </td>
                    <td>{TRACKER_STATE_LABELS[report.state]}</td>
                    <td className="num">{report.totalLateDays}</td>
                    <td className="num">{report.totalMissed}</td>
                    <td className="num">{formatMoney(report.totalPenalty)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      <section className="print-signatures">
        {SIGNATURE_ROLES.map((role) => (
          <div key={role} className="print-signature">
            <strong>{role}</strong>
            <span>Ad Soyad:</span>
            <span>İmza:</span>
            <span>Tarih:</span>
          </div>
        ))}
      </section>
    </div>
  );
}
