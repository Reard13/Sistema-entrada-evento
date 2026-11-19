import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Download, Clock, AlertTriangle } from 'lucide-react';
import { ReservationData, SelectedSeat } from '../types';
import { EVENTO, QR_GRUPO } from '../config';
import { drawTicket, qrPayload, ticketBlob } from '../utils/ticketImage';
import { saveImages } from '../utils/saveImage';
import { lookupReservations, RESERVAS_EVENT } from '../utils/api';

interface Props {
  reservation: ReservationData | null;
  onClose: () => void;
  onUpdate: (r: ReservationData) => void;
}

/** Entrada digital del comprador: una sola por compra, con un QR que valida todas sus entradas. */
export const DigitalTicketModal: React.FC<Props> = ({ reservation, onClose, onUpdate }) => {
  const [image, setImage] = useState<string | null>(null);
  const [bigQr, setBigQr] = useState<string | null>(null);
  // Archivo listo para guardar: se prepara antes del toque para que el botón guarde al instante
  const [file, setFile] = useState<{ blob: Blob; fileName: string } | null>(null);
  const isApproved = reservation?.approvalStatus === 'approved';

  // Al cambiar el estado en el servidor (aprobación o rechazo), volver a consultar la compra
  useEffect(() => {
    if (!reservation) return;
    const refresh = (e?: Event) => {
      const changed = (e as CustomEvent | undefined)?.detail;
      if (changed && changed.locatorCode !== reservation.locatorCode) return;
      lookupReservations(reservation.locatorCode).then(({ list }) => {
        const latest = list.find((r) => r.locatorCode === reservation.locatorCode);
        if (latest && (latest.approvalStatus !== reservation.approvalStatus || !!latest.qrGrupo !== !!reservation.qrGrupo)) onUpdate(latest);
      });
    };
    window.addEventListener(RESERVAS_EVENT, refresh);
    const poll = window.setInterval(refresh, 60000);
    return () => {
      window.removeEventListener(RESERVAS_EVENT, refresh);
      window.clearInterval(poll);
    };
  }, [reservation, onUpdate]);

  // Preparar el archivo PNG de la compra cuando está aprobada
  useEffect(() => {
    if (!reservation || !isApproved) {
      setFile(null);
      return;
    }
    let alive = true;
    ticketBlob(reservation, grupo(reservation)).then((blob) => {
      if (alive) setFile({ blob, fileName: `Entrada_${reservation.locatorCode.replace('#', '')}.png` });
    });
    return () => {
      alive = false;
    };
  }, [reservation, isApproved]);

  // Dibujar la entrada
  useEffect(() => {
    if (!reservation) return;
    let alive = true;
    drawTicket(reservation, grupo(reservation)).then((c) => alive && setImage(c.toDataURL('image/png')));
    return () => {
      alive = false;
    };
  }, [reservation]);

  if (!reservation) return null;
  const approved = reservation.approvalStatus === 'approved';
  const rejected = reservation.approvalStatus === 'rejected';
  const n = reservation.seats.length;

  const openQr = async () => {
    const payload = qrPayload(reservation);
    if (!payload) return;
    setBigQr(await QRCode.toDataURL(payload, { width: 720, margin: 2, errorCorrectionLevel: 'M' }));
  };

  // Sin esperas antes de compartir: el menú del teléfono solo se abre en el mismo toque
  const save = () => {
    if (!file) return;
    saveImages([file], `${n > 1 ? 'Entradas' : 'Entrada'} · ${EVENTO.nombre}`).catch(() => undefined);
  };

  return (
    <div className="fixed inset-0 z-[3000] overflow-y-auto bg-oscuro/80 backdrop-blur-md p-3 sm:p-6 animate-fadeIn">
      <div className="relative mx-auto my-4 w-full max-w-3xl rounded-3xl bg-white p-4 sm:p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-extrabold text-oscuro">{n > 1 ? `Tus ${n} entradas` : 'Tu entrada'}</h2>
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
              <strong>Pago en revisión.</strong> Cuando el organizador lo apruebe, el QR aparecerá aquí. Puedes volver a verlo desde «Consultar mi boleto».
            </p>
          </div>
        )}
        {rejected && (
          <div role="alert" className="mt-4 flex gap-3 rounded-2xl bg-red-50 border border-red-200 p-4 text-red-900">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">
              <strong>Pago no verificado.</strong> {reservation.rejectionReason} Las entradas se liberaron. Si crees que es un error, escríbenos por WhatsApp.
            </p>
          </div>
        )}

        <figure className="mt-5">
          <button
            type="button"
            onClick={openQr}
            disabled={!approved}
            className={`block w-full aspect-[5/2] rounded-2xl overflow-hidden bg-gray-100 ${approved ? 'cursor-zoom-in' : 'cursor-default'}`}
            aria-label={approved ? 'Mostrar el QR en grande' : 'Entrada'}
          >
            {image && <img src={image} alt={`Entrada general · ${n} ${n > 1 ? 'entradas' : 'entrada'}`} className="w-full h-full object-contain" />}
          </button>
        </figure>

        <button
          type="button"
          onClick={save}
          disabled={!approved || !file}
          className="mt-5 w-full min-h-[52px] rounded-full bg-marca hover:bg-marca-oscuro text-white font-bold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          {approved && !file ? 'Preparando…' : n > 1 ? 'Guardar entradas' : 'Guardar entrada'}
        </button>
        {approved && (
          <p className="mt-2 text-center text-xs text-gray-500">
            {n > 1 ? `Este QR sirve para las ${n} entradas. Muéstralo una sola vez en la puerta.` : 'En la puerta, toca la entrada para mostrar el QR en grande.'}
          </p>
        )}
      </div>

      {bigQr && (
        <div role="dialog" aria-label="QR de la compra" onClick={() => setBigQr(null)} className="fixed inset-0 z-[3100] flex flex-col items-center justify-center gap-4 p-6 bg-oscuro/95">
          <div className="w-full max-w-[min(88vw,420px)] aspect-square rounded-3xl bg-white p-4">
            <img src={bigQr} alt="QR de la compra" className="w-full h-full object-contain" />
          </div>
          <p className="text-white font-extrabold text-xl">{n > 1 ? `${n} entradas` : 'Entrada general'}</p>
          <button type="button" className="min-h-[44px] px-6 rounded-full bg-white text-oscuro font-bold cursor-pointer">
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
};

// La compra se dibuja como una sola entrada que lleva el QR de todas sus entradas
const grupo = (r: ReservationData): SelectedSeat => ({ id: QR_GRUPO, fila: 'N', num: r.seats.length, pkg: 'General' });
