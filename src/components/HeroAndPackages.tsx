import React, { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, Check, ArrowRight, Minus, Plus } from 'lucide-react';
import { ASIENTOS_NUMERADOS, EVENTO, ENTRADAS, MAX_POR_COMPRA, PAGO_MOVIL } from '../config';
import { PackageType } from '../types';
import { formatBs } from '../utils/exchangeRate';

interface Props {
  bcvRate: number;
  onSelectPackage: (pkg: PackageType) => void;
  // Sin asientos numerados: comprar una cantidad de entradas
  onBuyQuantity: (cantidad: number) => void;
  onOpenLookup: () => void;
  disponibles: number;
}

function useCountdown(target: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const diff = Math.max(0, target - now);
  return {
    done: diff === 0,
    parts: [
      ['Días', Math.floor(diff / 86400000)],
      ['Horas', Math.floor(diff / 3600000) % 24],
      ['Min', Math.floor(diff / 60000) % 60],
      ['Seg', Math.floor(diff / 1000) % 60],
    ] as [string, number][],
  };
}

// Etiqueta pequeña en mayúsculas con letras separadas
const Eyebrow: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <span className={`text-xs sm:text-[13px] font-semibold tracking-[0.28em] uppercase ${className}`}>{children}</span>
);

export const HeroAndPackages: React.FC<Props> = ({ bcvRate, onSelectPackage, onBuyQuantity, onOpenLookup, disponibles }) => {
  const [cantidad, setCantidad] = useState(1);
  const maximo = Math.max(0, Math.min(MAX_POR_COMPRA, disponibles));
  const cant = Math.max(1, Math.min(cantidad, maximo || 1));
  const { done, parts } = useCountdown(new Date(EVENTO.fechaISO).getTime());
  const precio = ENTRADAS.General.precio;
  const general = ENTRADAS.General;

  const datos: { icon: React.ReactNode; label: string; value: string; href?: string }[] = [
    { icon: <Calendar className="w-7 h-7" strokeWidth={1.6} />, label: 'Fecha', value: `${EVENTO.fechaTexto} de ${new Date(EVENTO.fechaISO).getFullYear()}` },
    { icon: <Clock className="w-7 h-7" strokeWidth={1.6} />, label: 'Hora', value: EVENTO.horaTexto },
    { icon: <MapPin className="w-7 h-7" strokeWidth={1.6} />, label: 'Lugar', value: `${EVENTO.lugar}, ${EVENTO.ciudad}`, href: EVENTO.mapaUrl || undefined },
  ];

  const pasos = [
    [ASIENTOS_NUMERADOS ? 'Elige tus asientos' : 'Elige tus entradas', 'El total aparece en dólares y en bolívares a la tasa BCV del día.'],
    ['Paga y reporta', 'Haz el Pago Móvil y envía la referencia por WhatsApp desde la misma página.'],
    ['Recibe tu QR', 'Al verificar el pago, tu entrada con código QR queda lista en «Mi boleto».'],
  ];

  return (
    <>
      {/* ---------- Portada ---------- */}
      <section
        className={`${EVENTO.fotoPortada ? 'hero-foto' : 'hero-bg'} text-crema`}
        style={EVENTO.fotoPortada ? ({ '--hero-foto': `url(${EVENTO.fotoPortada})` } as React.CSSProperties) : undefined}
      >
        <div className="max-w-5xl mx-auto px-4 pt-14 pb-20 sm:pt-20 sm:pb-24 flex flex-col items-center text-center gap-6 sm:gap-7">
          {EVENTO.logoMarca && (
            <div className="flex flex-col items-center gap-1">
              <img src={EVENTO.logoMarca} alt={EVENTO.organizador} className="w-36 sm:w-48 h-auto" />
              <Eyebrow className="text-tenue">presenta</Eyebrow>
            </div>
          )}

          {EVENTO.logoTitulo ? (
            <h1 className="w-full max-w-4xl">
              <img src={EVENTO.logoTitulo} alt={EVENTO.nombre} className="block w-full h-auto drop-shadow-[0_4px_18px_rgba(0,0,0,0.55)]" />
            </h1>
          ) : (
            <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] text-balance">{EVENTO.nombre}</h1>
          )}

          <p className="max-w-2xl font-display italic font-medium text-lg sm:text-2xl leading-relaxed text-crema/90 text-pretty">{EVENTO.descripcion}</p>

          {/* Fecha, hora y lugar */}
          <div className="w-full sm:w-auto grid grid-cols-2 sm:flex sm:flex-wrap justify-center border-y border-oro/25">
            <div className="px-3 sm:px-8 py-4 flex flex-col gap-1 text-center">
              <Eyebrow className="text-tenue !text-[11px] sm:!text-xs">Fecha</Eyebrow>
              <span className="text-base sm:text-lg font-medium">{EVENTO.fechaTexto}</span>
            </div>
            <div className="px-3 sm:px-8 py-4 flex flex-col gap-1 text-center border-l border-oro/25">
              <Eyebrow className="text-tenue !text-[11px] sm:!text-xs">Hora</Eyebrow>
              <span className="text-base sm:text-lg font-medium">{EVENTO.horaTexto}</span>
            </div>
            <div className="col-span-2 px-3 sm:px-8 py-4 flex flex-col gap-1 text-center border-t sm:border-t-0 sm:border-l border-oro/25">
              <Eyebrow className="text-tenue !text-[11px] sm:!text-xs">Lugar</Eyebrow>
              {EVENTO.mapaUrl ? (
                <a href={EVENTO.mapaUrl} target="_blank" rel="noreferrer" className="text-base sm:text-lg font-medium text-oro underline underline-offset-4 hover:text-white">
                  {EVENTO.lugar}
                </a>
              ) : (
                <span className="text-base sm:text-lg font-medium">{EVENTO.lugar}</span>
              )}
            </div>
          </div>

          {/* Cuenta regresiva */}
          {!done && (
            <div className="flex justify-center gap-4 sm:gap-8" aria-label="Cuenta regresiva">
              {parts.map(([label, value]) => (
                <div key={label} className="min-w-[56px] sm:min-w-[72px] flex flex-col items-center gap-1">
                  <span className="font-display font-bold text-4xl sm:text-5xl leading-none text-white tabular-nums">{String(value).padStart(2, '0')}</span>
                  <Eyebrow className="text-tenue !text-[11px] sm:!text-xs !tracking-[0.2em]">{label}</Eyebrow>
                </div>
              ))}
            </div>
          )}

          <div className="w-full sm:w-auto flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <a
              href="#entradas"
              className="inline-flex items-center justify-center gap-2 min-h-[56px] px-9 rounded-full bg-marca hover:bg-marca-oscuro text-white font-semibold text-base sm:text-lg"
            >
              Comprar entradas · ${precio}
              <ArrowRight className="w-5 h-5" />
            </a>
            <button
              type="button"
              onClick={onOpenLookup}
              className="inline-flex items-center justify-center min-h-[56px] px-7 rounded-full border border-crema/40 hover:bg-white/10 text-crema font-medium text-base sm:text-lg cursor-pointer"
            >
              Consultar mi boleto
            </button>
          </div>
        </div>
      </section>

      {/* ---------- El concierto ---------- */}
      <section className="bg-crema text-[#1A1F1B] px-4 py-16 sm:py-24">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-10 sm:gap-16 items-start">
          <div className="flex-[999_1_420px] min-w-0 flex flex-col gap-5">
            <Eyebrow className="text-marca">El concierto</Eyebrow>
            <h2 className="font-display font-bold text-3xl sm:text-5xl leading-tight text-oscuro text-balance">{EVENTO.titularConcierto}</h2>
            <p className="text-lg sm:text-xl leading-relaxed text-[#4A4640] text-pretty">
              {EVENTO.descripcion.replace(/\.$/, '')} en {EVENTO.lugar}.
            </p>
          </div>
          <ul className="flex-[1_1_320px] min-w-0 bg-white border border-linea rounded-[20px] divide-y divide-[#ECE7DD]">
            {datos.map((d) => (
              <li key={d.label} className="px-6 sm:px-7 py-5 sm:py-6 flex gap-4 items-center">
                <span className="text-marca shrink-0" aria-hidden="true">{d.icon}</span>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[13px] tracking-[0.16em] uppercase text-cafe">{d.label}</span>
                  <span className="text-lg font-semibold">{d.value}</span>
                  {d.href && (
                    <a href={d.href} target="_blank" rel="noreferrer" className="text-[15px] font-semibold text-marca underline underline-offset-4 hover:text-marca-oscuro">
                      Cómo llegar
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- Entradas ---------- */}
      <section id="entradas" className="scroll-mt-16 bg-oscuro text-crema px-4 py-16 sm:py-24">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-10">
          <div className="flex flex-col items-center gap-3 text-center">
            <Eyebrow className="text-oro">Entradas</Eyebrow>
            <h2 className="font-display font-bold text-3xl sm:text-5xl leading-tight">Reserva tu lugar</h2>
            <p className="text-base sm:text-lg text-tenue text-pretty">
              {ASIENTOS_NUMERADOS ? 'Elige tus asientos en el mapa.' : 'Acceso general, sin asiento asignado. Cada entrada lleva su propio código QR.'}
            </p>
          </div>

          <div className="w-full flex flex-wrap bg-crema text-[#1A1F1B] rounded-3xl overflow-hidden">
            {/* Lado del precio */}
            <div className="flex-[999_1_380px] min-w-0 p-6 sm:p-10 flex flex-col gap-5 border-b-2 sm:border-b-0 sm:border-r-2 border-dashed border-[#CFCABF]">
              <span className="self-start px-3.5 py-1.5 rounded-full bg-[#E6E0D3] text-marca-oscuro text-xs sm:text-[13px] font-semibold tracking-[0.18em] uppercase">
                Entrada general
              </span>
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-display font-bold text-6xl sm:text-7xl leading-none text-oscuro">${precio}</span>
                <span className="text-base sm:text-lg font-medium text-cafe">≈ Bs. {formatBs(precio * bcvRate)}</span>
              </p>
              <ul className="flex flex-col gap-2.5">
                {general.beneficios.map((b) => (
                  <li key={b} className="flex gap-2.5 items-center text-base sm:text-[17px]">
                    <Check className="w-5 h-5 shrink-0 text-marca" strokeWidth={2.2} />
                    {b}
                  </li>
                ))}
                <li className="flex gap-2.5 items-center text-base sm:text-[17px]">
                  <Check className="w-5 h-5 shrink-0 text-marca" strokeWidth={2.2} />
                  Pago por Pago Móvil{PAGO_MOVIL.banco.includes('Ejemplo') ? '' : ` (${PAGO_MOVIL.banco})`}
                </li>
              </ul>
            </div>

            {/* Lado de la compra */}
            <div className="flex-[1_1_300px] min-w-0 p-6 sm:p-10 flex flex-col justify-center gap-5 bg-white">
              {ASIENTOS_NUMERADOS ? (
                <button
                  type="button"
                  onClick={() => onSelectPackage('General')}
                  className="min-h-[56px] rounded-full bg-marca hover:bg-marca-oscuro text-white font-semibold text-lg inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  Elegir asientos
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : maximo === 0 ? (
                <p className="min-h-[56px] rounded-full bg-gray-100 text-gray-500 font-semibold text-lg inline-flex items-center justify-center">Agotado</p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-base font-semibold">Cantidad</span>
                    <div className="inline-flex items-center gap-1 rounded-full border border-linea p-1">
                      <button
                        type="button"
                        aria-label="Una entrada menos"
                        disabled={cant <= 1}
                        onClick={() => setCantidad(Math.max(1, cant - 1))}
                        className="w-11 h-11 rounded-full bg-crema text-marca-oscuro grid place-items-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-11 text-center font-display font-bold text-2xl tabular-nums" aria-live="polite">
                        {cant}
                      </span>
                      <button
                        type="button"
                        aria-label="Una entrada más"
                        disabled={cant >= maximo}
                        onClick={() => setCantidad(Math.min(maximo, cant + 1))}
                        className="w-11 h-11 rounded-full bg-crema text-marca-oscuro grid place-items-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {disponibles <= 20 && <p className="-mt-2 text-right text-sm font-semibold text-marca">Quedan {disponibles} entradas</p>}
                  <div className="flex items-baseline justify-between pt-4 border-t border-[#ECE7DD]">
                    <span className="text-sm tracking-[0.16em] uppercase text-cafe">Total</span>
                    <span className="text-right">
                      <span className="block font-display font-bold text-4xl text-oscuro tabular-nums">${precio * cant}</span>
                      <span className="block text-sm font-medium text-cafe">Bs. {formatBs(precio * cant * bcvRate)}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onBuyQuantity(cant)}
                    className="min-h-[56px] rounded-full bg-marca hover:bg-marca-oscuro text-white font-semibold text-lg inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Continuar al pago
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
          <p className="-mt-4 text-center text-xs sm:text-sm text-tenue">Precio en bolívares según la tasa BCV del día ({formatBs(bcvRate)} Bs/$).</p>
        </div>
      </section>

      {/* ---------- Cómo comprar ---------- */}
      <section className="bg-crema text-[#1A1F1B] px-4 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto flex flex-col gap-8 sm:gap-10">
          <h2 className="text-center font-display font-bold text-3xl sm:text-4xl text-oscuro">Cómo comprar</h2>
          <ol className="grid gap-4 sm:gap-6 sm:grid-cols-3">
            {pasos.map(([titulo, texto], i) => (
              <li key={titulo} className="flex sm:flex-col gap-4 sm:gap-3 p-5 sm:p-7 bg-white border border-linea rounded-[20px]">
                <span className="font-display font-bold text-4xl leading-none text-marca" aria-hidden="true">{i + 1}</span>
                <div className="flex flex-col gap-1.5">
                  <span className="text-lg sm:text-xl font-semibold">{titulo}</span>
                  <span className="text-[15px] sm:text-base leading-relaxed text-[#4A4640]">{texto}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
};
