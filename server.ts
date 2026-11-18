/*
 * Servidor del sistema de entradas (paquete Básico).
 *
 * - Compras: el comprador elige asientos, paga por Pago Móvil y reporta la referencia.
 * - Panel: el administrador aprueba o rechaza cada pago.
 * - Puerta: el escáner valida el QR (firmado por este servidor) y registra el ingreso una sola vez.
 *
 * Los datos se guardan en archivos JSON dentro de DATA_DIR (en Render, el disco persistente /data).
 */
import express from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { ASIENTOS_NUMERADOS, ENTRADAS, MAX_POR_COMPRA, PREFIJO_LOCALIZADOR, TASA_BCV_RESPALDO } from './src/config';
import { ASIENTOS_VALIDOS, entradasLibres } from './src/constants';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: [path.resolve(__dirname, '.env.local'), path.resolve(__dirname, '.env')], quiet: true });

// ---------- Carpeta de datos ----------
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : __dirname;
fs.mkdirSync(DATA_DIR, { recursive: true });
const RESERVAS_PATH = path.join(DATA_DIR, '.reservas.json');
const INGRESOS_PATH = path.join(DATA_DIR, '.ingresos.json');
const QR_SECRET_PATH = path.join(DATA_DIR, '.qr-secret');

const readJson = <T,>(file: string, fallback: T): T => {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (err) {
    console.warn(`No se pudo leer ${path.basename(file)}:`, err);
  }
  return fallback;
};
const writeJson = (file: string, data: unknown) => {
  try {
    // Se escribe en un archivo temporal y se renombra: si el servidor se apaga a mitad, no se corrompe
    fs.writeFileSync(`${file}.tmp`, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(`${file}.tmp`, file);
  } catch (err) {
    console.warn(`No se pudo guardar ${path.basename(file)}:`, err);
  }
};

// ---------- Acceso del personal ----------
// ADMIN_PIN: panel completo. PUERTA_PIN: solo el escáner. Admiten varias claves separadas por coma.
type Rol = 'admin' | 'puerta';
const parsePins = (value?: string) =>
  (value || '')
    .split(',')
    .map((p) => p.trim().replace(/^["']+|["']+$/g, '').trim())
    .filter(Boolean);
const ADMIN_PINS = parsePins(process.env.ADMIN_PIN);
const PUERTA_PINS = parsePins(process.env.PUERTA_PIN);
if (ADMIN_PINS.length === 0) console.warn('[panel] Falta ADMIN_PIN en .env.local: nadie podrá entrar al panel.');

const SESSION_MS = 12 * 60 * 60 * 1000;
const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  crypto.createHash('sha256').update(`sesion|${ADMIN_PINS.join(',')}|${PUERTA_PINS.join(',')}`).digest('hex');

// Secreto para firmar los QR: fijo mientras exista el disco, así las entradas emitidas siempre valen
const QR_SECRET =
  process.env.QR_SECRET ||
  (() => {
    try {
      if (fs.existsSync(QR_SECRET_PATH)) return fs.readFileSync(QR_SECRET_PATH, 'utf-8').trim();
      const s = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(QR_SECRET_PATH, s, 'utf-8');
      return s;
    } catch {
      return SESSION_SECRET;
    }
  })();

const safeEqual = (a: string, b: string) =>
  crypto.timingSafeEqual(crypto.createHash('sha256').update(a).digest(), crypto.createHash('sha256').update(b).digest());

const signToken = (rol: Rol) => {
  const payload = Buffer.from(JSON.stringify({ rol, exp: Date.now() + SESSION_MS })).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
};
const verifyToken = (token: string): { rol: Rol; exp: number } | null => {
  const [payload, sig] = String(token || '').split('.');
  if (!payload || !sig) return null;
  if (!safeEqual(sig, crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url'))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if ((data.rol !== 'admin' && data.rol !== 'puerta') || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
};
const sessionOf = (req: express.Request) => {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? verifyToken(h.slice(7)) : null;
};
const requireAdmin: express.RequestHandler = (req, res, next) =>
  sessionOf(req)?.rol === 'admin' ? next() : res.status(401).json({ success: false, message: 'Sesión de administrador requerida' });
const requireStaff: express.RequestHandler = (req, res, next) =>
  sessionOf(req) ? next() : res.status(401).json({ success: false, message: 'Sesión requerida' });

// ---------- Límites de intentos ----------
const clientKey = (req: express.Request) =>
  String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'desconocido';
const makeLimiter = (max: number, windowMs: number) => {
  const hits = new Map<string, number[]>();
  return {
    blocked: (k: string) => (hits.get(k) || []).filter((t) => Date.now() - t < windowMs).length >= max,
    fail: (k: string) => {
      const list = (hits.get(k) || []).filter((t) => Date.now() - t < windowMs);
      list.push(Date.now());
      hits.set(k, list);
      if (hits.size > 5000) hits.clear();
    },
    reset: (k: string) => hits.delete(k),
  };
};
const loginLimiter = makeLimiter(10, 15 * 60 * 1000);
const lookupLimiter = makeLimiter(10, 15 * 60 * 1000);

// ---------- Utilidades ----------
const normLoc = (loc: unknown) =>
  String(loc || '')
    .trim()
    .toUpperCase()
    .replace(/^#/, '')
    .replace(new RegExp(`^${PREFIJO_LOCALIZADOR}-`), '');
const newLocator = () => `#${PREFIJO_LOCALIZADOR}-${Array.from(crypto.randomBytes(8), (b) => b % 10).join('')}`;
// Teléfono venezolano sin 0 ni 58 (0414-1234567 → 4141234567). Exige el número completo.
const nationalPhone = (value: string) => {
  let d = String(value || '').replace(/\D/g, '');
  if (d.startsWith('0058')) d = d.slice(4);
  else if (d.startsWith('58') && d.length === 12) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  return d.length === 10 ? d : '';
};
const clip = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n);
const qrSig = (loc: string, seatId: string) =>
  crypto.createHmac('sha256', QR_SECRET).update(`${normLoc(loc)}|${seatId}`).digest('base64url').slice(0, 12);

// Tasa BCV en memoria (30 minutos)
let bcvCache: { rate: number; at: number } | null = null;
async function getBcvRate(): Promise<number | null> {
  if (bcvCache && Date.now() - bcvCache.at < 30 * 60 * 1000) return bcvCache.rate;
  const sources: [string, (d: any) => unknown][] = [
    ['https://ve.dolarapi.com/v1/dolares/oficial', (d) => d?.promedio],
    ['https://pydolarve.org/api/v1/dollar?page=bcv', (d) => d?.monitors?.usd?.price],
  ];
  for (const [url, pick] of sources) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(5000), headers: { Accept: 'application/json' } });
      if (!r.ok) continue;
      const rate = Number(pick(await r.json()));
      if (rate > 0) {
        bcvCache = { rate: Number(rate.toFixed(2)), at: Date.now() };
        return bcvCache.rate;
      }
    } catch {
      /* siguiente fuente */
    }
  }
  return bcvCache?.rate ?? null;
}

type Reserva = {
  locatorCode: string;
  createdAt: number;
  seats: { id: string; fila: string; num: number; pkg: 'General' }[];
  buyer: { fullName: string; phone: string };
  paymentReport: { referenceNumber: string; bank: string; payerPhone: string; reportedAt: number };
  approvalStatus: 'pending_approval' | 'approved' | 'rejected';
  approvedAt?: number;
  rejectionReason?: string;
  bcvRate: number;
  totalUsd: number;
  totalBs: number;
  termsAcceptedAt?: number;
  termsVersion?: string;
};
type Ingreso = { at: number; seatId: string; locator: string; name?: string };

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '200kb' }));

  let reservas: Reserva[] = readJson(RESERVAS_PATH, []);
  const ingresos: Record<string, Ingreso> = readJson(INGRESOS_PATH, {});
  const saveReservas = () => writeJson(RESERVAS_PATH, reservas);
  const saveIngresos = () => writeJson(INGRESOS_PATH, ingresos);
  const findReserva = (loc: unknown) => reservas.find((r) => normLoc(r.locatorCode) === normLoc(loc));
  const ingresoKey = (loc: string, seatId: string) => `${normLoc(loc)}|${seatId}`;

  // Lo que ve el comprador de su propia compra: con la firma del QR solo si está aprobada
  const publicView = (r: Reserva) => ({
    ...r,
    qr: r.approvalStatus === 'approved' ? Object.fromEntries(r.seats.map((s) => [s.id, qrSig(r.locatorCode, s.id)])) : undefined,
  });

  const takenSeats = (except?: string) => {
    const taken = new Set<string>();
    reservas.forEach((r) => {
      if (r.approvalStatus === 'rejected' || (except && normLoc(r.locatorCode) === normLoc(except))) return;
      r.seats.forEach((s) => taken.add(s.id));
    });
    return taken;
  };

  // ---------- Tiempo real (SSE) ----------
  // El personal recibe las compras completas; el público solo el estado de cada una y el aviso de asientos
  const clients = new Map<express.Response, boolean>();
  const broadcast = (type: string, reserva?: Reserva) => {
    const staffMsg = `data: ${JSON.stringify({ type, reserva })}\n\n`;
    const publicMsg = `data: ${JSON.stringify({
      type,
      reserva: reserva && { locatorCode: reserva.locatorCode, approvalStatus: reserva.approvalStatus },
    })}\n\n`;
    clients.forEach((isStaff, res) => {
      try {
        res.write(isStaff ? staffMsg : publicMsg);
      } catch {
        clients.delete(res);
      }
    });
  };
  app.get('/api/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    res.write(': conectado\n\n');
    clients.set(res, !!verifyToken(String(req.query.token || '')));
    const ping = setInterval(() => res.write(': ping\n\n'), 20000);
    req.on('close', () => {
      clearInterval(ping);
      clients.delete(res);
    });
  });

  // ---------- Sesión del personal ----------
  app.post('/api/login', (req, res) => {
    const key = clientKey(req);
    if (loginLimiter.blocked(key)) return res.status(429).json({ success: false, message: 'Demasiados intentos. Espera unos minutos.' });
    const pin = clip(req.body?.pin, 64);
    const rol: Rol | null =
      pin && ADMIN_PINS.some((p) => safeEqual(pin, p)) ? 'admin' : pin && PUERTA_PINS.some((p) => safeEqual(pin, p)) ? 'puerta' : null;
    if (!rol) {
      loginLimiter.fail(key);
      return res.status(401).json({ success: false, message: 'Clave incorrecta.' });
    }
    loginLimiter.reset(key);
    return res.json({ success: true, rol, token: signToken(rol), expiresAt: Date.now() + SESSION_MS });
  });
  app.get('/api/session', (req, res) => {
    const s = sessionOf(req);
    return s ? res.json({ success: true, rol: s.rol, expiresAt: s.exp }) : res.status(401).json({ success: false });
  });

  // ---------- Público ----------
  app.get('/api/seats/blocked', (_req, res) => res.json({ success: true, seats: Array.from(takenSeats()) }));

  app.get('/api/bcv-rate', async (_req, res) => {
    const rate = await getBcvRate();
    return rate ? res.json({ success: true, rate }) : res.status(502).json({ success: false, rate: TASA_BCV_RESPALDO });
  });

  // Nueva compra: el servidor calcula el precio, genera el localizador y verifica que los asientos sigan libres
  app.post('/api/reservations', async (req, res) => {
    const b = req.body || {};
    // Sin asientos numerados el servidor asigna las primeras entradas libres (lo que mande el navegador solo cuenta como cantidad)
    if (!ASIENTOS_NUMERADOS) {
      const cantidad = Array.isArray(b.seats) ? b.seats.length : 0;
      if (cantidad < 1 || cantidad > MAX_POR_COMPRA) {
        return res.status(400).json({ success: false, message: `Puedes comprar de 1 a ${MAX_POR_COMPRA} entradas por compra.` });
      }
      const libres = entradasLibres(takenSeats(), cantidad);
      if (libres.length < cantidad) {
        return res.status(409).json({
          success: false,
          code: 'sold_out',
          message: libres.length ? `Solo quedan ${libres.length} entradas. Ajusta la cantidad.` : 'Las entradas se agotaron.',
        });
      }
      b.seats = libres;
    }
    const seatIds: string[] = Array.isArray(b.seats) ? b.seats.map((s: any) => String(s?.id || '').toUpperCase()) : [];
    const seats: Reserva['seats'] = (Array.isArray(b.seats) ? b.seats : []).map((s: any, i: number) => {
      const [fila, num] = seatIds[i].split('-');
      return { id: seatIds[i], fila, num: Number(num), pkg: 'General' } as Reserva['seats'][number];
    });
    const fullName = clip(b.buyer?.fullName, 80);
    const phone = clip(b.buyer?.phone, 20);
    const reference = clip(b.paymentReport?.referenceNumber, 30);
    if (seats.length === 0 || seats.length > 20 || new Set(seatIds).size !== seatIds.length || !seatIds.every((id) => ASIENTOS_VALIDOS.has(id))) {
      return res.status(400).json({ success: false, message: 'Asientos no válidos.' });
    }
    if (!fullName || phone.replace(/\D/g, '').length < 7 || reference.length < 4) {
      return res.status(400).json({ success: false, message: 'Faltan datos del comprador o del pago.' });
    }
    const taken = takenSeats();
    const ocupados = seatIds.filter((id) => taken.has(id));
    if (ocupados.length) {
      return res.status(409).json({
        success: false,
        code: 'seats_taken',
        takenSeats: ocupados,
        message: `Estos asientos ya fueron tomados: ${ocupados.join(', ')}. Elige otros.`,
      });
    }

    // Tasa: la del servidor; si no hay conexión con el BCV, la que vio el comprador (dentro de un margen)
    const clientRate = Number(b.bcvRate) || 0;
    const serverRate = await getBcvRate();
    const bcvRate = serverRate && (!clientRate || Math.abs(clientRate - serverRate) / serverRate > 0.05) ? serverRate : clientRate || TASA_BCV_RESPALDO;
    const totalUsd = seats.reduce((n, s) => n + ENTRADAS[s.pkg].precio, 0);

    let locatorCode = newLocator();
    while (findReserva(locatorCode)) locatorCode = newLocator();
    const now = Date.now();
    const reserva: Reserva = {
      locatorCode,
      createdAt: now,
      seats,
      buyer: { fullName, phone },
      paymentReport: {
        referenceNumber: reference,
        bank: clip(b.paymentReport?.bank, 60),
        payerPhone: clip(b.paymentReport?.payerPhone, 20) || phone,
        reportedAt: now,
      },
      approvalStatus: 'pending_approval',
      bcvRate,
      totalUsd,
      totalBs: Math.round(totalUsd * bcvRate * 100) / 100,
      termsAcceptedAt: b.termsAccepted ? now : undefined,
      termsVersion: clip(b.termsVersion, 20) || undefined,
    };
    reservas.unshift(reserva);
    saveReservas();
    broadcast('reserva', reserva);
    return res.json({ success: true, reservation: publicView(reserva) });
  });

  // Consultar Mi Boleto: por localizador o por el teléfono completo (con límite de intentos)
  app.get('/api/reservations/lookup', (req, res) => {
    const key = clientKey(req);
    if (lookupLimiter.blocked(key)) {
      return res.status(429).json({ success: false, message: 'Demasiados intentos. Espera unos minutos.' });
    }
    const q = clip(req.query.q, 40);
    const phone = nationalPhone(q);
    const matches = reservas.filter(
      (r) => (normLoc(q).length >= 4 && normLoc(r.locatorCode) === normLoc(q)) || (phone && nationalPhone(r.buyer.phone) === phone)
    );
    if (matches.length === 0) lookupLimiter.fail(key);
    return res.json({ success: true, reservations: matches.slice(0, 5).map(publicView) });
  });

  // ---------- Panel administrativo ----------
  app.get('/api/reservations', requireStaff, (_req, res) => res.json({ success: true, reservations: reservas }));

  app.patch('/api/reservations/:locator/status', requireAdmin, (req, res) => {
    const r = findReserva(req.params.locator);
    if (!r) return res.status(404).json({ success: false, message: 'Compra no encontrada.' });
    const status = req.body?.status;
    if (!['approved', 'rejected', 'pending_approval'].includes(status)) return res.status(400).json({ success: false });
    // Reactivar una compra rechazada solo si sus asientos siguen libres
    if (r.approvalStatus === 'rejected' && status !== 'rejected') {
      const taken = takenSeats(r.locatorCode);
      const ocupados = r.seats.map((s) => s.id).filter((id) => taken.has(id));
      if (ocupados.length) {
        return res.status(409).json({ success: false, message: `Asientos ya ocupados por otra compra: ${ocupados.join(', ')}` });
      }
    }
    r.approvalStatus = status;
    r.approvedAt = status === 'approved' ? Date.now() : r.approvedAt;
    r.rejectionReason = status === 'rejected' ? clip(req.body?.reason, 200) || 'No encontramos el pago en la cuenta.' : undefined;
    saveReservas();
    broadcast('reserva', r);
    return res.json({ success: true, reservation: r });
  });

  app.delete('/api/reservations/:locator', requireAdmin, (req, res) => {
    const r = findReserva(req.params.locator);
    if (!r) return res.status(404).json({ success: false, message: 'Compra no encontrada.' });
    if (r.approvalStatus !== 'rejected') return res.status(409).json({ success: false, message: 'Solo se pueden borrar compras rechazadas.' });
    reservas = reservas.filter((x) => x !== r);
    saveReservas();
    broadcast('borrada', r);
    return res.json({ success: true });
  });

  // ---------- Puerta ----------
  // Valida un QR (o un localizador + asiento escritos a mano) y registra el ingreso una sola vez
  app.post('/api/scan', requireStaff, (req, res) => {
    let loc = '';
    let seatId = '';
    const payload = clip(req.body?.payload, 300);
    if (payload) {
      // Formato del QR: PREFIJO|LOCALIZADOR|ASIENTO|FIRMA
      const [prefix, l, s, sig] = payload.split('|');
      if (prefix !== PREFIJO_LOCALIZADOR || !l || !s || !sig || !safeEqual(sig, qrSig(l, s))) {
        return res.json({ success: true, status: 'invalid', message: 'Este QR no es una entrada de este evento.' });
      }
      loc = l;
      seatId = s;
    } else {
      loc = clip(req.body?.locator, 40);
      seatId = clip(req.body?.seatId, 10).toUpperCase();
    }
    const r = findReserva(loc);
    if (!r) return res.json({ success: true, status: 'not_found', message: 'No existe una compra con ese localizador.' });
    const seat = r.seats.find((s) => s.id === seatId);
    if (!seat) return res.json({ success: true, status: 'choose_seat', reservation: r, checkIns: ingresosDe(r) });
    if (r.approvalStatus !== 'approved') {
      return res.json({ success: true, status: r.approvalStatus === 'rejected' ? 'rejected' : 'pending', reservation: r, seatId });
    }
    const key = ingresoKey(r.locatorCode, seat.id);
    if (ingresos[key]) {
      return res.json({ success: true, status: 'used', reservation: r, seatId, at: ingresos[key].at, checkIns: ingresosDe(r) });
    }
    ingresos[key] = { at: Date.now(), seatId: seat.id, locator: r.locatorCode, name: r.buyer.fullName };
    saveIngresos();
    broadcast('ingresos');
    return res.json({ success: true, status: 'valid', reservation: r, seatId, at: ingresos[key].at, checkIns: ingresosDe(r) });
  });
  const ingresosDe = (r: Reserva) =>
    Object.fromEntries(r.seats.filter((s) => ingresos[ingresoKey(r.locatorCode, s.id)]).map((s) => [s.id, ingresos[ingresoKey(r.locatorCode, s.id)].at]));

  // Anular un ingreso registrado por error: el administrador siempre, la puerta solo los de los últimos 30 minutos
  app.post('/api/checkin/undo', requireStaff, (req, res) => {
    const key = ingresoKey(clip(req.body?.locator, 40), clip(req.body?.seatId, 10).toUpperCase());
    const ing = ingresos[key];
    if (!ing) return res.status(404).json({ success: false, message: 'Ese ingreso no está registrado.' });
    if (sessionOf(req)?.rol !== 'admin' && Date.now() - ing.at > 30 * 60 * 1000) {
      return res.status(403).json({ success: false, message: 'Tiene más de 30 minutos: solo el administrador puede anularlo.' });
    }
    delete ingresos[key];
    saveIngresos();
    broadcast('ingresos');
    return res.json({ success: true });
  });

  app.get('/api/checkins', requireStaff, (_req, res) => res.json({ success: true, checkIns: ingresos }));

  app.use('/api', (_req, res) => res.status(404).json({ success: false, message: 'Ruta no encontrada' }));

  // ---------- Página ----------
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => res.sendFile(path.resolve(__dirname, 'dist', 'index.html')));
  } else {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => console.log(`Servidor en http://localhost:${PORT}`));
}

startServer().catch((err) => {
  console.error('No se pudo iniciar el servidor:', err);
  process.exit(1);
});
