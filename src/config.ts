/**
 * ============================================================
 *  CONFIGURACIÓN DEL EVENTO
 *  Para un evento nuevo se cambia SOLO este archivo (y los PIN en .env.local).
 * ============================================================
 */

export const EVENTO = {
  nombre: 'Sanremo Sin Fronteras canta la Navidad',
  edicion: '2026',
  lema: 'Las mejores canciones sacras de Navidad y de repertorio internacional',
  descripcion:
    'Las mejores canciones sacras de Navidad y de repertorio internacional, interpretadas por el elenco de Sanremo Sin Fronteras.',
  organizador: 'Sanremo Sin Fronteras',
  // Titular de la sección «El concierto»
  titularConcierto: 'Una noche para cantar la Navidad juntos',

  // Fecha y hora de inicio con la zona horaria de Venezuela (-04:00)
  fechaISO: '2026-12-11T19:30:00-04:00',
  fechaTexto: 'Viernes 11 de diciembre',
  fechaCorta: '11 Dic',
  horaTexto: '7:30 PM',

  lugar: 'Iglesia Prados del Este',
  ciudad: 'Caracas',
  // Enlace de Google Maps (opcional)
  mapaUrl: 'https://maps.app.goo.gl/eKA95Eiten6ZQraE6',

  // Logo del organizador (archivos en public/, fondo transparente). Vacío = no se muestra.
  logoMarca: '/marca.png', // con micrófono: portada y pie de página
  logoMarcaTexto: '/marca-texto.png', // solo el nombre: barra superior
  logoProductora: '/productora.png', // logo de la productora (pie de página, junto al de Sanremo)

  // Logo con el título del evento (archivo en public/). Vacío = el nombre escrito en texto.
  logoTitulo: '/titulo.png',

  // Foto de fondo de la portada (archivo en public/). Vacío = fondo de color.
  fotoPortada: '/portada.webp',

  // Dirección pública de la web (para la vista previa al compartir el enlace)
  urlPublica: 'https://sanremo-sin-fronteras.onrender.com',
};

// Prefijo del localizador de cada compra (ej. #EVT-12345678)
export const PREFIJO_LOCALIZADOR = 'SSF';

// WhatsApp que recibe los reportes de pago (código de país sin «+», ej. 584141234567)
export const WHATSAPP = '584145891276';
export const INSTAGRAM = 'sanremosinfronteras'; // sin @. Vacío = no se muestra.
// Los logos y el nombre del organizador llevan a este perfil
export const INSTAGRAM_URL = INSTAGRAM ? `https://www.instagram.com/${INSTAGRAM}/` : '';

// Colores de la marca (hex). Toda la web toma estos colores.
export const COLORES = {
  marca: '#C9A86A', // dorado champán: botones (degradado en index.css), asientos y canvas
  marcaOscuro: '#8A6A1F', // dorado oscuro: textos fuertes y hover
  fondoOscuro: '#05070D', // negro azulado (tema Escenario Sanremo): portada, barra, pie y entrada
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
  banco: 'Bancamiga',
  telefono: '0414-5891276',
  documento: 'V-6914278',
  titular: 'Andrés Perillo Canciani',
};

/**
 * Métodos de pago que el comprador puede elegir.
 *  activo   = false lo oculta sin borrarlo.
 *  moneda   = 'Bs' cobra el monto en bolívares (tasa BCV); 'USD' cobra en dólares.
 *  datos    = lo que el comprador ve para pagar; «copiar» muestra el botón de copiar.
 *  pideBanco = pide el banco desde el que se pagó (solo pagos en bolívares).
 *  referencia = cómo se llama el comprobante en ese método.
 */
export type MetodoPago = {
  id: string;
  nombre: string;
  moneda: 'Bs' | 'USD';
  activo: boolean;
  datos: { label: string; valor: string; copiar?: string }[];
  pideBanco: boolean;
  referencia: string;
  ejemploReferencia: string;
};

export const METODOS_PAGO: MetodoPago[] = [
  {
    id: 'pagomovil',
    nombre: 'Pago Móvil',
    moneda: 'Bs',
    activo: true,
    datos: [
      { label: 'Banco', valor: PAGO_MOVIL.banco },
      { label: 'Titular', valor: PAGO_MOVIL.titular },
      { label: 'Teléfono', valor: PAGO_MOVIL.telefono, copiar: PAGO_MOVIL.telefono.replace(/\D/g, '') },
      { label: 'RIF / C.I.', valor: PAGO_MOVIL.documento, copiar: PAGO_MOVIL.documento },
    ],
    pideBanco: true,
    referencia: 'N° de referencia',
    ejemploReferencia: 'Ej. 84729103',
  },
  {
    id: 'transferencia',
    nombre: 'Transferencia bancaria',
    moneda: 'Bs',
    activo: true,
    datos: [
      { label: 'Banco', valor: 'Bancamiga' },
      { label: 'Número de cuenta', valor: '01720110731108611383', copiar: '01720110731108611383' },
      { label: 'Titular', valor: 'Andrés Perillo Canciani' },
      { label: 'C.I. / RIF', valor: 'V-6914278', copiar: 'V6914278' },
    ],
    pideBanco: true,
    referencia: 'N° de referencia',
    ejemploReferencia: 'Ej. 84729103',
  },
];

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
      'El precio está en euros. El monto en bolívares se calcula el día de la compra.',
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
