// Yatay ilerleme çubuğu (0–100). Değer yazıyla da verilir; yalnızca renge dayanmaz.
import { formatPercent } from '../../utils/number';

interface ProgressBarProps {
  value: number;
  label: string;
  size?: 'small' | 'large';
}

export function ProgressBar({ value, label, size = 'small' }: ProgressBarProps) {
  return (
    <span
      className={`progress progress-${size}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-valuetext={formatPercent(value)}
    >
      <span className="progress-fill" style={{ width: `${value}%` }} />
    </span>
  );
}
