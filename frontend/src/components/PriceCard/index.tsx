import { formatBOB } from '../../utils/formatters';
import { StatusBadge } from '../StatusBadge';
import './PriceCard.css';

interface PriceCardProps {
  label: 'Compra' | 'Venta';
  value: number;
  previousValue?: number;
}

export function PriceCard({ label, value, previousValue }: PriceCardProps) {
  const isCompra = label === 'Compra';

  return (
    <article className={`price-card price-card--${isCompra ? 'compra' : 'venta'}`}>
      <header className="price-card__header">
        <span className="price-card__icon" aria-hidden="true">
          {isCompra ? '🟢' : '🔴'}
        </span>
        <h2 className="price-card__label">{label}</h2>
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
