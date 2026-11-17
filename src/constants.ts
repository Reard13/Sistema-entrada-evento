import { ASIENTOS_NUMERADOS, CAPACIDAD, ENTRADAS, MAPA } from './config';
import { PackageType } from './types';

export const precioEntrada = (pkg: PackageType): number => ENTRADAS[pkg].precio;

export const totalEntradasUsd = (seats: { pkg: PackageType }[]): number =>
  seats.reduce((acc, s) => acc + precioEntrada(s.pkg), 0);

// Todos los asientos válidos (el servidor rechaza cualquier otro).
// Sin asientos numerados, cada entrada es «N-1», «N-2»… hasta CAPACIDAD, en orden.
export const ASIENTOS_VALIDOS = new Set(
  ASIENTOS_NUMERADOS
    ? MAPA.secciones.flatMap((s) => s.filas.flatMap((r) => Array.from({ length: r.c }, (_, i) => `${r.f}-${i + 1}`)))
    : Array.from({ length: CAPACIDAD }, (_, i) => `N-${i + 1}`)
);

// Cómo se nombra cada entrada en pantalla: «C-7» con asientos, «N° 12» sin ellos
export const etiquetaEntrada = (s: { id: string; num: number }): string => (ASIENTOS_NUMERADOS ? s.id : `N° ${s.num}`);
export const palabraEntrada = (n: number): string =>
  ASIENTOS_NUMERADOS ? (n === 1 ? 'asiento' : 'asientos') : n === 1 ? 'entrada' : 'entradas';

// Primeras entradas libres (sin asientos numerados)
export const entradasLibres = (ocupadas: Iterable<string>, cantidad: number): { id: string; fila: string; num: number }[] => {
  const tomadas = new Set(ocupadas);
  return Array.from(ASIENTOS_VALIDOS)
    .filter((id) => !tomadas.has(id))
    .slice(0, cantidad)
    .map((id) => ({ id, fila: 'N', num: Number(id.split('-')[1]) }));
};

export const BANCOS_VENEZUELA = [
  'Banesco (0134)',
  'Banco de Venezuela (0102)',
  'Mercantil (0105)',
  'BBVA Provincial (0108)',
  'BNC Banco Nacional de Crédito (0191)',
  'Bancamiga (0172)',
  'Bancaribe (0114)',
  'Banco del Tesoro (0163)',
  'Banco Exterior (0115)',
  'BFC Banco Fondo Común (0151)',
  'Banplus (0174)',
  'Otro Banco',
];
