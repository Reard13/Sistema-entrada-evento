import { ENTRADAS, MAPA } from './config';
import { PackageType } from './types';

export const precioEntrada = (pkg: PackageType): number => ENTRADAS[pkg].precio;

export const totalEntradasUsd = (seats: { pkg: PackageType }[]): number =>
  seats.reduce((acc, s) => acc + precioEntrada(s.pkg), 0);

// Todos los asientos válidos del mapa (el servidor rechaza cualquier otro)
export const ASIENTOS_VALIDOS = new Set(
  MAPA.secciones.flatMap((s) => s.filas.flatMap((r) => Array.from({ length: r.c }, (_, i) => `${r.f}-${i + 1}`)))
);

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
