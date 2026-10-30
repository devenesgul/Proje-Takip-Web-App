// S-eğrisi grafiği (SVG, ek kütüphane yok): planlanan (kesikli) ve gerçekleşen (düz) kümülatif ilerleme.
// Tek y ekseni (%0–100), ay işaretli x ekseni, "Bugün" çizgisi, gerçekleşenin son değeri etiketli.
// Fare veya klavye (← → , Shift ile ay, Home/End) ile tarih seçilir; ipucu iki serinin değerini gösterir.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { valueAt, type CurvePoint, type SCurve } from '../../domain/scurve';
import { monthTicks } from '../../domain/timeline';
import type { ISODateTime } from '../../types';
import { dayNumber, formatDateTime, isoFromDay } from '../../utils/date';
import { formatPercent } from '../../utils/number';

const HEIGHT = 170;
const PAD = { top: 16, right: 64, bottom: 24, left: 44 };
const Y_TICKS = [0, 25, 50, 75, 100];
const MAX_X_TICKS = 8;
/** Bir x işareti için gereken yaklaşık genişlik (px) */
const X_TICK_WIDTH = 72;
const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30;
const MIN_WIDTH = 320;

interface SCurveChartProps {
  curve: SCurve;
  now: ISODateTime;
}

/** Kapsayıcı genişliğini izler (grafik responsive çizilsin diye). */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, Math.max(MIN_WIDTH, width)] as const;
}

const days = (points: CurvePoint[]) =>
  points.map((p) => dayNumber(p.date)).filter((d): d is number => d !== null);

export function SCurveChart({ curve, now }: SCurveChartProps) {
  const [containerRef, width] = useWidth();
  const [cursorDay, setCursorDay] = useState<number | null>(null);

  const all = [...days(curve.planned), ...days(curve.actual)];
  if (all.length === 0) return <p className="muted">Grafik için tarihli kalem yok.</p>;
  const minDay = Math.floor(Math.min(...all));
  const maxDay = Math.ceil(Math.max(...all));
  const span = Math.max(1, maxDay - minDay);

  const plotWidth = width - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const x = (day: number) => PAD.left + ((day - minDay) / span) * plotWidth;
  const y = (value: number) => PAD.top + (1 - value / 100) * plotHeight;
  const path = (points: CurvePoint[]) =>
    points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(dayNumber(p.date) ?? minDay)},${y(p.value)}`)
      .join(' ');

  const ticks = monthTicks(
    minDay,
    maxDay,
    Math.min(MAX_X_TICKS, Math.floor(plotWidth / X_TICK_WIDTH)),
  );
  const todayDay = dayNumber(now);
  const todayVisible = todayDay !== null && todayDay >= minDay && todayDay <= maxDay;
  const lastActual = curve.actual.at(-1);

  const cursorIso = cursorDay === null ? null : isoFromDay(cursorDay);
  const cursorPlanned = cursorIso ? valueAt(curve.planned, cursorIso) : null;
  const cursorActual = cursorIso ? valueAt(curve.actual, cursorIso) : null;

  const clampDay = (day: number) => Math.min(maxDay, Math.max(minDay, Math.round(day)));

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    setCursorDay(clampDay(minDay + ((px - PAD.left) / plotWidth) * span));
  };

  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const start = cursorDay ?? clampDay(todayDay ?? minDay);
    const step = event.shiftKey ? DAYS_PER_MONTH : DAYS_PER_WEEK;
    const moves: Record<string, number> = {
      ArrowLeft: start - step,
      ArrowRight: start + step,
      Home: minDay,
      End: maxDay,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    setCursorDay(clampDay(moves[event.key]));
  };

  const summary =
    `S-eğrisi: ${formatDateTime(isoFromDay(minDay)).slice(0, 10)} – ${formatDateTime(isoFromDay(maxDay)).slice(0, 10)}. ` +
    (lastActual ? `Gerçekleşen son değer ${formatPercent(lastActual.value)}.` : '');

  return (
    <div className="scurve" ref={containerRef}>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={summary}
        tabIndex={0}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setCursorDay(null)}
        onKeyDown={onKeyDown}
        onBlur={() => setCursorDay(null)}
      >
        {Y_TICKS.map((tick) => (
          <g key={tick}>
            <line
              className="scurve-grid"
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text
              className="scurve-axis"
              x={PAD.left - 6}
              y={y(tick)}
              textAnchor="end"
              dominantBaseline="middle"
            >
              {formatPercent(tick)}
            </text>
          </g>
        ))}
        {ticks.map((tick) => (
          <text
            key={tick.day}
            className="scurve-axis"
            x={x(tick.day)}
            y={HEIGHT - 6}
            textAnchor="middle"
          >
            {tick.label}
          </text>
        ))}

        {todayVisible && (
          <g>
            <line
              className="scurve-today"
              x1={x(todayDay)}
              x2={x(todayDay)}
              y1={PAD.top}
              y2={PAD.top + plotHeight}
            />
            <text className="scurve-axis" x={x(todayDay) + 4} y={PAD.top - 4}>
              Bugün
            </text>
          </g>
        )}

        <path className="scurve-line scurve-planned" d={path(curve.planned)} />
        <path className="scurve-line scurve-actual" d={path(curve.actual)} />

        {lastActual && (
          <g>
            <circle
              className="scurve-dot"
              cx={x(dayNumber(lastActual.date) ?? minDay)}
              cy={y(lastActual.value)}
              r={4}
            />
            <text
              className="scurve-end-label"
              x={x(dayNumber(lastActual.date) ?? minDay) + 8}
              y={y(lastActual.value)}
              dominantBaseline="middle"
            >
              {formatPercent(lastActual.value)}
            </text>
          </g>
        )}

        {cursorDay !== null && (
          <line
            className="scurve-crosshair"
            x1={x(cursorDay)}
            x2={x(cursorDay)}
            y1={PAD.top}
            y2={PAD.top + plotHeight}
          />
        )}
      </svg>

      {cursorIso && (
        <div
          className="scurve-tooltip"
          role="status"
          style={{ left: Math.min(x(cursorDay ?? minDay) + 12, width - 180) }}
        >
          <div className="tooltip-date">{formatDateTime(cursorIso).slice(0, 10)}</div>
          <div className="tooltip-row">
            <span className="key key-actual" aria-hidden="true" />
            <strong>{cursorActual === null ? '—' : formatPercent(cursorActual)}</strong> Gerçekleşen
          </div>
          <div className="tooltip-row">
            <span className="key key-planned" aria-hidden="true" />
            <strong>{cursorPlanned === null ? '—' : formatPercent(cursorPlanned)}</strong> Planlanan
          </div>
        </div>
      )}
    </div>
  );
}
