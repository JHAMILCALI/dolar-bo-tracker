export interface DollarRecord {
  timestamp: string;
  compra: number;
  venta: number;
}

export interface DollarDB {
  lastUpdated: string;
  source: string;
  records: DollarRecord[];
}
