import type { DollarRecord } from '../../types';
import { formatDateShort } from '../../utils/formatters';
import './PriceChart.css';

interface PriceChartProps {
  records: DollarRecord[];
}

// Dimensiones del SVG (viewBox)
const W = 580;
const H = 220;
const PAD = { top: 16, right: 20, bottom: 36, left: 48 };
const CHART_W = W - PAD.left - PAD.right;
const CHART_H = H - PAD.top - PAD.bottom;

function mapToPoints(
  values: number[],
  min: number,
  range: number,
  n: number,
): { x: number; y: number }[] {
  return values.map((v, i) => ({
    x: PAD.left + (n === 1 ? CHART_W / 2 : (i / (n - 1)) * CHART_W),
    y: PAD.top + CHART_H - ((v - min) / (range || 1)) * CHART_H,
  }));
}

function pointsToStr(pts: { x: number; y: number }[]): string {
  return pts.map((p) => `${p.x},${p.y}`).join(' ');
}

export function PriceChart({ records }: PriceChartProps) {
  if (records.length === 0) {
    return <div className="chart-empty">Sin registros para graficar</div>;
  }

  const compras = records.map((r) => r.compra);
  const ventas = records.map((r) => r.venta);
  const all = [...compras, ...ventas];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const range = max - min;
  const n = records.length;

  const compraPoints = mapToPoints(compras, min, range, n);
  const ventaPoints = mapToPoints(ventas, min, range, n);

  // Grilla horizontal: 4 líneas
  const Y_STEPS = 4;
  const yLines = Array.from({ length: Y_STEPS + 1 }, (_, i) => {
    const value = min + (range / Y_STEPS) * i;
    const y = PAD.top + CHART_H - ((value - min) / (range || 1)) * CHART_H;
    return { value, y };
  });

  // Etiquetas del eje X (máximo 5)
  const xIndices =
    n <= 5
      ? Array.from({ length: n }, (_, i) => i)
      : [0, Math.floor(n / 4), Math.floor(n / 2), Math.floor((3 * n) / 4), n - 1];

  return (
    <div className="price-chart">
      <div className="chart-header">
        <h3 className="chart-title">Historial de precios</h3>
        <div className="chart-legend">
          <span className="legend-dot legend-dot--compra" />
          <span className="legend-label">Compra</span>
          <span className="legend-dot legend-dot--venta" />
          <span className="legend-label">Venta</span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="chart-svg"
        role="img"
        aria-label="Gráfico de líneas con historial de compra y venta del dólar"
      >
        {/* Grid */}
        {yLines.map(({ value, y }, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              y1={y}
              x2={W - PAD.right}
              y2={y}
              className="chart-grid"
            />
            <text x={PAD.left - 6} y={y + 4} className="chart-axis-label" textAnchor="end">
              {value.toFixed(2)}
            </text>
          </g>
        ))}

        {/* Eje X */}
        {xIndices.map((i) => {
          const x = PAD.left + (n === 1 ? CHART_W / 2 : (i / (n - 1)) * CHART_W);
          return (
            <text
              key={i}
              x={x}
              y={H - PAD.bottom + 18}
              className="chart-axis-label"
              textAnchor="middle"
            >
              {formatDateShort(records[i].timestamp)}
            </text>
          );
        })}

        {/* Área bajo la línea de compra */}
        <polygon
          points={[
            ...compraPoints.map((p) => `${p.x},${p.y}`),
            `${compraPoints[compraPoints.length - 1].x},${PAD.top + CHART_H}`,
            `${compraPoints[0].x},${PAD.top + CHART_H}`,
          ].join(' ')}
          className="chart-area chart-area--compra"
        />

        {/* Área bajo la línea de venta */}
        <polygon
          points={[
            ...ventaPoints.map((p) => `${p.x},${p.y}`),
            `${ventaPoints[ventaPoints.length - 1].x},${PAD.top + CHART_H}`,
            `${ventaPoints[0].x},${PAD.top + CHART_H}`,
          ].join(' ')}
          className="chart-area chart-area--venta"
        />

        {/* Líneas */}
        <polyline points={pointsToStr(compraPoints)} className="chart-line chart-line--compra" />
        <polyline points={pointsToStr(ventaPoints)} className="chart-line chart-line--venta" />

        {/* Puntos en cada valor */}
        {compraPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} className="chart-dot chart-dot--compra">
            <title>{`Compra: Bs. ${compras[i].toFixed(2)}`}</title>
          </circle>
        ))}
        {ventaPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} className="chart-dot chart-dot--venta">
            <title>{`Venta: Bs. ${ventas[i].toFixed(2)}`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}
