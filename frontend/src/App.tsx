import { useDollarData } from './hooks/useDollarData';
import { PriceCard } from './components/PriceCard';
import { PriceChart } from './components/PriceChart';
import { HistoryTable } from './components/HistoryTable';
import { ExchangesTable } from './components/ExchangesTable';
import { formatDate } from './utils/formatters';
import './App.css';

export default function App() {
  const { data, loading, error, refetch } = useDollarData();

  const records  = data?.records  ?? [];
  const exchanges = data?.exchanges ?? [];
  const latest   = records[records.length - 1];
  const previous = records[records.length - 2];

  return (
    <div className="app">
      {/* ── Barra de navegación ── */}
      <nav className="app-nav">
        <a className="nav-brand" href="/" aria-label="Inicio">
          <div className="nav-logo">$</div>
          <span className="nav-sitename">Dólar Bolivia Hoy</span>
        </a>
        <div className="nav-links">
          <a href="#comparativa">Exchanges</a>
          <a href="#historico">Historial</a>
          {data?.source && (
            <a href={data.source} target="_blank" rel="noopener noreferrer">
              Fuente ↗
            </a>
          )}
          <button className="btn-refresh" onClick={refetch} aria-label="Actualizar datos">
            ↻ Actualizar
          </button>
        </div>
      </nav>

      {/* ── Contenido principal ── */}
      <main className="app-main">

        {/* Cabecera */}
        <div className="hero">
          <h1 className="hero__title">Precio del Dólar Paralelo en Bolivia Hoy</h1>
          <p className="hero__sub">Referencia para compra y venta del dólar blue / paralelo</p>
          {data?.lastUpdated && (
            <span className="hero__updated">
              Precio actualizado: <strong>{formatDate(data.lastUpdated)}</strong>
            </span>
          )}
        </div>

        {/* Estados globales */}
        {loading && (
          <div className="state-box state-box--loading" role="status">
            <span className="spinner" aria-hidden="true" />
            Cargando datos…
          </div>
        )}

        {!loading && error && (
          <div className="state-box state-box--error" role="alert">
            <strong>Error al cargar los datos:</strong>&nbsp;{error}
            <button className="btn-retry" onClick={refetch}>Reintentar</button>
          </div>
        )}

        {!loading && !error && records.length === 0 && (
          <div className="state-box state-box--empty">
            Sin registros aún. Ejecuta el scraper: <code>python scripts/scrape.py</code>
          </div>
        )}

        {!loading && !error && latest && (
          <>
            {/* Tarjetas principales Compra / Venta */}
            <section className="section-hero-cards" aria-label="Precio actual del dólar">
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

            {/* Mini cards por exchange (si el scraper los extrajo) */}
            {exchanges.length > 0 && (
              <section aria-label="Precios por exchange">
                <div className="section-header">
                  <h2 className="section-title">Precio del Dólar en Bolivia Hoy</h2>
                  <span className="section-label">Por exchange</span>
                </div>
                <div className="section-exchange-cards">
                  {exchanges.map((ex) => (
                    <PriceCard
                      key={ex.name}
                      label={ex.name as 'Compra'}
                      value={ex.compra ?? 0}
                      previousValue={undefined}
                      variant="mini"
                      ventaValue={ex.venta ?? undefined}
                      href={ex.url ?? undefined}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Tabla comparativa de exchanges */}
            {exchanges.length > 0 && (
              <section id="comparativa" aria-label="Comparativa de exchanges">
                <div className="section-header">
                  <h2 className="section-title">Comparativa de Exchanges</h2>
                  <span className="section-label">USD / BOB</span>
                </div>
                <ExchangesTable exchanges={exchanges} />
              </section>
            )}

            {/* Gráfico histórico */}
            <section id="historico" aria-label="Gráfico histórico de precios">
              <div className="section-header">
                <h2 className="section-title">Precio Histórico del Dólar en Bolivia</h2>
                <span className="section-label">{records.length} registros</span>
              </div>
              <PriceChart records={records} />
            </section>

            {/* Tabla de historial */}
            <section aria-label="Tabla de historial">
              <div className="section-header">
                <h2 className="section-title">Historial completo</h2>
              </div>
              <HistoryTable records={records} />
            </section>
          </>
        )}
      </main>

      {/* ── Pie de página ── */}
      <footer className="app-footer">
        Datos obtenidos de{' '}
        {data?.source
          ? <a href={data.source} target="_blank" rel="noopener noreferrer">{data.source}</a>
          : 'dolarboliviahoy.com'
        }
        {' '} · © {new Date().getFullYear()} Dólar Bolivia Hoy
      </footer>
    </div>
  );
}
