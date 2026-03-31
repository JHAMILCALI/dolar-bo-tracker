import { formatBOB } from '../../utils/formatters';
import { StatusBadge } from '../StatusBadge';
import './PriceCard.css';

interface PriceCardProps {
  label: string;
  value: number;
  previousValue?: number;
  /** 'hero' = tarjeta grande con fondo coloreado | 'mini' = card compacta por exchange */
  variant?: 'hero' | 'mini';
  /** Solo para variant='mini': muestra también el precio de venta */
  ventaValue?: number;
  href?: string;
}

export function PriceCard({
  label,
  value,
  previousValue,
  variant = 'hero',
  ventaValue,
  href,
}: PriceCardProps) {
  const isCompra = label === 'Compra';
  const isVenta  = label === 'Venta';

  if (variant === 'mini') {
    return (
      <article className="exchange-card">
        <div className="exchange-card__name">{label}</div>
        <div className="exchange-card__row">
          <span className="exchange-card__lbl">Compra</span>
          <span className="exchange-card__price exchange-card__price--compra">
            {value > 0 ? formatBOB(value) : '—'}
          </span>
        </div>
        {ventaValue !== undefined && (
          <div className="exchange-card__row">
            <span className="exchange-card__lbl">Venta</span>
            <span className="exchange-card__price exchange-card__price--venta">
              {ventaValue > 0 ? formatBOB(ventaValue) : '—'}
            </span>
          </div>
        )}
        {href && (
          <a
            className="exchange-card__link"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver plataforma ↗
          </a>
        )}
      </article>
    );
  }

  return (
    <article className={`price-card price-card--${isCompra ? 'compra' : isVenta ? 'venta' : 'neutral'}`}>
      <header className="price-card__header">
        <h2 className="price-card__label">
          {isCompra ? 'Precio de Compra' : isVenta ? 'Precio de Venta' : label}
        </h2>
        {previousValue !== undefined && (
          <StatusBadge current={value} previous={previousValue} />
        )}
      </header>

      <p className="price-card__value">{formatBOB(value)}</p>

      {previousValue !== undefined && (
        <p className="price-card__prev">
          Anterior: <span>{formatBOB(previousValue)}</span>
        </p>
      )}

      <p className="price-card__sub">USD → BOB</p>
    </article>
  );
}
