import type { ExchangeRate } from '../../types';
import { formatBOB } from '../../utils/formatters';
import './ExchangesTable.css';

interface ExchangesTableProps {
  exchanges: ExchangeRate[];
}

export function ExchangesTable({ exchanges }: ExchangesTableProps) {
  if (exchanges.length === 0) {
    return <p className="exchanges-empty">No hay datos de exchanges disponibles.</p>;
  }

  return (
    <div className="exchanges-table-wrapper">
      <div className="exchanges-scroll">
        <table className="exchanges-table">
          <thead>
            <tr>
              <th scope="col">Exchange</th>
              <th scope="col">Precio Compra</th>
              <th scope="col">Precio Venta</th>
              <th scope="col">Acción</th>
            </tr>
          </thead>
          <tbody>
            {exchanges.map((ex) => (
              <tr key={ex.name}>
                <td className="cell-exchange">
                  <div className="exchange-avatar">{ex.name.charAt(0)}</div>
                  <span className="exchange-name">{ex.name}</span>
                </td>
                <td className="cell-compra">
                  {ex.compra != null && ex.compra > 0
                    ? formatBOB(ex.compra)
                    : <span className="cell-na">—</span>}
                </td>
                <td className="cell-venta">
                  {ex.venta != null && ex.venta > 0
                    ? formatBOB(ex.venta)
                    : <span className="cell-na">—</span>}
                </td>
                <td className="cell-action">
                  {ex.url ? (
                    <a
                      className="btn-exchange"
                      href={ex.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Comprar ahora
                    </a>
                  ) : (
                    <span className="cell-na">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
