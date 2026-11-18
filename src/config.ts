/**
 * ============================================================
 *  CONFIGURACIÓN DEL EVENTO
 *  Para un evento nuevo se cambia SOLO este archivo (y los PIN en .env.local).
 * ============================================================
 */

export const EVENTO = {
  nombre: 'Sanremo Sin Fronteras canta en Navidad',
  edicion: '2026',
  lema: 'Las mejores canciones navideñas internacionales',
  descripcion:
    'Las mejores canciones navideñas internacionales, interpretadas por el elenco de Sanremo Sin Fronteras.',
  organizador: 'Sanremo Sin Fronteras',

  // Fecha y hora de inicio con la zona horaria de Venezuela (-04:00)
  fechaISO: '2026-12-11T19:30:00-04:00',
  fechaTexto: 'Viernes 11 de diciembre',
  fechaCorta: '11 Dic',
  horaTexto: '7:30 PM',

  lugar: 'Iglesia Prados del Este',
  ciudad: 'Caracas',
  // Enlace de Google Maps (opcional)
  mapaUrl: 'https://maps.app.goo.gl/eKA95Eiten6ZQraE6',

  // Logo con el título del evento (archivo en public/). Vacío = el nombre escrito en texto.
  logoTitulo: '/titulo.svg',

  // Foto de fondo de la portada (archivo en public/). Vacío = fondo de color.
  fotoPortada: '/portada.webp',

  // Dirección pública de la web (para la vista previa al compartir el enlace)
  urlPublica: 'https://mi-evento.onrender.com',
};

// Prefijo del localizador de cada compra (ej. #EVT-12345678)
export const PREFIJO_LOCALIZADOR = 'SSF';

// WhatsApp que recibe los reportes de pago (código de país sin «+», ej. 584141234567)
export const WHATSAPP = '584140000000';
export const INSTAGRAM = ''; // ej. 'mievento' (sin @). Vacío = no se muestra.

// Colores de la marca (hex). Toda la web toma estos colores.
export const COLORES = {
  marca: '#A60B08', // rojo navidad: botones y asientos
  marcaOscuro: '#5E0001', // rojo vino: textos fuertes y hover
  fondoOscuro: '#1D2E19', // verde pino: portada, barra de compra y entrada
  suave: '#EDEBE6', // crema (#CFCABF aclarado): fondos claros
  vip: '#76584C', // marrón de la paleta (sin uso: no hay entrada VIP)
};

// Entrada única del evento.
export const ENTRADAS = {
  General: {
    precio: 20,
    descripcion: 'Tu lugar para disfrutar del evento.',
    beneficios: ['Acceso general, sin asiento asignado', 'Entrada digital con código QR'],
  },
} as const;

// Datos para el Pago Móvil
export const PAGO_MOVIL = {
  banco: 'Banco Ejemplo (0000)',
  telefono: '0414-0000000',
  documento: 'V00000000',
  titular: 'Organización Ejemplo',
};

// Minutos que se guardan los asientos mientras la persona paga
export const MINUTOS_RESERVA = 15;

// Tasa BCV de respaldo si no se puede consultar en internet
export const TASA_BCV_RESPALDO = 100;

/**
 * Asientos numerados o entrada libre.
 *  true  = el comprador elige su asiento en el MAPA de abajo.
 *  false = no hay mapa: el comprador elige cuántas entradas quiere y cada una sale numerada
 *          (N° 1, N° 2…) hasta llegar a CAPACIDAD. El MAPA se ignora.
 */
export const ASIENTOS_NUMERADOS = false;
// Entradas a la venta cuando no hay asientos numerados (aforo del lugar)
export const CAPACIDAD = 150;
// Máximo de entradas en una sola compra
export const MAX_POR_COMPRA = 10;

/**
 * Mapa de asientos (solo con ASIENTOS_NUMERADOS = true): secciones con sus filas.
 *  f = letra de la fila, c = cantidad de asientos.
 */
export const MAPA = {
  escenario: 'ESCENARIO',
  secciones: [
    {
      nombre: 'Platea',
      filas: [
        { f: 'A', c: 12 },
        { f: 'B', c: 12 },
        { f: 'C', c: 14 },
        { f: 'D', c: 14 },
        { f: 'E', c: 14 },
        { f: 'F', c: 14 },
      ],
    },
    {
      nombre: 'Balcón',
      filas: [
        { f: 'G', c: 14 },
        { f: 'H', c: 14 },
        { f: 'I', c: 12 },
      ],
    },
  ],
};

// Términos y condiciones (se aceptan antes de comprar)
export const TERMINOS_VERSION = '2027-01-01';
export const TERMINOS: { titulo: string; puntos: string[] }[] = [
  {
    titulo: 'Compra y pago',
    puntos: [
      'La entrada queda confirmada cuando el organizador verifica el pago.',
      'El monto en bolívares se calcula con la tasa BCV del día de la compra.',
    ],
  },
  {
    titulo: 'Ubicación',
    puntos: ['No hay asientos numerados: la ubicación es por orden de llegada.'],
  },
  {
    titulo: 'Reembolsos',
    puntos: ['No hay reembolsos, salvo que el evento se cancele.'],
  },
  {
    titulo: 'Acceso',
    puntos: [
      'Cada código QR permite una sola entrada.',
      'Presenta tu entrada en el teléfono o impresa. No compartas tu QR.',
    ],
  },
];
