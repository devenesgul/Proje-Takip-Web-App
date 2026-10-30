// S-eğrisi paneli (altta, açılıp kapanır): gösterge, grafik ve erişilebilir veri tablosu.
// Tarihi eksik kalemler planlanan eğriye katılamaz; varsa bu açıkça yazılır.
import { sCurve, unplannedWeight, valueAt } from '../../domain/scurve';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import type { ISODateTime } from '../../types';
import { formatDateTime } from '../../utils/date';
import { formatPercent } from '../../utils/number';
import { SCurveChart } from './SCurveChart';

export function SCurvePanel({ now }: { now: ISODateTime }) {
  const project = useProjectStore((state) => state.project);
  const open = useUiStore((state) => state.sCurveOpen);
  const toggle = useUiStore((state) => state.toggleSCurve);

  const curve = sCurve(project.groups, project.progressSnapshots, project.start, project.end, now);
  const undated = unplannedWeight(project.groups);

  return (
    <section className="scurve-panel" aria-label="S-eğrisi">
      <header className="scurve-header">
        <button type="button" className="icon-button" onClick={toggle} aria-expanded={open}>
          {open ? '▼' : '▶'}
        </button>
        <h2>S-eğrisi</h2>
        {open && (
          <ul className="legend" aria-label="Gösterge">
            <li>
              <span className="key key-actual" aria-hidden="true" />
              Gerçekleşen
            </li>
            <li>
              <span className="key key-planned" aria-hidden="true" />
              Planlanan
            </li>
          </ul>
        )}
        {open && undated > 0 && (
          <span className="muted scurve-note">
            Tarihi eksik kalemler ({formatPercent(undated)} ağırlık) planlanan eğriye dahil değil.
          </span>
        )}
      </header>
      {open && (
        <>
          <SCurveChart curve={curve} now={now} />
          <details className="scurve-table">
            <summary>Veri tablosu</summary>
            <table>
              <thead>
                <tr>
                  <th>Kayıt tarihi</th>
                  <th>Gerçekleşen</th>
                  <th>Planlanan</th>
                </tr>
              </thead>
              <tbody>
                {curve.actual.map((point) => {
                  const planned = valueAt(curve.planned, point.date);
                  return (
                    <tr key={point.date}>
                      <td>{formatDateTime(point.date)}</td>
                      <td>{formatPercent(point.value)}</td>
                      <td>{planned === null ? '—' : formatPercent(planned)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  );
}
