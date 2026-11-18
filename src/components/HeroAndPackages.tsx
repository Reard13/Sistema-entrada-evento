import React, { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, Check, ArrowRight, Minus, Plus } from 'lucide-react';
import { ASIENTOS_NUMERADOS, EVENTO, ENTRADAS, MAX_POR_COMPRA } from '../config';
import { PackageType } from '../types';
import { formatBs } from '../utils/exchangeRate';

interface Props {
  bcvRate: number;
  onSelectPackage: (pkg: PackageType) => void;
  // Sin asientos numerados: comprar una cantidad de entradas
  onBuyQuantity: (cantidad: number) => void;
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

export const HeroAndPackages: React.FC<Props> = ({ bcvRate, onSelectPackage, onBuyQuantity, disponibles }) => {
  const [cantidad, setCantidad] = useState(1);
  const maximo = Math.max(0, Math.min(MAX_POR_COMPRA, disponibles));
  const { done, parts } = useCountdown(new Date(EVENTO.fechaISO).getTime());

  return (
    <>
      {/* ---------- Portada ---------- */}
      <section
        className={`${EVENTO.fotoPortada ? 'hero-foto' : 'hero-bg'} text-white`}
        style={EVENTO.fotoPortada ? ({ '--hero-foto': `url(${EVENTO.fotoPortada})` } as React.CSSProperties) : undefined}
      >
        <div className="max-w-6xl mx-auto px-4 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
          {EVENTO.logoTitulo ? (
            <h1 className="mx-auto max-w-4xl">
              <img src={EVENTO.logoTitulo} alt={EVENTO.nombre} className="block w-full h-auto drop-shadow-[0_4px_18px_rgba(0,0,0,0.55)]" />
            </h1>
          ) : (
            <>
              <p className="text-xs sm:text-sm font-semibold tracking-[0.25em] uppercase text-white/70">{EVENTO.organizador} presenta</p>
              <h1 className="mt-4 text-4xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] text-balance">{EVENTO.nombre}</h1>
            </>
          )}
          <p className="mt-2 text-xl sm:text-2xl font-medium text-white/85">{EVENTO.edicion}</p>
          <p className="mt-5 max-w-xl mx-auto text-base sm:text-lg text-white/80 text-pretty">{EVENTO.lema}</p>

          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm sm:text-base font-semibold">
            <span className="inline-flex items-center gap-2">
              <Calendar className="w-4 h-4 text-white/70" />
              {EVENTO.fechaTexto}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock className="w-4 h-4 text-white/70" />
              {EVENTO.horaTexto}
            </span>
            {EVENTO.mapaUrl ? (
              <a href={EVENTO.mapaUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 underline underline-offset-4">
                <MapPin className="w-4 h-4 text-white/70" />
                {EVENTO.lugar}, {EVENTO.ciudad}
              </a>
            ) : (
              <span className="inline-flex items-center gap-2">
                <MapPin className="w-4 h-4 text-white/70" />
                {EVENTO.lugar}, {EVENTO.ciudad}
              </span>
            )}
          </div>

          {/* Cuenta regresiva */}
          {!done && (
            <div className="mt-10 flex justify-center gap-2 sm:gap-4" aria-label="Cuenta regresiva">
              {parts.map(([label, value]) => (
                <div key={label} className="w-[72px] sm:w-24 rounded-2xl bg-white/10 border border-white/15 py-3">
                  <span className="block text-2xl sm:text-4xl font-extrabold tabular-nums">{String(value).padStart(2, '0')}</span>
                  <span className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-white/70">{label}</span>
                </div>
              ))}
            </div>
          )}

          <a
            href="#entradas"
            className="mt-10 inline-flex items-center gap-2 min-h-[52px] px-8 rounded-full bg-white text-marca-oscuro font-bold text-base hover:bg-suave"
          >
            Comprar entradas
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* ---------- Sobre el evento ---------- */}
      <section className="max-w-3xl mx-auto px-4 pt-16 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-oscuro">Sobre el evento</h2>
        <p className="mt-4 text-base sm:text-lg text-gray-600 text-pretty">{EVENTO.descripcion}</p>
      </section>

      {/* ---------- Entradas y precios ---------- */}
      <section id="entradas" className="scroll-mt-20 max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-oscuro text-center">Entradas</h2>
        <p className="mt-2 text-center text-gray-600">{ASIENTOS_NUMERADOS ? 'Elige tus asientos en el mapa.' : 'Elige cuántas entradas quieres y paga por Pago Móvil.'}</p>

        <div className="mt-10 grid gap-5 max-w-md mx-auto">
          {(Object.keys(ENTRADAS) as PackageType[]).map((pkg) => {
            const e = ENTRADAS[pkg];
            return (
              <article
                key={pkg}
                className={`relative flex flex-col rounded-3xl border p-6 sm:p-8 border-gray-200 bg-white`}
              >
                <span className={`self-start rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider bg-suave text-marca-oscuro`}>
                  Entrada {pkg}
                </span>
                <p className="mt-5 flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold text-oscuro tabular-nums">${e.precio}</span>
                  <span className="text-sm font-semibold text-gray-500">≈ Bs. {formatBs(e.precio * bcvRate)}</span>
                </p>
                <p className="mt-3 text-gray-600">{e.descripcion}</p>
                <ul className="mt-5 space-y-2 flex-1">
                  {e.beneficios.map((b) => (
                    <li key={b} className="flex gap-2 text-sm font-medium text-gray-700">
                      <Check className="w-4 h-4 mt-0.5 shrink-0 text-marca" />
                      {b}
                    </li>
                  ))}
                </ul>
                {ASIENTOS_NUMERADOS ? (
                  <button
                    type="button"
                    onClick={() => onSelectPackage(pkg)}
                    className="mt-7 w-full min-h-[52px] rounded-full bg-marca hover:bg-marca-oscuro text-white font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Elegir asientos
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : maximo === 0 ? (
                  <p className="mt-7 w-full min-h-[52px] rounded-full bg-gray-100 text-gray-500 font-bold inline-flex items-center justify-center">Agotado</p>
                ) : (
                  <>
                    <div className="mt-7 flex items-center justify-between gap-3">
                      <span className="text-sm font-bold text-oscuro">Cantidad</span>
                      <div className="inline-flex items-center gap-1 rounded-full border border-gray-200 p-1">
                        <button
                          type="button"
                          aria-label="Una entrada menos"
                          disabled={cantidad <= 1}
                          onClick={() => setCantidad((n) => Math.max(1, n - 1))}
                          className="w-10 h-10 rounded-full bg-suave text-marca-oscuro grid place-items-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-10 text-center text-lg font-extrabold text-oscuro tabular-nums" aria-live="polite">
                          {Math.min(cantidad, maximo)}
                        </span>
                        <button
                          type="button"
                          aria-label="Una entrada más"
                          disabled={cantidad >= maximo}
                          onClick={() => setCantidad((n) => Math.min(maximo, n + 1))}
                          className="w-10 h-10 rounded-full bg-suave text-marca-oscuro grid place-items-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {disponibles <= 20 && <p className="mt-2 text-right text-xs font-semibold text-marca">Quedan {disponibles} entradas</p>}
                    <button
                      type="button"
                      onClick={() => onBuyQuantity(Math.min(cantidad, maximo))}
                      className="mt-4 w-full min-h-[52px] rounded-full bg-marca hover:bg-marca-oscuro text-white font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      Comprar · ${e.precio * Math.min(cantidad, maximo)}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </article>
            );
          })}
        </div>
        <p className="mt-4 text-center text-xs text-gray-500">Precio en bolívares según la tasa BCV del día ({formatBs(bcvRate)} Bs/$).</p>
      </section>
    </>
  );
};
