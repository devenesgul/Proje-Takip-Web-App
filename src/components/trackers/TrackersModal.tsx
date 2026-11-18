// Periyot takibi penceresi: "Kalıpçı 15 günde 1 döküm" gibi takipler.
// Her takip kartında durum, son kayıt, sonraki son gün, aşım ve kesinti özeti; altında
// kayıt ekleme formu, kayıt listesi ve aşım (kesinti) dökümü. Hesaplar domain/trackers.ts'te.
import { useState } from 'react';
import {
  daysLeftLabel,
  formatMoney,
  PENALTY_MODE_LABELS,
  trackerReport,
  TRACKER_STATE_LABELS,
  type TrackerDraft,
} from '../../domain/trackers';
import { useProjectStore } from '../../store/projectStore';
import type { ISODateTime, PenaltyMode, Tracker } from '../../types';
import { formatDate } from '../../utils/date';
import { formatNumber, parseDecimal } from '../../utils/number';
import { Modal } from '../common/Modal';

const DEFAULT_INTERVAL = 15;
const DATE_LENGTH = 10;

const today = (now: ISODateTime) => now.slice(0, DATE_LENGTH);

function emptyDraft(projectStart: ISODateTime): TrackerDraft {
  return {
    name: 'Döküm takibi',
    responsible: '',
    eventLabel: 'Döküm',
    start: projectStart.slice(0, DATE_LENGTH),
    intervalDays: DEFAULT_INTERVAL,
    penaltyMode: 'perDay',
    penaltyAmount: 0,
  };
}

function toDraft(tracker: Tracker): TrackerDraft {
  const draft: Partial<Tracker> = { ...tracker };
  delete draft.id;
  delete draft.events;
  return draft as TrackerDraft;
}

interface FormProps {
  initial: TrackerDraft;
  onSave: (draft: TrackerDraft) => string | null;
  onCancel: () => void;
}

/** Takip ekleme/düzenleme formu. */
function TrackerForm({ initial, onSave, onCancel }: FormProps) {
  const [draft, setDraft] = useState(initial);
  const [interval, setIntervalText] = useState(String(initial.intervalDays));
  const [amount, setAmount] = useState(formatNumber(initial.penaltyAmount));
  const [error, setError] = useState<string | null>(null);
  const change = (patch: Partial<TrackerDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const save = () => {
    const intervalDays = parseDecimal(interval);
    const penaltyAmount = amount.trim() === '' ? 0 : parseDecimal(amount.replace(/[₺TL]/gi, ''));
    if (intervalDays === null) return setError('Periyot için geçerli bir gün sayısı girin');
    if (penaltyAmount === null) return setError('Kesinti tutarı için geçerli bir sayı girin');
    setError(onSave({ ...draft, intervalDays, penaltyAmount }));
  };

  return (
    <div className="tracker-form">
      <div className="form-grid">
        <label>
          Takip adı
          <input value={draft.name} onChange={(e) => change({ name: e.target.value })} />
        </label>
        <label>
          Sorumlu (kişi / taşeron)
          <input
            placeholder="ör. Kalıpçı"
            value={draft.responsible}
            onChange={(e) => change({ responsible: e.target.value })}
          />
        </label>
        <label>
          Yapılacak iş
          <input
            placeholder="ör. Döküm"
            value={draft.eventLabel}
            onChange={(e) => change({ eventLabel: e.target.value })}
          />
        </label>
        <label>
          Başlangıç (işe başlama)
          <input
            type="date"
            value={draft.start}
            onChange={(e) => change({ start: e.target.value })}
          />
        </label>
        <label>
          Bitiş (boşsa süresiz)
          <input
            type="date"
            value={draft.end ?? ''}
            onChange={(e) => change({ end: e.target.value || undefined })}
          />
        </label>
        <label>
          En geç kaç günde bir
          <input
            inputMode="numeric"
            value={interval}
            onChange={(e) => setIntervalText(e.target.value)}
          />
        </label>
        <label>
          Kesinti tutarı (₺)
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label>
          Kesinti şekli
          <select
            value={draft.penaltyMode}
            onChange={(e) => change({ penaltyMode: e.target.value as PenaltyMode })}
          >
            {(Object.keys(PENALTY_MODE_LABELS) as PenaltyMode[]).map((mode) => (
              <option key={mode} value={mode}>
                {PENALTY_MODE_LABELS[mode]}
              </option>
            ))}
          </select>
        </label>
        <label className="span-2">
          Not
          <input
            placeholder="ör. Sözleşme madde 12"
            value={draft.note ?? ''}
            onChange={(e) => change({ note: e.target.value })}
          />
        </label>
      </div>
      <p className="muted tracker-hint">
        Son gün = başlangıç ya da son {draft.eventLabel.toLocaleLowerCase('tr') || 'kayıt'} +{' '}
        {interval || '?'} gün. Bu gün geçerse aşım başlar ve kesinti hesaplanır.
      </p>
      <div className="tracker-form-actions">
        {error && (
          <span className="form-error" role="alert">
            {error}
          </span>
        )}
        <button type="button" className="button" onClick={onCancel}>
          İptal
        </button>
        <button type="button" className="button primary" onClick={save}>
          Kaydet
        </button>
      </div>
    </div>
  );
}

interface CardProps {
  tracker: Tracker;
  now: ISODateTime;
  onEdit: () => void;
}

/** Tek takibin özeti, kayıt ekleme ve dökümler. */
function TrackerCard({ tracker, now, onEdit }: CardProps) {
  const addEvent = useProjectStore((state) => state.addTrackerEvent);
  const removeEvent = useProjectStore((state) => state.removeTrackerEvent);
  const removeTracker = useProjectStore((state) => state.removeTracker);
  const [date, setDate] = useState(today(now));
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const report = trackerReport(tracker, now);
  const label = tracker.eventLabel;

  const submit = () => {
    const check = addEvent(tracker.id, date, note);
    if (!check.ok) return setError(check.message);
    setError(null);
    setNote('');
  };

  const handleRemove = () => {
    if (window.confirm(`"${tracker.name}" takibi ve tüm kayıtları silinsin mi?`)) {
      removeTracker(tracker.id);
    }
  };

  return (
    <article className={`tracker-card tracker-${report.state}`}>
      <header className="tracker-card-header">
        <div>
          <h3>{tracker.name}</h3>
          <p className="muted">
            {tracker.responsible} · {tracker.intervalDays} günde 1 {label.toLocaleLowerCase('tr')}
            {' · '}
            {formatDate(tracker.start)}
            {tracker.end ? ` – ${formatDate(tracker.end)}` : ' itibarıyla'}
          </p>
        </div>
        <span className={`badge tracker-badge state-${report.state}`}>
          {report.state === 'overdue' ? '⚠ ' : report.state === 'ok' ? '✔ ' : ''}
          {TRACKER_STATE_LABELS[report.state]}
        </span>
      </header>

      <dl className="tracker-stats">
        <div>
          <dt>Son {label.toLocaleLowerCase('tr')}</dt>
          <dd>{report.lastEvent ? formatDate(report.lastEvent) : 'Henüz yok'}</dd>
        </div>
        <div>
          <dt>Sonraki son gün</dt>
          <dd>
            {report.nextDeadline ? formatDate(report.nextDeadline) : '—'}
            {report.daysLeft !== undefined && (
              <small className={report.daysLeft < 0 ? 'text-danger' : 'muted'}>
                {daysLeftLabel(report.daysLeft)}
              </small>
            )}
          </dd>
        </div>
        <div>
          <dt>Aşım</dt>
          <dd>
            {report.totalLateDays} gün
            <small className="muted">{report.totalMissed} periyot kaçırıldı</small>
          </dd>
        </div>
        <div>
          <dt>Kesinti</dt>
          <dd className={report.totalPenalty > 0 ? 'text-danger' : ''}>
            {formatMoney(report.totalPenalty)}
            <small className="muted">
              {formatMoney(tracker.penaltyAmount)} ·{' '}
              {PENALTY_MODE_LABELS[tracker.penaltyMode].toLocaleLowerCase('tr')}
            </small>
          </dd>
        </div>
      </dl>

      <div className="tracker-add">
        <input
          type="date"
          aria-label={`${label} tarihi`}
          value={date}
          max={today(now)}
          onChange={(e) => {
            setDate(e.target.value);
            setError(null);
          }}
        />
        <input
          aria-label={`${label} notu`}
          placeholder="Not (ör. 2. kat tavan)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />
        <button type="button" className="button primary" onClick={submit}>
          + {label} kaydet
        </button>
        {error && (
          <span className="form-error" role="alert">
            {error}
          </span>
        )}
      </div>

      <details className="tracker-details">
        <summary>Aşımlar ve kesintiler ({report.violations.length})</summary>
        {report.violations.length === 0 ? (
          <p className="muted">Aşım yok, tüm {label.toLocaleLowerCase('tr')}lar zamanında.</p>
        ) : (
          <div className="tracker-table-wrap">
            <table className="tracker-table">
              <thead>
                <tr>
                  <th>Son gün</th>
                  <th>Yapıldığı gün</th>
                  <th className="num">Gecikme</th>
                  <th className="num">Kaçırılan</th>
                  <th className="num">Kesinti</th>
                </tr>
              </thead>
              <tbody>
                {report.violations.map((v) => (
                  <tr key={v.deadline}>
                    <td>{formatDate(v.deadline)}</td>
                    <td>{v.resolvedOn ? formatDate(v.resolvedOn) : 'Henüz yapılmadı'}</td>
                    <td className="num">{v.lateDays} gün</td>
                    <td className="num">{v.missedPeriods}</td>
                    <td className="num">{formatMoney(v.penalty)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>Toplam</td>
                  <td className="num">{report.totalLateDays} gün</td>
                  <td className="num">{report.totalMissed}</td>
                  <td className="num">{formatMoney(report.totalPenalty)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </details>

      <details className="tracker-details">
        <summary>
          {label} kayıtları ({tracker.events.length})
        </summary>
        {tracker.events.length === 0 ? (
          <p className="muted">Henüz kayıt yok.</p>
        ) : (
          <ul className="tracker-events">
            {tracker.events.map((event) => (
              <li key={event.id}>
                <span className="tracker-event-date">{formatDate(event.date)}</span>
                <span className="muted">{event.note}</span>
                <button
                  type="button"
                  className="icon-button danger"
                  aria-label={`${formatDate(event.date)} kaydını sil`}
                  onClick={() => removeEvent(tracker.id, event.id)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </details>

      {tracker.note && <p className="muted tracker-note">{tracker.note}</p>}

      <footer className="tracker-card-actions">
        <button type="button" className="button" onClick={onEdit}>
          Düzenle
        </button>
        <button type="button" className="button danger-text" onClick={handleRemove}>
          Takibi sil
        </button>
      </footer>
    </article>
  );
}

export function TrackersModal({ now, onClose }: { now: ISODateTime; onClose: () => void }) {
  const project = useProjectStore((state) => state.project);
  const addTracker = useProjectStore((state) => state.addTracker);
  const updateTracker = useProjectStore((state) => state.updateTracker);
  /** null: liste, 'new': yeni takip formu, id: o takibin düzenleme formu */
  const [editing, setEditing] = useState<string | null>(null);

  const editingTracker = project.trackers.find((t) => t.id === editing);
  const toMessage = (check: { ok: true } | { ok: false; message: string }) => {
    if (!check.ok) return check.message;
    setEditing(null);
    return null;
  };

  return (
    <Modal title="Periyot takibi" onClose={onClose} className="modal-wide">
      {editing === 'new' && (
        <TrackerForm
          initial={emptyDraft(project.start)}
          onSave={(draft) => toMessage(addTracker(draft))}
          onCancel={() => setEditing(null)}
        />
      )}
      {editingTracker && (
        <TrackerForm
          initial={toDraft(editingTracker)}
          onSave={(draft) => toMessage(updateTracker(editingTracker.id, draft))}
          onCancel={() => setEditing(null)}
        />
      )}
      {editing === null && (
        <>
          <p className="muted tracker-intro">
            Belirli aralıklarla yapılması gereken işleri izleyin (ör. kalıpçı 15 günde 1 döküm).
            Süre aşılırsa gecikme ve kesinti otomatik hesaplanır.
          </p>
          {project.trackers.map((tracker) => (
            <TrackerCard
              key={tracker.id}
              tracker={tracker}
              now={now}
              onEdit={() => setEditing(tracker.id)}
            />
          ))}
          <button type="button" className="button primary" onClick={() => setEditing('new')}>
            + Yeni takip
          </button>
        </>
      )}
    </Modal>
  );
}
