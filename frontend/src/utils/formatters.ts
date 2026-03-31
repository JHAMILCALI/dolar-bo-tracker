/**
 * Formatea una fecha ISO a formato legible en español (Bolivia).
 */
export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString('es-BO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formatea un número como precio en Bolivianos.
 */
export function formatBOB(value: number): string {
  return `Bs. ${value.toFixed(2)}`;
}

/**
 * Formatea solo la fecha (sin hora) de una cadena ISO.
 */
export function formatDateShort(isoString: string): string {
  const d = new Date(isoString);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

/**
 * Devuelve la tendencia entre dos valores numéricos.
 */
export function getTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'stable';
}
