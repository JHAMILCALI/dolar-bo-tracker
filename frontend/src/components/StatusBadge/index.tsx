import { getTrend } from '../../utils/formatters';
import './StatusBadge.css';

interface StatusBadgeProps {
  current: number;
  previous: number;
}

const CONFIG = {
  up:     { icon: '↑', label: 'Subió',  mod: 'up' },
  down:   { icon: '↓', label: 'Bajó',   mod: 'down' },
  stable: { icon: '→', label: 'Igual',  mod: 'stable' },
} as const;

export function StatusBadge({ current, previous }: StatusBadgeProps) {
  const trend = getTrend(current, previous);
  const { icon, label, mod } = CONFIG[trend];

  return (
    <span className={`status-badge status-badge--${mod}`} aria-label={label}>
      <span className="status-badge__icon" aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}
