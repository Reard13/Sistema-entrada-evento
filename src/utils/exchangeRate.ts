import type { Tasas } from './montos';

const STORAGE_KEY = 'evento_tasas';

export function formatBs(amount: number): string {
  // Sin tasa cargada el monto es 0: mostrar guion en vez de «0,00»
  if (!(amount > 0)) return '—';
  const safe = Math.round(amount * 100) / 100;
  return safe.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Última tasa conocida en este dispositivo (para mostrar precios mientras se consulta la del día).
// Sin tasa conocida, se muestran los euros y los bolívares aparecen cuando llega la tasa.
export function getInitialTasas(): Tasas {
  try {
    const t = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (t && t.eur > 0 && t.usd > 0) return { eur: Number(t.eur), usd: Number(t.usd) };
  } catch {
    /* sin almacenamiento */
  }
  return { eur: 0, usd: 0 };
}

// Tasas del día (euro y dólar), consultadas por el servidor
export async function fetchLatestTasas(): Promise<Tasas | null> {
  try {
    const res = await fetch('/api/bcv-rate', { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    const eur = Number(data?.rate);
    const usd = Number(data?.usdRate);
    if (res.ok && eur > 0 && usd > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ eur, usd }));
      } catch {
        /* sin almacenamiento */
      }
      return { eur, usd };
    }
  } catch {
    /* sin conexión */
  }
  return null;
}
