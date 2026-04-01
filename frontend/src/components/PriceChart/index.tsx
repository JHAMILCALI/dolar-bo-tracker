import { useState, useRef } from 'react';
import type { DollarRecord } from '../../types';
import './PriceChart.css';

type PriceType = 'compra' | 'venta';
type RangeType  = 'day' | 'week' | 'month' | 'year';

interface PriceChartProps {
  records: DollarRecord[];
}

// ── Constantes SVG ──────────────────────────────────────────
const VW = 700;
const VH = 300;
const PAD = { top: 20, right: 24, bottom: 64, left: 52 };
const CHART_W = VW - PAD.left - PAD.right;
const CHART_H = VH - PAD.top - PAD.bottom;
const Y_STEPS = 10;
const GREEN = '#00c368';

// ── Utilidades ──────────────────────────────────────────────
function filterByRange(records: DollarRecord[], range: RangeType): DollarRecord[] {
  if (records.length === 0) return records;
  if (range === 'day') {
    // Mostrar todos los registros del día más reciente de la BD
    const lastDate = new Date(records[records.length - 1].timestamp);
    const dayStart = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate(), 0, 0, 0, 0);
    const dayEnd   = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate(), 23, 59, 59, 999);
    return records.filter((r) => {
      const d = new Date(r.timestamp);
      return d >= dayStart && d <= dayEnd;
    });
  }
  // Usar el último registro de la BD como referencia, no la fecha actual
  const last   = new Date(records[records.length - 1].timestamp);
  const cutoff = new Date(last);
  if      (range === 'week')  cutoff.setDate(last.getDate() - 7);
  else if (range === 'month') cutoff.setMonth(last.getMonth() - 1);
  else                        cutoff.setFullYear(last.getFullYear() - 1);
  return records.filter((r) => new Date(r.timestamp) >= cutoff);
}

// Agrupa registros por día calendario y devuelve un registro promedio por día
function aggregateByDay(records: DollarRecord[]): DollarRecord[] {
  const map = new Map<string, DollarRecord[]>();
  for (const r of records) {
    const d = new Date(r.timestamp);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return Array.from(map.entries()).map(([, group]) => {
    const avg = (vals: number[]) => Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
    // Usar la medianoche del día como timestamp representativo
    const d = new Date(group[0].timestamp);
    const dayTs = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0).toISOString();
    return {
      timestamp: dayTs,
      compra: avg(group.map((r) => r.compra)),
      venta:  avg(group.map((r) => r.venta)),
    };
  });
}

function fmtAxisDate(ts: string): string {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

function fmtAxisTime(ts: string): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtRangeDisplay(records: DollarRecord[], range: RangeType): string {
  if (records.length === 0) return 'Sin datos';
  const fmtDate = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const fmtDateTime = (d: Date) =>
    `${fmtDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (range === 'day') {
    return `${fmtDateTime(new Date(records[0].timestamp))} - ${fmtDateTime(new Date(records[records.length - 1].timestamp))}`;
  }
  return `${fmtDate(new Date(records[0].timestamp))} - ${fmtDate(new Date(records[records.length - 1].timestamp))}`;
}

function downloadCSV(records: DollarRecord[], type: PriceType): void {
  const rows = ['Fecha,Precio BOB', ...records.map((r) => {
    const d = new Date(r.timestamp);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()},${type === 'compra' ? r.compra : r.venta}`;
  })].join('\n');
  const url = URL.createObjectURL(new Blob([rows], { type: 'text/csv;charset=utf-8;' }));
  const a   = Object.assign(document.createElement('a'), { href: url, download: `dolar-bolivia-${type}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}

// ── Componente ──────────────────────────────────────────────
export function PriceChart({ records }: PriceChartProps) {
  const [priceType, setPriceType] = useState<PriceType>('compra');
  const [range,     setRange]     = useState<RangeType>('day');
  const [tooltip,   setTooltip]   = useState<{ x: number; y: number; value: number; date: string } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (records.length === 0) {
    return <div className="hchart-empty">Sin registros para graficar</div>;
  }

  const filtered = filterByRange(records, range);
  // Para semana/mes/año: agrupar por día y promediar los registros de 2h
  const chartData = range === 'day' ? filtered : aggregateByDay(filtered);
  const values   = chartData.map((r) => (priceType === 'compra' ? r.compra : r.venta));
  const n        = chartData.length;

  // ── Escala Y ───────────────────────────────────────────────
  const rawMin   = n ? Math.min(...values) : 0;
  const rawMax   = n ? Math.max(...values) : 1;
  const pad      = (rawMax - rawMin) * 0.1 || 0.05;
  const yMin     = rawMin - pad;
  const yMax     = rawMax + pad;
  const yRange   = yMax - yMin;

  const toX = (i: number) => PAD.left + (n <= 1 ? CHART_W / 2 : (i / (n - 1)) * CHART_W);
  const toY = (v: number) => PAD.top + CHART_H - ((v - yMin) / yRange) * CHART_H;

  // ── Grid Y ─────────────────────────────────────────────────
  const yGrid = Array.from({ length: Y_STEPS + 1 }, (_, i) => {
    const v = yMin + (yRange / Y_STEPS) * i;
    return { v, y: toY(v) };
  });

  // ── Etiquetas X (máx 11) ───────────────────────────────────
  const step       = n <= 11 ? 1 : Math.ceil(n / 10);
  const xLabelIdxs = Array.from({ length: n }, (_, i) => i).filter(
    (i) => i % step === 0 || i === n - 1,
  );

  // ── Path SVG ───────────────────────────────────────────────
  const pathD = n
    ? values.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join('')
    : '';

  // ── Tooltip ───────────────────────────────────────────────
  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current || n === 0) return;
    const rect   = svgRef.current.getBoundingClientRect();
    const scaleX = VW / rect.width;
    const mx     = (e.clientX - rect.left) * scaleX;
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < n; i++) {
      const dx = Math.abs(toX(i) - mx);
      if (dx < bestDist) { bestDist = dx; best = i; }
    }
    if (bestDist < 40) {
      const dateFmt = range === 'day' ? fmtAxisTime(chartData[best].timestamp) : fmtAxisDate(chartData[best].timestamp);
      setTooltip({ x: toX(best), y: toY(values[best]), value: values[best], date: dateFmt });
    } else {
      setTooltip(null);
    }
  }

  // Tooltip: voltear si está cerca del borde derecho
  const tooltipFlip = tooltip && tooltip.x > VW * 0.70;

  return (
    <div className="hchart-wrapper">
      <h2 className="hchart-title">Precio Histórico del Dólar en Bolivia</h2>

      {/* Toggle Compra / Venta */}
      <div className="hchart-toggle">
        <button
          className={`hchart-toggle-btn${priceType === 'venta' ? ' active' : ''}`}
          onClick={() => setPriceType('venta')}
        >
          Precio de Venta
        </button>
        <button
          className={`hchart-toggle-btn${priceType === 'compra' ? ' active' : ''}`}
          onClick={() => setPriceType('compra')}
        >
          Precio de Compra
        </button>
      </div>

      {/* Panel oscuro */}
      <div className="hchart-panel">
        <div className="hchart-panel-header">
          <h3 className="hchart-panel-title">📅 Rango Personalizado</h3>
          <button className="hchart-download-btn" onClick={() => downloadCSV(filtered, priceType)}>
            Descargar Excel
          </button>
        </div>

        <div className="hchart-controls">
          <div className="hchart-daterange">
            <label className="hchart-daterange-label">Desde:</label>
            <input
              className="hchart-daterange-input"
              type="text"
              readOnly
              value={fmtRangeDisplay(filtered, range)}
            />
          </div>
          <div className="hchart-radios">
            {(['day', 'week', 'month', 'year'] as RangeType[]).map((r) => (
              <label key={r} className="hchart-radio-label">
                <input
                  type="radio"
                  name="hchart-range"
                  value={r}
                  checked={range === r}
                  onChange={() => setRange(r)}
                  className="hchart-radio-input"
                />
                {r === 'day' ? 'Día' : r === 'week' ? 'Semana' : r === 'month' ? 'Mes' : 'Año'}
              </label>
            ))}
          </div>
        </div>

        {/* SVG chart */}
        <div className="hchart-svg-container">
          {n === 0 ? (
            <div className="hchart-no-data">Sin datos en este rango</div>
          ) : (
            <svg
              ref={svgRef}
              viewBox={`0 0 ${VW} ${VH}`}
              className="hchart-svg"
              role="img"
              aria-label={`Gráfico histórico precio de ${priceType} del dólar en Bolivia`}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setTooltip(null)}
            >
              {/* Grid horizontal */}
              {yGrid.map(({ v, y }, i) => (
                <g key={i}>
                  <line
                    x1={PAD.left} y1={y} x2={PAD.left + CHART_W} y2={y}
                    stroke="#333" strokeWidth="1" strokeDasharray="4 4"
                  />
                  <text
                    x={PAD.left - 6} y={y + 4}
                    fill="#fff" fontSize="11" textAnchor="end" fontFamily="sans-serif"
                  >
                    {v.toFixed(2)}
                  </text>
                </g>
              ))}

              {/* Eje X con etiquetas rotadas */}
              {xLabelIdxs.map((i) => (
                <g key={i} transform={`translate(${toX(i).toFixed(1)},${PAD.top + CHART_H})`}>
                  <line x1="0" x2="0" y1="0" y2="5" stroke="#777" strokeWidth="1" />
                  <text
                    dominantBaseline="central"
                    textAnchor="end"
                    transform="translate(0,10) rotate(-45)"
                    fill="#fff" fontSize="11" fontFamily="sans-serif"
                  >
                    {range === 'day' ? fmtAxisTime(chartData[i].timestamp) : fmtAxisDate(chartData[i].timestamp)}
                  </text>
                </g>
              ))}

              {/* Línea de precio */}
              <path d={pathD} fill="none" stroke={GREEN} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

              {/* Puntos */}
              {values.map((v, i) => (
                <circle
                  key={i} cx={toX(i)} cy={toY(v)} r="4"
                  fill={GREEN} stroke="#fff" strokeWidth="2"
                  style={{ pointerEvents: 'none' }}
                />
              ))}

              {/* Leyenda */}
              <g transform={`translate(${PAD.left + CHART_W - 60},${PAD.top - 4})`}>
                <circle r="7" cx="7" cy="7" fill={GREEN} />
                <text x="20" y="11" fill="#fff" fontSize="11" fontFamily="sans-serif" dominantBaseline="central">
                  Precio
                </text>
              </g>

              {/* Tooltip */}
              {tooltip && (
                <g style={{ pointerEvents: 'none' }}>
                  <line
                    x1={tooltip.x} y1={PAD.top}
                    x2={tooltip.x} y2={PAD.top + CHART_H}
                    stroke={GREEN} strokeWidth="1" strokeDasharray="3 3"
                  />
                  <circle cx={tooltip.x} cy={tooltip.y} r="6" fill={GREEN} stroke="#fff" strokeWidth="2" />
                  <rect
                    x={tooltipFlip ? tooltip.x - 106 : tooltip.x + 8}
                    y={tooltip.y - 26}
                    width="98" height="48" rx="5"
                    fill="#1a2e23" stroke={GREEN} strokeWidth="1"
                  />
                  <text
                    x={tooltipFlip ? tooltip.x - 102 : tooltip.x + 12}
                    y={tooltip.y - 10}
                    fill="#ccc" fontSize="11" fontFamily="sans-serif"
                  >
                    {tooltip.date}
                  </text>
                  <text
                    x={tooltipFlip ? tooltip.x - 102 : tooltip.x + 12}
                    y={tooltip.y + 8}
                    fill={GREEN} fontSize="13" fontWeight="bold" fontFamily="sans-serif"
                  >
                    {tooltip.value.toFixed(2)} BOB
                  </text>
                </g>
              )}
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
