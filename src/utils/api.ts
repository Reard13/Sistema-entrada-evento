import { ReservationData, SelectedSeat } from '../types';
import { readSession } from './adminSession';

// Avisos en tiempo real del servidor: compras nuevas, aprobaciones e ingresos en la puerta
export const RESERVAS_EVENT = 'evento_reservas_actualizadas';
export const INGRESOS_EVENT = 'evento_ingresos_actualizados';

let source: EventSource | null = null;
export function connectRealtime() {
  if (typeof EventSource === 'undefined') return;
  source?.close();
  const token = readSession()?.token;
  source = new EventSource(token ? `/api/stream?token=${encodeURIComponent(token)}` : '/api/stream');
  source.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === 'ingresos') window.dispatchEvent(new CustomEvent(INGRESOS_EVENT));
      else window.dispatchEvent(new CustomEvent(RESERVAS_EVENT, { detail: msg.reserva }));
    } catch {
      /* mensaje inválido */
    }
  };
}

export async function fetchBlockedSeats(): Promise<string[] | null> {
  try {
    const res = await fetch('/api/seats/blocked');
    const data = await res.json();
    return Array.isArray(data?.seats) ? data.seats : null;
  } catch {
    return null;
  }
}

export type SubmitResult =
  | { ok: true; reservation: ReservationData }
  | { ok: false; message: string; takenSeats?: string[] };

export async function submitReservation(input: {
  seats: SelectedSeat[];
  buyer: { fullName: string; phone: string };
  paymentReport: { method: string; referenceNumber: string; bank: string; payerPhone: string };
  bcvRate: number; // bolívares por €
  usdRate: number; // bolívares por $ (referencia)
  termsAccepted: boolean;
  termsVersion: string;
}): Promise<SubmitResult> {
  try {
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.reservation) return { ok: true, reservation: data.reservation };
    return { ok: false, message: data?.message || 'No se pudo registrar la compra.', takenSeats: data?.takenSeats };
  } catch {
    return { ok: false, message: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.' };
  }
}

// Busca compras por localizador o teléfono completo
export async function lookupReservations(q: string): Promise<{ list: ReservationData[]; error?: string }> {
  try {
    const res = await fetch(`/api/reservations/lookup?q=${encodeURIComponent(q)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { list: [], error: data?.message || 'No se pudo buscar.' };
    return { list: data.reservations || [] };
  } catch {
    return { list: [], error: 'Sin conexión. Revisa tu internet.' };
  }
}

// Boleto abierto en este dispositivo: se recuerda para volver a mostrarlo al regresar de WhatsApp
const ACTIVE_KEY = 'evento_boleto_activo';
export const rememberTicket = (locator: string) => {
  try {
    localStorage.setItem(ACTIVE_KEY, locator);
  } catch {
    /* ignorar */
  }
};
export const forgetTicket = () => {
  try {
    localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignorar */
  }
};
export const rememberedTicket = (): string | null => {
  try {
    return new URLSearchParams(window.location.search).get('boleto') || localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
};
