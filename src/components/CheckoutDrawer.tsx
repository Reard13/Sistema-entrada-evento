import React, { useState } from 'react';
import { X, Copy, Check, MessageCircle, ChevronDown } from 'lucide-react';
import { SelectedSeat, ReservationData } from '../types';
import { ASIENTOS_NUMERADOS, EVENTO, METODOS_PAGO, WHATSAPP, TERMINOS_VERSION } from '../config';
import { BANCOS_VENEZUELA, etiquetaEntrada, palabraEntrada, precioEntrada, totalEntradasUsd } from '../constants';
import { formatBs } from '../utils/exchangeRate';
import { submitReservation } from '../utils/api';
import { TermsModal } from './TermsModal';
import { HoldingTimerBanner } from './HoldingTimerBanner';

interface CheckoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSeats: SelectedSeat[];
  onConfirmReservation: (reservation: ReservationData) => void;
  // Asientos que el servidor indica como ya tomados por otro comprador
  onSeatsTaken: (seatIds: string[]) => void;
  secondsLeft: number;
  totalSeconds: number;
  bcvRate: number;
}

export const CheckoutDrawer: React.FC<CheckoutDrawerProps> = ({
  isOpen,
  onClose,
  selectedSeats,
  onConfirmReservation,
  onSeatsTaken,
  secondsLeft,
  totalSeconds,
  bcvRate,
}) => {
  const metodos = METODOS_PAGO.filter((m) => m.activo);
  const [metodoId, setMetodoId] = useState(metodos[0]?.id ?? 'pagomovil');
  const metodo = metodos.find((m) => m.id === metodoId) ?? metodos[0];
  const enBs = metodo?.moneda !== 'USD';
  const [buyer, setBuyer] = useState({ fullName: '', phone: '' });
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentBank, setPaymentBank] = useState(BANCOS_VENEZUELA[0]);
  const [paymentCustomBank, setPaymentCustomBank] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [showPayerPhone, setShowPayerPhone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  // Términos y condiciones: obligatorio aceptarlos para enviar el reporte
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const totalUsd = totalEntradasUsd(selectedSeats);
  const totalBs = Math.round(totalUsd * bcvRate * 100) / 100;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!buyer.fullName.trim()) errors.fullName = 'Ingresa tu nombre y apellido';
    if (buyer.phone.replace(/\D/g, '').length < 10) errors.phone = 'Ingresa un teléfono válido (ej. 0424-1234567)';
    if (paymentReference.trim().length < 4) errors.paymentReference = `Ingresa el ${metodo.referencia.toLowerCase()} (al menos 4 caracteres)`;
    if (metodo.pideBanco && paymentBank === 'Otro Banco' && !paymentCustomBank.trim()) errors.paymentCustomBank = 'Escribe el nombre del banco';
    if (!termsAccepted) errors.terms = 'Debes aceptar los términos y condiciones para continuar';
    setFormErrors(errors);
    return errors;
  };

  const handleProcessCheckout = async () => {
    if (isSubmitting) return;
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      if (!(Object.keys(errors).length === 1 && errors.terms)) {
        document.getElementById('checkout-report-section')?.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    // La pestaña de WhatsApp se abre ya (dentro del toque, para que el navegador no la bloquee)
    // y recibe la dirección solo si el servidor acepta la compra
    const waWindow = window.open('', '_blank');
    const bank = !metodo.pideBanco ? '' : paymentBank === 'Otro Banco' ? paymentCustomBank.trim() : paymentBank;
    const effectivePayerPhone = payerPhone.replace(/\D/g, '').length >= 10 ? payerPhone.trim() : buyer.phone.trim();
    const reference = paymentReference.trim();

    setIsSubmitting(true);
    setSubmitError('');
    const result = await submitReservation({
      seats: selectedSeats,
      buyer: { fullName: buyer.fullName.trim(), phone: buyer.phone.trim() },
      paymentReport: { method: metodo.id, referenceNumber: reference, bank, payerPhone: effectivePayerPhone },
      bcvRate,
      termsAccepted: true,
      termsVersion: TERMINOS_VERSION,
    });
    setIsSubmitting(false);

    if (!result.ok) {
      waWindow?.close();
      setSubmitError(result.message);
      if (result.takenSeats?.length) onSeatsTaken(result.takenSeats);
      return;
    }

    const r = result.reservation;
    const seatsLine = r.seats.map((s) => etiquetaEntrada(s)).join(', ');
    const payerLine = effectivePayerPhone !== buyer.phone.trim() ? `\nPagado desde: ${effectivePayerPhone}` : '';
    const waMsg =
      `*Reporte de pago · ${EVENTO.nombre}*\n` +
      `Localizador: *${r.locatorCode}*\n\n` +
      `*${r.buyer.fullName}* · ${r.buyer.phone}\n` +
      `${ASIENTOS_NUMERADOS ? (r.seats.length === 1 ? 'Asiento' : `Asientos (${r.seats.length})`) : r.seats.length === 1 ? 'Entrada' : `Entradas (${r.seats.length})`}: ${seatsLine}\n\n` +
      `${metodo.nombre} · Ref. *${reference}*${bank ? ` · ${bank}` : ''}${payerLine}\n` +
      (enBs
        ? `Monto: *Bs. ${formatBs(r.totalBs)}* ($${r.totalUsd.toFixed(2)}) · Tasa ${formatBs(r.bcvRate)}\n\n`
        : `Monto: *$${r.totalUsd.toFixed(2)}*\n\n`) +
      `Por favor verifiquen el pago para liberar mi QR. ¡Gracias!`;
    const waUrl = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(waMsg)}`;

    onConfirmReservation(r);
    if (waWindow) {
      waWindow.opener = null;
      waWindow.location.href = waUrl;
    } else {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (!isOpen) return null;

  // Campos a 16px en móvil para que iOS no haga zoom al escribir
  const inputClass = (hasError?: boolean) =>
    `w-full text-base sm:text-sm bg-suave border rounded-xl px-3.5 py-2.5 text-oscuro placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-marca/50 transition-colors ${
      hasError ? 'border-red-400 bg-red-50/60' : 'border-gray-300'
    }`;

  const labelClass = 'block text-xs font-bold text-marca-oscuro mb-1.5';

  // Fila de dato de Pago Móvil con botón de copiar individual
  const CopyRow = ({ label, value, copyValue, id }: { label: string; value: string; copyValue?: string; id: string }) => (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <span className="block text-[11px] font-semibold text-gray-500">{label}</span>
        <span className="block text-sm font-bold text-oscuro break-words">{value}</span>
      </div>
      {copyValue && (
        <button
          type="button"
          onClick={() => copyToClipboard(copyValue, id)}
          className="shrink-0 w-9 h-9 rounded-xl bg-white border border-gray-300 text-marca-oscuro flex items-center justify-center hover:bg-suave transition-colors cursor-pointer"
          aria-label={`Copiar ${label}`}
        >
          {copiedType === id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[2000] flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-oscuro/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel: pantalla completa en móvil, panel lateral desde tablet */}
      <div className="relative w-full sm:max-w-md bg-white text-marca-oscuro h-[100dvh] shadow-2xl flex flex-col z-10 overflow-hidden animate-slideLeft sm:border-l border-gray-300">

        {/* Header Compacto */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-3 border-b border-gray-200 shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-marca-oscuro leading-tight">
              Finalizar compra
            </h2>
            <p className="text-xs text-gray-500 font-semibold mt-0.5">
              {selectedSeats.length} {palabraEntrada(selectedSeats.length)} · {EVENTO.lugar} · {EVENTO.fechaCorta}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-10 h-10 rounded-full bg-suave text-marca-oscuro hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body con Scroll */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-4">

          {/* Banner Temporizador */}
          {ASIENTOS_NUMERADOS && <HoldingTimerBanner secondsLeft={secondsLeft} totalSeconds={totalSeconds} />}

          {/* Tu pedido: asientos, aporte opcional y total */}
          <section className="rounded-2xl border border-gray-200 p-4 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {!ASIENTOS_NUMERADOS && selectedSeats.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-suave border border-gray-200 pl-1 pr-2.5 py-1 text-xs font-bold text-oscuro">
                  <span className="rounded-full bg-marca text-white px-2 py-0.5 text-[11px] font-bold">{selectedSeats.length} ×</span>
                  Entrada {selectedSeats[0].pkg} · ${precioEntrada(selectedSeats[0].pkg)}
                </span>
              )}
              {ASIENTOS_NUMERADOS && selectedSeats.map((seat) => (
                <span
                  key={seat.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-suave border border-gray-200 pl-1 pr-2.5 py-1 text-xs font-bold text-oscuro"
                >
                  <span className="rounded-full bg-marca text-white px-2 py-0.5 text-[11px] font-bold">{seat.id}</span>
                  {seat.pkg} · ${precioEntrada(seat.pkg)}
                </span>
              ))}
            </div>

            {/* Total */}
            <div className="flex items-end justify-between gap-3 pt-3 border-t border-dashed border-gray-300">
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-gray-500">Total a pagar</span>
                {enBs && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 mt-0.5">
                    Tasa BCV {formatBs(bcvRate)} Bs/$
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="block text-2xl font-bold text-marca-oscuro leading-none tabular-nums">
                  {enBs ? `Bs. ${formatBs(totalBs)}` : `$${totalUsd.toFixed(2)}`}
                </span>
                <span className="text-xs font-bold text-gray-500">{enBs ? `$${totalUsd.toFixed(2)} USD` : 'en dólares'}</span>
              </div>
            </div>
          </section>

          {/* Paso 1: método de pago y sus datos */}
          <section className="rounded-2xl bg-suave border border-gray-200 px-4 pt-3 pb-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-marca-oscuro">
              <span className="w-6 h-6 rounded-full bg-marca text-white text-xs grid place-items-center">1</span>
              Elige cómo pagar
            </h3>
            {metodos.length > 1 && (
              <div role="radiogroup" aria-label="Método de pago" className="mt-3 grid grid-cols-3 gap-1.5">
                {metodos.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={m.id === metodo.id}
                    onClick={() => {
                      setMetodoId(m.id);
                      setPaymentReference('');
                      setFormErrors({});
                    }}
                    className={`min-h-[52px] px-2 rounded-xl border text-[13px] font-bold leading-tight cursor-pointer transition-colors ${
                      m.id === metodo.id ? 'bg-marca border-marca text-white' : 'bg-white border-gray-300 text-oscuro hover:border-marca'
                    }`}
                  >
                    {m.nombre}
                    <span className={`block text-[11px] font-semibold ${m.id === metodo.id ? 'text-white/80' : 'text-gray-500'}`}>
                      {m.moneda === 'USD' ? 'en dólares' : 'en bolívares'}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="divide-y divide-gray-200 mt-2">
              {metodo.datos.map((d) => (
                <CopyRow key={d.label} id={`${metodo.id}-${d.label}`} label={d.label} value={d.valor} copyValue={d.copiar} />
              ))}
              <CopyRow
                id={`${metodo.id}-monto`}
                label="Monto"
                value={enBs ? `Bs. ${formatBs(totalBs)}` : `$${totalUsd.toFixed(2)}`}
                copyValue={enBs ? formatBs(totalBs) : totalUsd.toFixed(2)}
              />
            </div>
          </section>

          {/* Paso 2: Reporte del pago y datos del titular */}
          <section id="checkout-report-section" className="rounded-2xl border border-gray-200 p-4 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-marca-oscuro">
              <span className="w-6 h-6 rounded-full bg-marca text-white text-xs grid place-items-center">2</span>
              Reporta tu pago
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="ck-name" className={labelClass}>Nombre y apellido</label>
                <input
                  id="ck-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Carmen Rodríguez"
                  value={buyer.fullName}
                  onChange={(e) => {
                    setBuyer({ ...buyer, fullName: e.target.value });
                    if (formErrors.fullName) setFormErrors({ ...formErrors, fullName: '' });
                  }}
                  className={inputClass(!!formErrors.fullName)}
                />
                {formErrors.fullName && <p className="text-xs text-red-500 mt-1 font-semibold">{formErrors.fullName}</p>}
              </div>

              <div>
                <label htmlFor="ck-phone" className={labelClass}>Teléfono / WhatsApp</label>
                <input
                  id="ck-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="0424-1234567"
                  value={buyer.phone}
                  onChange={(e) => {
                    setBuyer({ ...buyer, phone: e.target.value });
                    if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' });
                  }}
                  className={inputClass(!!formErrors.phone)}
                />
                {formErrors.phone && <p className="text-xs text-red-500 mt-1 font-semibold">{formErrors.phone}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="ck-ref" className={labelClass}>{metodo.referencia}</label>
                <input
                  id="ck-ref"
                  type="text"
                  inputMode={enBs ? 'numeric' : 'text'}
                  placeholder={metodo.ejemploReferencia}
                  value={paymentReference}
                  onChange={(e) => {
                    setPaymentReference(e.target.value);
                    if (formErrors.paymentReference) setFormErrors({ ...formErrors, paymentReference: '' });
                  }}
                  className={`${inputClass(!!formErrors.paymentReference)} font-mono font-bold`}
                />
                {formErrors.paymentReference && (
                  <p className="text-xs text-red-500 mt-1 font-semibold">{formErrors.paymentReference}</p>
                )}
              </div>

              {metodo.pideBanco && (
              <div>
                <label htmlFor="ck-bank" className={labelClass}>Banco desde el que pagaste</label>
                <select
                  id="ck-bank"
                  value={paymentBank}
                  onChange={(e) => setPaymentBank(e.target.value)}
                  className={inputClass()}
                >
                  {BANCOS_VENEZUELA.map((banco) => (
                    <option key={banco} value={banco} className="text-gray-800">
                      {banco}
                    </option>
                  ))}
                </select>
                {paymentBank === 'Otro Banco' && (
                  <input
                    type="text"
                    placeholder="Nombre del banco"
                    value={paymentCustomBank}
                    onChange={(e) => {
                      setPaymentCustomBank(e.target.value);
                      if (formErrors.paymentCustomBank) setFormErrors({ ...formErrors, paymentCustomBank: '' });
                    }}
                    className={`${inputClass(!!formErrors.paymentCustomBank)} mt-2`}
                  />
                )}
                {formErrors.paymentCustomBank && (
                  <p className="text-xs text-red-500 mt-1 font-semibold">{formErrors.paymentCustomBank}</p>
                )}
              </div>
              )}
            </div>

            {/* Teléfono del pagador solo si es distinto al del titular (pagos en bolívares) */}
            {!metodo.pideBanco ? null : showPayerPhone ? (
              <div>
                <label htmlFor="ck-payer" className={labelClass}>Teléfono desde el que se pagó</label>
                <input
                  id="ck-payer"
                  type="tel"
                  inputMode="tel"
                  placeholder="0414-7654321"
                  value={payerPhone}
                  onChange={(e) => setPayerPhone(e.target.value)}
                  className={inputClass()}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowPayerPhone(true)}
                className="inline-flex items-center gap-1 text-xs font-bold text-marca-oscuro hover:text-marca underline underline-offset-4 cursor-pointer"
              >
                ¿Pagaste desde otro número?
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            )}
          </section>
        </div>

        {/* Footer con Botón Principal */}
        <div className="px-4 sm:px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white border-t border-gray-200 shrink-0">
          <label className="mb-2.5 flex items-start gap-2.5 text-xs font-semibold text-oscuro cursor-pointer select-none">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => {
                setTermsAccepted(e.target.checked);
                if (formErrors.terms) setFormErrors({ ...formErrors, terms: '' });
              }}
              className="mt-0.5 w-5 h-5 shrink-0 accent-[var(--marca)] cursor-pointer"
            />
            <span>
              Acepto los{' '}
              <button type="button" onClick={() => setTermsOpen(true)} className="underline underline-offset-2 font-bold cursor-pointer">
                términos y condiciones
              </button>{' '}
              del evento.
            </span>
          </label>
          {formErrors.terms && <p className="-mt-1.5 mb-2.5 text-xs text-red-500 font-semibold">{formErrors.terms}</p>}
          <TermsModal isOpen={termsOpen} onClose={() => setTermsOpen(false)} />
          {submitError && (
            <p role="alert" className="mb-2.5 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-600">
              {submitError}
            </p>
          )}
          <button
            onClick={handleProcessCheckout}
            disabled={selectedSeats.length === 0 || isSubmitting}
            className="w-full py-3.5 px-5 rounded-2xl bg-marca hover:bg-marca-oscuro text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{isSubmitting ? 'Enviando…' : 'Enviar reporte por WhatsApp'}</span>
          </button>
          <p className="text-xs text-center text-gray-500 font-medium mt-2">
            Verificaremos tu pago y te enviaremos tu QR de acceso.
          </p>
        </div>
      </div>
    </div>
  );
};
