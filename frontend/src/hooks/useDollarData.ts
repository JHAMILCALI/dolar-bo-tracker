import { useState, useEffect } from 'react';
import type { DollarDB } from '../types';

export interface UseDollarDataResult {
  data: DollarDB | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDollarData(): UseDollarDataResult {
  const [data, setData] = useState<DollarDB | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    // Resetear estado al inicio del efecto de forma unificada
    const reset = () => {
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }
    };
    reset();

    // Cache-bust para que Vite no sirva la versión en caché
    fetch(`/data/db.json?t=${Date.now()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Error HTTP ${res.status}: ${res.statusText}`);
        return res.json() as Promise<DollarDB>;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Error desconocido al cargar los datos');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tick]);

  return {
    data,
    loading,
    error,
    refetch: () => setTick((t) => t + 1),
  };
}
