import { useDollarData } from './hooks/useDollarData';
import { PriceCard } from './components/PriceCard';
import { PriceChart } from './components/PriceChart';
import { HistoryTable } from './components/HistoryTable';
import { formatDate } from './utils/formatters';
import './App.css';

export default function App() {
  const { data, loading, error, refetch } = useDollarData();

  const records = data?.records ?? [];
  const latest = records[records.length - 1];
  const previous = records[records.length - 2];

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__flag" aria-hidden="true">🇧🇴</span>
          <div>
            <h1 className="app-header__title">Dólar Bolivia</h1>
            <p className="app-header__subtitle">Precio paralelo — USD / BOB</p>
          </div>
        </div>
        <div className="app-header__meta">
          {data?.lastUpdated && (
            <p className="app-header__updated">
              Actualizado: <strong>{formatDate(data.lastUpdated)}</strong>
            </p>
          )}
          {data?.source && (
            <p className="app-header__source">
              Fuente:{' '}
              <a href={data.source} target="_blank" rel="noopener noreferrer">
                {new URL(data.source).hostname}
              </a>
            </p>
          )}
          <button className="btn-refresh" onClick={refetch} aria-label="Actualizar datos">
            ↻ Actualizar
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="app-main">
        {loading && (
          <div className="state-box state-box--loading" role="status">
            <span className="spinner" aria-hidden="true" />
            Cargando datos…
          </div>
        )}

        {!loading && error && (
          <div className="state-box state-box--error" role="alert">
            <strong>Error al cargar los datos:</strong> {error}
            <button className="btn-retry" onClick={refetch}>Reintentar</button>
          </div>
        )}

        {!loading && !error && records.length === 0 && (
          <div className="state-box state-box--empty">
            No hay registros disponibles aún. Ejecuta el scraper primero.
          </div>
        )}

        {!loading && !error && latest && (
          <>
            {/* Tarjetas de precio */}
            <section className="section-cards" aria-label="Precios actuales">
              <PriceCard
                label="Compra"
                value={latest.compra}
                previousValue={previous?.compra}
              />
              <PriceCard
                label="Venta"
                value={latest.venta}
                previousValue={previous?.venta}
              />
            </section>

            {/* Gráfico */}
            <section aria-label="Gráfico de historial">
              <PriceChart records={records} />
            </section>

            {/* Tabla de historial */}
            <section aria-label="Tabla de historial">
              <h2 className="section-title">Historial completo</h2>
              <HistoryTable records={records} />
            </section>
          </>
        )}
      </main>

      <footer className="app-footer">
        Datos obtenidos de{' '}
        {data?.source
          ? <a href={data.source} target="_blank" rel="noopener noreferrer">{data.source}</a>
          : 'dolarboliviahoy.com'
        }
      </footer>
    </div>
  );
}
