// Özet kartlar (PROJECT.md 4.3 / 10.5): genel ilerleme, kalan gün, geciken iş, bu hafta, sapma.
// 5 saniyede okunacak şekilde: büyük değer + kısa etiket. Durum rengi her zaman simge ve yazıyla gelir.
// Geciken ve bu hafta kartları tıklanınca ilgili hızlı filtreyi uygular.
import type { ReactNode } from 'react';
import { countMatching, type QuickFilter } from '../../domain/filters';
import { checkWeights, overallProgress } from '../../domain/progress';
import { remainingDays, remainingDaysLabel } from '../../domain/schedule';
import { deviation } from '../../domain/scurve';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import type { ISODateTime } from '../../types';
import { formatDateTime } from '../../utils/date';
import { formatPercent, formatSigned } from '../../utils/number';
import { ProgressBar } from '../common/ProgressBar';

type Tone = 'neutral' | 'good' | 'bad';

interface CardProps {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: Tone;
  /** Verilirse kart tıklanabilir ve bu filtreyi uygular */
  filter?: QuickFilter;
  children?: ReactNode;
}

function Card({ label, value, detail, tone = 'neutral', filter, children }: CardProps) {
  const active = useUiStore((state) => state.filter);
  const setFilter = useUiStore((state) => state.setFilter);
  const body = (
    <>
      <span className="card-label">{label}</span>
      <span className="card-value">{value}</span>
      {children}
      {detail && <span className="card-detail">{detail}</span>}
    </>
  );
  if (!filter) return <div className={`card tone-${tone}`}>{body}</div>;
  const pressed = active === filter;
  return (
    <button
      type="button"
      className={`card card-button tone-${tone}`}
      aria-pressed={pressed}
      title={pressed ? 'Filtreyi kaldır' : 'Tabloda yalnızca bunları göster'}
      onClick={() => setFilter(pressed ? 'all' : filter)}
    >
      {body}
    </button>
  );
}

function WeightNotice({ total, diff, state }: ReturnType<typeof checkWeights>) {
  if (state === 'ok')
    return <span className="weight-ok">✔ Ağırlık toplamı {formatPercent(total)}</span>;
  const detail = state === 'missing' ? 'eksik' : 'fazla';
  return (
    <span className="weight-warning" role="status">
      ⚠ Ağırlıklar {formatPercent(total)} ({formatPercent(diff)} {detail})
    </span>
  );
}

export function SummaryCards({ now }: { now: ISODateTime }) {
  const project = useProjectStore((state) => state.project);
  const { groups } = project;

  const progress = overallProgress(groups);
  const days = remainingDays(project.end, now);
  const delayed = countMatching(groups, 'delayed', now);
  const thisWeek = countMatching(groups, 'thisWeek', now);
  const gap = deviation(groups, now);

  return (
    <section className="summary-cards" aria-label="Proje özeti">
      <Card
        label="Genel ilerleme"
        value={formatPercent(progress)}
        detail={<WeightNotice {...checkWeights(groups)} />}
      >
        <ProgressBar value={progress} label="Genel ilerleme" size="large" />
      </Card>
      <Card
        label="Kalan süre"
        value={days === null ? '—' : remainingDaysLabel(days)}
        tone={days !== null && days < 0 ? 'bad' : 'neutral'}
        detail={`Bitiş: ${formatDateTime(project.end).slice(0, 10)}`}
      />
      <Card
        label="Geciken iş"
        value={delayed > 0 ? `⚠ ${delayed}` : '✔ 0'}
        tone={delayed > 0 ? 'bad' : 'good'}
        detail={delayed > 0 ? 'Göstermek için tıklayın' : 'Geciken iş yok'}
        filter="delayed"
      />
      <Card
        label="Bu hafta"
        value={`${thisWeek} iş`}
        detail="Bu hafta planlı, bitmemiş"
        filter="thisWeek"
      />
      <Card
        label="Sapma (plana göre)"
        value={`${gap > 0 ? '▲' : gap < 0 ? '▼' : '●'} ${formatSigned(gap)} puan`}
        tone={gap < 0 ? 'bad' : gap > 0 ? 'good' : 'neutral'}
        detail={gap > 0 ? 'Plandan öndeyiz' : gap < 0 ? 'Plandan gerideyiz' : 'Planla aynı'}
      />
    </section>
  );
}
