export interface DollarRecord {
  timestamp: string;
  compra: number;
  venta: number;
}

export interface ExchangeRate {
  name: string;
  compra: number | null;
  venta: number | null;
  url?: string | null;
}

export interface DollarDB {
  lastUpdated: string;
  source: string;
  records: DollarRecord[];
  exchanges?: ExchangeRate[];
}
