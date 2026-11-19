import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Download, Clock, AlertTriangle } from 'lucide-react';
import { ReservationData, SelectedSeat } from '../types';
import { ASIENTOS_NUMERADOS, EVENTO } from '../config';
import { etiquetaEntrada } from '../constants';
import { drawTicket, qrPayload, ticketBlob } from '../utils/ticketImage';
import { saveImages } from '../utils/saveImage';
import { lookupReservations, RESERVAS_EVENT } from '../utils/api';

interface Props {
  reservation: ReservationData | null;
  onClose: () => void;
  onUpdate: (r: ReservationData) => void;
}

/** Entrada digital del comprador: se actualiza sola cuando el organizador aprueba el pago. */
export const DigitalTicketModal: React.FC<Props> = ({ reservation, onClose, onUpdate }) => {
  const [images, setImages] = useState<Record<string, string>>({});
  const [bigQr, setBigQr] = useState<{ seat: SelectedSeat; url: string } | null>(null);
  // Imágenes listas para guardar: se preparan antes del toque para que el botón guarde al instante
  const [files, setFiles] = useState<{ blob: Blob; fileName: string }[] | null>(null);
  const isApproved = reservation?.approvalStatus === 'approved';

  // Al cambiar el estado en el servidor (aprobación o rechazo), volver a consultar la compra
  useEffect(() => {
    if (!reservation) return;
    const refresh = (e?: Event) => {
      const changed = (e as CustomEvent | undefined)?.detail;
      if (changed && changed.locatorCode !== reservation.locatorCode) return;
      lookupReservations(reservation.locatorCode).then(({ list }) => {
        const latest = list.find((r) => r.locatorCode === reservation.locatorCode);
        if (latest && (latest.approvalStatus !== reservation.approvalStatus || !!latest.qr !== !!reservation.qr)) onUpdate(latest);
      });
    };
    window.addEventListener(RESERVAS_EVENT, refresh);
    const poll = window.setInterval(refresh, 60000);
    return () => {
      window.removeEventListener(RESERVAS_EVENT, refresh);
      window.clearInterval(poll);
    };
  }, [reservation, onUpdate]);

  // Generar los archivos PNG de la entrada cuando está aprobada
  useEffect(() => {
    if (!reservation || !isApproved) {
      setFiles(null);
      return;
    }
    let alive = true;
    Promise.all(
      reservation.seats.map(async (s) => ({
        blob: await ticketBlob(reservation, s),
        fileName: `Entrada_${s.pkg}_${reservation.locatorCode.replace('#', '')}_${s.id}.png`,
      }))
    ).then((list) => alive && setFiles(list));
    return () => {
      alive = false;
    };
  }, [reservation, isApproved]);

  // Dibujar cada entrada
  useEffect(() => {
    if (!reservation) return;
    let alive = true;
    Promise.all(reservation.seats.map(async (s) => [s.id, (await drawTicket(reservation, s)).toDataURL('image/png')] as const)).then(
      (list) => alive && setImages(Object.fromEntries(list))
    );
    return () => {
      alive = false;
    };
  }, [reservation]);

  if (!reservation) return null;
  const approved = reservation.approvalStatus === 'approved';
  const rejected = reservation.approvalStatus === 'rejected';
  const n = reservation.seats.length;

  const openQr = async (seat: SelectedSeat) => {
    const payload = qrPayload(reservation, seat.id);
    if (!payload) return;
    setBigQr({ seat, url: await QRCode.toDataURL(payload, { width: 720, margin: 2, errorCorrectionLevel: 'M' }) });
  };

  // Sin esperas antes de compartir: el menú del teléfono solo se abre en el mismo toque
  const save = () => {
    if (!files) return;
    saveImages(files, n > 1 ? `Entradas · ${EVENTO.nombre}` : `Entrada · ${EVENTO.nombre}`).catch(() => undefined);
  };

  return (
    <div className="fixed inset-0 z-[3000] overflow-y-auto bg-oscuro/80 backdrop-blur-md p-3 sm:p-6 animate-fadeIn">
      <div className="relative mx-auto my-4 w-full max-w-3xl rounded-3xl bg-white p-4 sm:p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-extrabold text-oscuro">{n > 1 ? `Tus entradas (${n})` : 'Tu entrada'}</h2>
            <p className="text-sm text-gray-600 truncate">
              {reservation.buyer.fullName} · {reservation.locatorCode}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="w-10 h-10 shrink-0 rounded-full grid place-items-center hover:bg-suave cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Estado del pago */}
        {!approved && !rejected && (
          <div className="mt-4 flex gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-amber-900">
            <Clock className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">
              <strong>Pago en revisión.</strong> Cuando el organizador lo apruebe, el QR aparecerá aquí. Puedes volver a verlo desde «Consultar Mi Boleto».
            </p>
          </div>
        )}
        {rejected && (
          <div role="alert" className="mt-4 flex gap-3 rounded-2xl bg-red-50 border border-red-200 p-4 text-red-900">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">
              <strong>Pago no verificado.</strong> {reservation.rejectionReason} {ASIENTOS_NUMERADOS ? 'Los asientos se liberaron.' : 'Las entradas se liberaron.'} Si crees que es un error, escríbenos por WhatsApp.
            </p>
          </div>
        )}

        <div className="mt-5 space-y-4">
          {reservation.seats.map((s) => (
            <figure key={s.id}>
              {n > 1 && <figcaption className="mb-1.5 text-sm font-bold text-oscuro">{ASIENTOS_NUMERADOS ? `Asiento ${s.id}` : `Entrada ${etiquetaEntrada(s)}`}</figcaption>}
              <button
                type="button"
                onClick={() => openQr(s)}
                disabled={!approved}
                className={`block w-full aspect-[5/2] rounded-2xl overflow-hidden bg-gray-100 ${approved ? 'cursor-zoom-in' : 'cursor-default'}`}
                aria-label={approved ? `Mostrar el QR de ${etiquetaEntrada(s)} en grande` : `Entrada ${etiquetaEntrada(s)}`}
              >
                {images[s.id] && <img src={images[s.id]} alt={`Entrada ${s.pkg} · ${etiquetaEntrada(s)}`} className="w-full h-full object-contain" />}
              </button>
            </figure>
          ))}
        </div>

        <button
          type="button"
          onClick={save}
          disabled={!approved || !files}
          className="mt-5 w-full min-h-[52px] rounded-full bg-marca hover:bg-marca-oscuro text-white font-bold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          {approved && !files ? 'Preparando…' : n > 1 ? 'Guardar entradas' : 'Guardar entrada'}
        </button>
        {approved && <p className="mt-2 text-center text-xs text-gray-500">En la puerta, toca la entrada para mostrar el QR en grande.</p>}      </div>

      {bigQr && (
        <div role="dialog" aria-label={`QR de ${etiquetaEntrada(bigQr.seat)}`} onClick={() => setBigQr(null)} className="fixed inset-0 z-[3100] flex flex-col items-center justify-center gap-4 p-6 bg-oscuro/95">
          <div className="w-full max-w-[min(88vw,420px)] aspect-square rounded-3xl bg-white p-4">
            <img src={bigQr.url} alt={`QR de ${etiquetaEntrada(bigQr.seat)}`} className="w-full h-full object-contain" />
          </div>
          <p className="text-white font-extrabold text-xl">{ASIENTOS_NUMERADOS ? `Asiento ${bigQr.seat.id}` : `Entrada ${etiquetaEntrada(bigQr.seat)}`}</p>
          <button type="button" className="min-h-[44px] px-6 rounded-full bg-white text-oscuro font-bold cursor-pointer">
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
};
