import { ENTRADAS } from '../config';

/** Tasas BCV del día: bolívares por € y bolívares por $ (referencia). */
export type Tasas = { eur: number; usd: number };

/**
 * Montos de una compra. El precio base es en euros:
 * bolívares = € × tasa del euro; dólares = bolívares ÷ tasa del dólar (solo referencia).
 * Cliente y servidor usan esta misma función para que el monto sea idéntico.
 */
export function calcularMontos(seats: { pkg: keyof typeof ENTRADAS }[], tasas: Tasas) {
  const eur = seats.reduce((n, s) => n + ENTRADAS[s.pkg].precio, 0);
  const bs = Math.round(eur * tasas.eur * 100) / 100;
  const usd = tasas.usd > 0 ? Math.round((bs / tasas.usd) * 100) / 100 : 0;
  return { eur, bs, usd };
}
