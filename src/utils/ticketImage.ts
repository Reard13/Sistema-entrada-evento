import QRCode from 'qrcode';
import { ASIENTOS_NUMERADOS, COLORES, EVENTO, PREFIJO_LOCALIZADOR } from '../config';
import { ReservationData, SelectedSeat } from '../types';
import { canvasToPngBlob } from './saveImage';

/**
 * Entrada digital: se dibuja en un lienzo de 1800×720 con los datos y colores de config.ts.
 * La misma imagen se muestra en pantalla y se guarda en el teléfono.
 */
export const TICKET_W = 1800;
export const TICKET_H = 720;
const STUB_X = 1340;

// Contenido del QR: PREFIJO|LOCALIZADOR|ASIENTO|FIRMA (la firma la entrega el servidor al aprobar)
export const qrPayload = (r: ReservationData, seatId: string) =>
  r.qr?.[seatId] ? `${PREFIJO_LOCALIZADOR}|${r.locatorCode.replace(/^#/, '').split('-').pop()}|${seatId}|${r.qr[seatId]}` : null;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((ok, fail) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = fail;
    img.src = src;
  });

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, weight: number, size: number, family = '"Jost", sans-serif') {
  let s = size;
  do {
    ctx.font = `${weight} ${s}px ${family}`;
    s -= 2;
  } while (ctx.measureText(text).width > maxWidth && s > 16);
}

// Etiqueta en mayúsculas con letras separadas (canvas no tiene letter-spacing en todos los navegadores)
function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number, align: 'left' | 'center' = 'left') {
  const chars = [...text];
  const total = chars.reduce((w, ch) => w + ctx.measureText(ch).width, 0) + spacing * (chars.length - 1);
  let cx = align === 'center' ? x - total / 2 : x;
  ctx.textAlign = 'left';
  chars.forEach((ch) => {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  });
}

const CREMA = '#F3F0EA';
const ORO = '#F1E39A';
const TENUE = '#B9B4A8';
const CAFE = '#76584C';
const SERIF = '"Playfair Display", Georgia, serif';

export async function drawTicket(r: ReservationData, seat: SelectedSeat): Promise<HTMLCanvasElement> {
  await Promise.all([
    document.fonts?.load('600 40px "Jost"'),
    document.fonts?.load(`700 40px ${SERIF}`),
  ]).catch(() => undefined);
  const c = document.createElement('canvas');
  c.width = TICKET_W;
  c.height = TICKET_H;
  const ctx = c.getContext('2d')!;

  // Forma con esquinas redondeadas
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, TICKET_W, TICKET_H, 48);
  ctx.clip();

  // Cuerpo: foto de la portada bajo una capa oscura (o solo el color si no hay foto)
  ctx.fillStyle = COLORES.fondoOscuro;
  ctx.fillRect(0, 0, STUB_X, TICKET_H);
  if (EVENTO.fotoPortada) {
    const foto = await loadImage(EVENTO.fotoPortada).catch(() => null);
    if (foto) {
      const scale = Math.max(STUB_X / foto.width, TICKET_H / foto.height);
      const w = foto.width * scale;
      const h = foto.height * scale;
      ctx.drawImage(foto, (STUB_X - w) / 2, (TICKET_H - h) * 0.35, w, h);
    }
  }
  const g = ctx.createLinearGradient(0, 0, STUB_X, 0);
  g.addColorStop(0, COLORES.fondoOscuro);
  g.addColorStop(0.45, 'rgba(11,16,13,0.92)');
  g.addColorStop(1, 'rgba(11,16,13,0.72)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, STUB_X, TICKET_H);
  ctx.fillStyle = COLORES.marca;
  ctx.fillRect(0, 0, STUB_X, 14);

  // Talón crema
  ctx.fillStyle = CREMA;
  ctx.fillRect(STUB_X, 0, TICKET_W - STUB_X, TICKET_H);
  ctx.restore();

  // Muescas y línea perforada
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  [0, TICKET_H].forEach((y) => {
    ctx.beginPath();
    ctx.arc(STUB_X, y, 34, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
  ctx.strokeStyle = '#CFCABF';
  ctx.setLineDash([16, 12]);
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(STUB_X, 50);
  ctx.lineTo(STUB_X, TICKET_H - 50);
  ctx.stroke();
  ctx.setLineDash([]);

  // ---- Cuerpo ----
  const x = 80;
  const right = STUB_X - 80;
  // --- Encabezado: logo del organizador y, a su lado, el nombre del evento (sin repetir el del organizador)
  const marca = EVENTO.logoMarca ? await loadImage(EVENTO.logoMarca).catch(() => null) : null;
  let tx = x;
  if (marca && marca.width) {
    const h = 220;
    const w = (marca.width / marca.height) * h;
    ctx.drawImage(marca, x, 70, w, h);
    tx = x + w + 40;
  }
  const org = EVENTO.organizador.trim();
  let titulo = EVENTO.nombre.trim();
  if (marca && titulo.toLowerCase().startsWith(org.toLowerCase())) titulo = titulo.slice(org.length).trim();
  titulo = titulo.charAt(0).toUpperCase() + titulo.slice(1);

  ctx.fillStyle = ORO;
  ctx.font = '600 24px "Jost", sans-serif';
  spaced(ctx, 'ENTRADA GENERAL', tx, 168, 7);
  ctx.fillStyle = '#FFFFFF';
  fitText(ctx, titulo, right - tx, 700, 76, SERIF);
  ctx.textAlign = 'left';
  ctx.fillText(titulo, tx, 248);

  const linea = (y: number) => {
    ctx.fillStyle = 'rgba(241,227,154,0.3)';
    ctx.fillRect(x, y, right - x, 2);
  };

  // --- Fecha, hora y lugar: columnas a la medida de su contenido, separadas por líneas finas
  linea(340);
  const meta: [string, string, number][] = [
    ['FECHA', EVENTO.fechaTexto, 0.38],
    ['HORA', EVENTO.horaTexto, 0.2],
    ['LUGAR', EVENTO.lugar, 0.42],
  ];
  let mx = x;
  meta.forEach(([label, value, frac], i) => {
    const colW = (right - x) * frac;
    const pad = i === 0 ? 0 : 32;
    if (i > 0) {
      ctx.fillStyle = 'rgba(241,227,154,0.3)';
      ctx.fillRect(mx, 368, 2, 90);
    }
    ctx.fillStyle = TENUE;
    ctx.font = '500 20px "Jost", sans-serif';
    spaced(ctx, label, mx + pad, 400, 5);
    ctx.fillStyle = CREMA;
    fitText(ctx, value, colW - pad - 20, 600, 34);
    ctx.textAlign = 'left';
    ctx.fillText(value, mx + pad, 446);
    mx += colW;
  });

  // --- Titular
  linea(490);
  ctx.fillStyle = TENUE;
  ctx.font = '500 20px "Jost", sans-serif';
  spaced(ctx, 'A NOMBRE DE', x, 548, 5);
  ctx.fillStyle = '#FFFFFF';
  fitText(ctx, r.buyer.fullName, right - x, 700, 48, SERIF);
  ctx.textAlign = 'left';
  ctx.fillText(r.buyer.fullName, x, 606);

  // ---- Talón ----
  const cx = STUB_X + (TICKET_W - STUB_X) / 2;
  const qrSize = 300;
  const qrY = 70;
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#DDD7CB';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cx - qrSize / 2 - 18, qrY - 18, qrSize + 36, qrSize + 36, 24);
  ctx.fill();
  ctx.stroke();
  const payload = r.approvalStatus === 'approved' ? qrPayload(r, seat.id) : null;
  if (payload) {
    const url = await QRCode.toDataURL(payload, { width: 600, margin: 0, errorCorrectionLevel: 'M', color: { dark: '#0B100D', light: '#FFFFFF' } });
    ctx.drawImage(await loadImage(url), cx - qrSize / 2, qrY, qrSize, qrSize);
  } else {
    const rejected = r.approvalStatus === 'rejected';
    ctx.fillStyle = rejected ? '#FEE2E2' : '#FEF3C7';
    ctx.beginPath();
    ctx.roundRect(cx - qrSize / 2, qrY, qrSize, qrSize, 16);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = rejected ? '#991B1B' : '#92400E';
    ctx.font = '700 36px "Jost", sans-serif';
    ctx.fillText(rejected ? 'NO VÁLIDA' : 'EN REVISIÓN', cx, qrY + qrSize / 2 - 6);
    ctx.font = '500 22px "Jost", sans-serif';
    ctx.fillText(rejected ? 'Pago no verificado' : 'El QR aparece al aprobar', cx, qrY + qrSize / 2 + 32);
  }

  ctx.fillStyle = CAFE;
  ctx.font = '600 22px "Jost", sans-serif';
  if (ASIENTOS_NUMERADOS) {
    spaced(ctx, 'FILA', cx - 90, 470, 5, 'center');
    spaced(ctx, 'ASIENTO', cx + 90, 470, 5, 'center');
    ctx.fillStyle = COLORES.fondoOscuro;
    ctx.font = `700 84px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.fillText(seat.fila, cx - 90, 560);
    ctx.fillText(String(seat.num), cx + 90, 560);
  } else {
    spaced(ctx, 'ENTRADA N°', cx, 470, 6, 'center');
    ctx.fillStyle = COLORES.fondoOscuro;
    // Cifras en Jost: las de Playfair en canvas salen «antiguas» (el 3 y el 5 bajan de la línea)
    ctx.font = '700 96px "Jost", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(seat.num), cx, 566);
  }

  ctx.fillStyle = CAFE;
  ctx.font = '600 24px "Jost", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(r.locatorCode, cx, 650);
  return c;
}

export async function ticketBlob(r: ReservationData, seat: SelectedSeat) {
  return canvasToPngBlob(await drawTicket(r, seat));
}
