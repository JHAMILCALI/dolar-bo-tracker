import type { DollarRecord } from '../../types';
import { formatDate, formatBOB, getTrend } from '../../utils/formatters';
import './HistoryTable.css';

interface HistoryTableProps {
  records: DollarRecord[];
}

const TREND_ICON: Record<ReturnType<typeof getTrend>, string> = {
  up:     '↑',
  down:   '↓',
  stable: '→',
};

const TREND_CLASS: Record<ReturnType<typeof getTrend>, string> = {
  up:     'trend--up',
  down:   'trend--down',
  stable: 'trend--stable',
};

export function HistoryTable({ records }: HistoryTableProps) {
  if (records.length === 0) {
    return <p className="table-empty">No hay registros históricos aún.</p>;
  }

  // Mostrar más recientes primero
  const sorted = [...records].reverse();

  return (
    <div className="history-table-wrapper">
      <div className="table-scroll">
        <table className="history-table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Fecha y hora</th>
              <th scope="col">Compra</th>
              <th scope="col">Venta</th>
              <th scope="col">Δ Compra</th>
              <th scope="col">Δ Venta</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((record, i) => {
              // i=0 es el más reciente → sin anterior en vista
              // El "anterior" en la vista es el siguiente en el array sorted
              const prevRecord = sorted[i + 1];

              const compTrend = prevRecord
                ? getTrend(record.compra, prevRecord.compra)
                : null;
              const ventTrend = prevRecord
                ? getTrend(record.venta, prevRecord.venta)
                : null;

              const isLatest = i === 0;

              return (
                <tr key={record.timestamp} className={isLatest ? 'row--latest' : ''}>
                  <td className="cell--index">
                    {records.length - i}
                    {isLatest && <span className="badge-latest">Último</span>}
                  </td>
                  <td className="cell--date">{formatDate(record.timestamp)}</td>
                  <td className="cell--price cell--compra">{formatBOB(record.compra)}</td>
                  <td className="cell--price cell--venta">{formatBOB(record.venta)}</td>
                  <td>
                    {compTrend ? (
                      <span className={`trend ${TREND_CLASS[compTrend]}`}>
                        {TREND_ICON[compTrend]}
                      </span>
                    ) : (
                      <span className="trend trend--none">—</span>
                    )}
                  </td>
                  <td>
                    {ventTrend ? (
                      <span className={`trend ${TREND_CLASS[ventTrend]}`}>
                        {TREND_ICON[ventTrend]}
                      </span>
                    ) : (
                      <span className="trend trend--none">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="table-footer">{records.length} registro{records.length !== 1 ? 's' : ''} en total</p>
    </div>
  );
}
