import { TASA_BCV_RESPALDO } from '../config';

const STORAGE_KEY = 'evento_tasa_bcv';

export function formatBs(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
  return safe.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Última tasa conocida en este dispositivo (para mostrar precios mientras se consulta la del día)
export function getInitialBcvRate(): number {
  try {
    const rate = Number(localStorage.getItem(STORAGE_KEY));
    if (rate > 0) return rate;
  } catch {
    /* sin almacenamiento */
  }
  return TASA_BCV_RESPALDO;
}

// Tasa BCV del día, consultada por el servidor
export async function fetchLatestBcvRate(): Promise<number | null> {
  try {
    const res = await fetch('/api/bcv-rate', { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    const rate = Number(data?.rate);
    if (res.ok && rate > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, String(rate));
      } catch {
        /* sin almacenamiento */
      }
      return rate;
    }
  } catch {
    /* sin conexión */
  }
  return null;
}
