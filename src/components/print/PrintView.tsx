// Yazdırma görünümü (PROJECT.md 8.4): PDF'teki iş programı düzeni.
// Üstte künye, ortada tablo + sayfa genişliğine sığdırılmış aylık Gantt, altta imza bloğu.
// Yalnızca yazdırma sırasında oluşturulur; filtre ve açık/kapalı gruplardan bağımsız olarak tüm kalemleri basar.
import type { CSSProperties, ReactNode } from 'react';
import { groupProgress, groupWeight, overallProgress, totalWeight } from '../../domain/progress';
import { effectiveStatus, remainingDays, remainingDaysLabel } from '../../domain/schedule';
import { deviation } from '../../domain/scurve';
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
import { formatDateTime } from '../../utils/date';
import { formatPercent, formatSigned } from '../../utils/number';

/** PDF'teki onay bloğu */
const SIGNATURE_ROLES = ['Yüklenici', 'İdare', 'Mimar', 'İnşaat Mühendisi', 'Mali / İdari İşler'];

const PRINT_ZOOM = 'month';
const PERCENT = 100;

const dateOnly = (value?: string) => formatDateTime(value).slice(0, 10);

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
            <td />
          </tr>
        </tbody>
      </table>
      <p className="print-legend">
        Çubuk: planlanan süre · koyu dolgu: tamamlanma · kırmızı çizgi: rapor tarihi · kesikli
        çizgi: işe başlama / iş bitimi · kırmızı çubuk: geciken iş
      </p>

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
