import QRCode from 'qrcode';
import { COLORES, EVENTO, PREFIJO_LOCALIZADOR } from '../config';
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

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, weight: number, size: number) {
  let s = size;
  do {
    ctx.font = `${weight} ${s}px "Jost", sans-serif`;
    s -= 2;
  } while (ctx.measureText(text).width > maxWidth && s > 16);
}

export async function drawTicket(r: ReservationData, seat: SelectedSeat): Promise<HTMLCanvasElement> {
  await document.fonts?.load('800 40px "Jost"').catch(() => undefined);
  const c = document.createElement('canvas');
  c.width = TICKET_W;
  c.height = TICKET_H;
  const ctx = c.getContext('2d')!;

  // Forma con esquinas redondeadas y muescas en la línea de corte
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, TICKET_W, TICKET_H, 48);
  ctx.clip();

  // Cuerpo: degradado oscuro → marca
  const g = ctx.createLinearGradient(0, 0, STUB_X, TICKET_H);
  g.addColorStop(0, COLORES.fondoOscuro);
  g.addColorStop(1, COLORES.marca);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, STUB_X, TICKET_H);

  // Círculos decorativos suaves
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.arc(STUB_X - 120, -60, 320, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(80, TICKET_H + 40, 220, 0, Math.PI * 2);
  ctx.fill();

  // Talón
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(STUB_X, 0, TICKET_W - STUB_X, TICKET_H);
  ctx.fillStyle = COLORES.marca;
  ctx.fillRect(STUB_X, 0, TICKET_W - STUB_X, 18);
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
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.setLineDash([14, 12]);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(STUB_X, 50);
  ctx.lineTo(STUB_X, TICKET_H - 50);
  ctx.stroke();
  ctx.setLineDash([]);

  // ---- Cuerpo ----
  const x = 90;
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '600 30px "Jost", sans-serif';
  ctx.fillText(EVENTO.organizador.toUpperCase(), x, 110);

  ctx.fillStyle = '#FFFFFF';
  fitText(ctx, EVENTO.nombre, STUB_X - x - 90, 800, 104);
  ctx.fillText(EVENTO.nombre, x, 220);
  ctx.font = '500 40px "Jost", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(EVENTO.edicion, x, 280);

  // Tipo de entrada
  const tipo = 'GENERAL';
  ctx.font = '800 34px "Jost", sans-serif';
  const tw = ctx.measureText(tipo).width + 64;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.roundRect(x, 330, tw, 64, 32);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(tipo, x + 32, 375);

  // Fecha, hora y lugar
  const meta: [string, string][] = [
    ['FECHA', EVENTO.fechaTexto],
    ['HORA', EVENTO.horaTexto],
    ['LUGAR', EVENTO.lugar],
  ];
  let mx = x;
  meta.forEach(([label, value], i) => {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '600 24px "Jost", sans-serif';
    ctx.fillText(label, mx, 480);
    ctx.fillStyle = '#FFFFFF';
    const maxW = i === 2 ? STUB_X - mx - 80 : 420;
    fitText(ctx, value, maxW, 700, 38);
    ctx.fillText(value, mx, 530);
    mx += Math.min(ctx.measureText(value).width, maxW) + 70;
  });

  // Titular
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '600 24px "Jost", sans-serif';
  ctx.fillText('A NOMBRE DE', x, 610);
  ctx.fillStyle = '#FFFFFF';
  fitText(ctx, r.buyer.fullName, STUB_X - x - 90, 700, 40);
  ctx.fillText(r.buyer.fullName, x, 660);

  // ---- Talón ----
  const cx = STUB_X + (TICKET_W - STUB_X) / 2;
  const qrSize = 330;
  const qrY = 70;
  const payload = r.approvalStatus === 'approved' ? qrPayload(r, seat.id) : null;
  if (payload) {
    const url = await QRCode.toDataURL(payload, { width: 660, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#111111', light: '#FFFFFF' } });
    ctx.drawImage(await loadImage(url), cx - qrSize / 2, qrY, qrSize, qrSize);
  } else {
    const rejected = r.approvalStatus === 'rejected';
    ctx.fillStyle = rejected ? '#FEE2E2' : '#FEF3C7';
    ctx.beginPath();
    ctx.roundRect(cx - qrSize / 2, qrY, qrSize, qrSize, 24);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = rejected ? '#991B1B' : '#92400E';
    ctx.font = '800 38px "Jost", sans-serif';
    ctx.fillText(rejected ? 'NO VÁLIDA' : 'EN REVISIÓN', cx, qrY + qrSize / 2 - 6);
    ctx.font = '500 24px "Jost", sans-serif';
    ctx.fillText(rejected ? 'Pago no verificado' : 'El QR aparece al aprobar', cx, qrY + qrSize / 2 + 34);
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#6B7280';
  ctx.font = '600 24px "Jost", sans-serif';
  ctx.fillText('FILA', cx - 90, 470);
  ctx.fillText('ASIENTO', cx + 90, 470);
  ctx.fillStyle = COLORES.fondoOscuro;
  ctx.font = '800 76px "Jost", sans-serif';
  ctx.fillText(seat.fila, cx - 90, 550);
  ctx.fillText(String(seat.num), cx + 90, 550);

  ctx.fillStyle = '#9CA3AF';
  ctx.font = '600 24px "Jost", sans-serif';
  ctx.fillText(r.locatorCode, cx, 640);
  return c;
}

export async function ticketBlob(r: ReservationData, seat: SelectedSeat) {
  return canvasToPngBlob(await drawTicket(r, seat));
}
