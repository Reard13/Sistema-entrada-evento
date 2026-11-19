import React, { useEffect, useRef, useState } from 'react';
import { Calendar, MapPin, Check, ArrowRight, Minus, Plus, ChevronDown } from 'lucide-react';
import { ASIENTOS_NUMERADOS, EVENTO, ENTRADAS, INSTAGRAM_URL, MAX_POR_COMPRA, METODOS_PAGO, TERMINOS } from '../config';
import { PackageType } from '../types';
import { formatBs } from '../utils/exchangeRate';

interface Props {
  bcvRate: number;
  onSelectPackage: (pkg: PackageType) => void;
  // Sin asientos numerados: comprar una cantidad de entradas
  onBuyQuantity: (cantidad: number) => void;
  onOpenLookup: () => void;
  disponibles: number;
  // true mientras la ventana de pago está abierta (el boleto vuelve a unirse al cerrarla)
  compraAbierta: boolean;
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

// Cada mención de «Sanremo Sin Fronteras» en el texto lleva a su Instagram
const NOMBRE_ORGANIZADOR = 'Sanremo Sin Fronteras';
const conEnlace = (texto: string): React.ReactNode[] => {
  if (!INSTAGRAM_URL) return [texto];
  return texto.split(NOMBRE_ORGANIZADOR).flatMap((parte, i, partes) =>
    i < partes.length - 1
      ? [
          parte,
          <a key={`ig-${i}`} href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-marca-oscuro">
            {NOMBRE_ORGANIZADOR}
          </a>,
        ]
      : [parte]
  );
};

// Etiqueta pequeña en mayúsculas con letras separadas
const Eyebrow: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <span className={`text-xs sm:text-[13px] font-semibold tracking-[0.28em] uppercase ${className}`}>{children}</span>
);

// Lista legible de los métodos activos: «Pago Móvil o Transferencia bancaria»
const nombresMetodos = (() => {
  const n = METODOS_PAGO.filter((m) => m.activo).map((m) => m.nombre);
  return n.length > 1 ? `${n.slice(0, -1).join(', ')} o ${n[n.length - 1]}` : n[0] ?? '';
})();

/**
 * Boleto que se corta: al comprar, el talón (lado de la compra) se desprende por la línea
 * perforada y se esconde detrás del boleto; al cerrar el pago vuelve a su lugar.
 * Con «reducir movimiento» activado no hay animación.
 */
function useTear(compraAbierta: boolean) {
  const stubRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const anim = useRef<Animation | null>(null);
  const abierta = useRef(compraAbierta);

  const restore = () => {
    const a = anim.current;
    if (!a) return;
    anim.current = null;
    a.reverse();
    a.onfinish = () => a.cancel();
  };

  // Al cerrar el pago, el talón vuelve
  useEffect(() => {
    if (abierta.current && !compraAbierta) restore();
    abierta.current = compraAbierta;
  }, [compraAbierta]);

  const tear = (then: () => void) => {
    const stub = stubRef.current;
    const body = bodyRef.current;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!stub || !body || reduce || !stub.animate) return then();
    // Si el talón está debajo (teléfono) se esconde hacia arriba; si está al lado, hacia la izquierda
    const vertical = stub.offsetTop > body.offsetTop + 10;
    const away = vertical ? 'translateY(14px) rotate(2.5deg)' : 'translateX(14px) rotate(3deg)';
    const behind = vertical ? 'translateY(-70%) rotate(-1.5deg) scale(0.94)' : 'translateX(-70%) rotate(-3deg) scale(0.94)';
    anim.current?.cancel();
    anim.current = stub.animate(
      [
        { transform: 'none', offset: 0 },
        { transform: away, offset: 0.28 },
        { transform: behind, offset: 1 },
      ],
      { duration: 560, easing: 'cubic-bezier(0.32, 0.72, 0, 1)', fill: 'forwards' }
    );
    window.setTimeout(then, 430);
    // Si la ventana de pago no llegó a abrirse (p. ej. agotado), el talón vuelve
    window.setTimeout(() => {
      if (!abierta.current) restore();
    }, 1600);
  };

  return { stubRef, bodyRef, tear };
}

export const HeroAndPackages: React.FC<Props> = ({ bcvRate, onSelectPackage, onBuyQuantity, onOpenLookup, disponibles, compraAbierta }) => {
  const { stubRef, bodyRef, tear } = useTear(compraAbierta);
  const [cantidad, setCantidad] = useState(1);
  const maximo = Math.max(0, Math.min(MAX_POR_COMPRA, disponibles));
  const cant = Math.max(1, Math.min(cantidad, maximo || 1));
  const { done, parts } = useCountdown(new Date(EVENTO.fechaISO).getTime());
  const precio = ENTRADAS.General.precio;
  const general = ENTRADAS.General;


  const pasos = [
    [ASIENTOS_NUMERADOS ? 'Elige tus asientos' : 'Elige tus entradas', 'El total aparece en dólares y en bolívares a la tasa BCV del día.'],
    ['Paga y reporta', `Paga por ${nombresMetodos} y envía la referencia por WhatsApp desde la misma página.`],
    ['Recibe tu QR', 'Al verificar el pago, tu entrada con código QR queda lista en «Mi boleto».'],
  ];

  return (
    <>
      {/* ---------- Portada ---------- */}
      <section
        className={`${EVENTO.fotoPortada ? 'hero-foto' : 'hero-bg'} text-crema`}
        style={EVENTO.fotoPortada ? ({ '--hero-foto': `url(${EVENTO.fotoPortada})` } as React.CSSProperties) : undefined}
      >
        <div className="max-w-5xl mx-auto px-4 pt-8 pb-12 sm:pt-20 sm:pb-24 flex flex-col items-center text-center gap-5 sm:gap-7">
          {EVENTO.logoMarca && (
            // En el teléfono el logo ya está en la barra superior: aquí solo en pantallas grandes
            <div className="flex flex-col items-center gap-1">
              {INSTAGRAM_URL ? (
                <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" aria-label={`${EVENTO.organizador} en Instagram`} className="rounded-lg">
                  <img src={EVENTO.logoMarca} alt={EVENTO.organizador} className="w-32 sm:w-48 h-auto" />
                </a>
              ) : (
                <img src={EVENTO.logoMarca} alt={EVENTO.organizador} className="w-32 sm:w-48 h-auto" />
              )}
              <Eyebrow className="text-tenue">presenta</Eyebrow>
            </div>
          )}

          {EVENTO.logoTitulo ? (
            <h1 className="w-full max-w-4xl">
              {INSTAGRAM_URL ? (
                <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" aria-label={`${EVENTO.nombre}: ver en Instagram`} className="block rounded-lg">
                  <img src={EVENTO.logoTitulo} alt={EVENTO.nombre} className="block w-full h-auto drop-shadow-[0_4px_18px_rgba(0,0,0,0.55)]" />
                </a>
              ) : (
                <img src={EVENTO.logoTitulo} alt={EVENTO.nombre} className="block w-full h-auto drop-shadow-[0_4px_18px_rgba(0,0,0,0.55)]" />
              )}
            </h1>
          ) : (
            <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] text-balance">{EVENTO.nombre}</h1>
          )}

          <p className="max-w-2xl font-display italic font-medium text-[15px] sm:text-lg sm:text-2xl leading-relaxed text-crema/90 whitespace-nowrap sm:whitespace-normal sm:text-pretty">{EVENTO.lema}</p>

          {/* Fecha, hora y lugar — teléfono: dos líneas compactas */}
          <div className="sm:hidden flex flex-col items-center gap-1.5 text-[15px] font-medium">
            <span className="inline-flex items-center gap-2">
              <Calendar className="w-4 h-4 text-oro" aria-hidden="true" />
              {EVENTO.fechaTexto} · {EVENTO.horaTexto}
            </span>
            {EVENTO.mapaUrl ? (
              <a href={EVENTO.mapaUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-oro underline underline-offset-4">
                <MapPin className="w-4 h-4" aria-hidden="true" />
                {EVENTO.lugar}
              </a>
            ) : (
              <span className="inline-flex items-center gap-2">
                <MapPin className="w-4 h-4 text-oro" aria-hidden="true" />
                {EVENTO.lugar}
              </span>
            )}
          </div>

          {/* Fecha, hora y lugar — pantallas grandes: franja con líneas finas */}
          <div className="hidden sm:flex flex-wrap justify-center border-y border-oro/25">
            <div className="px-8 py-4 flex flex-col gap-1 text-center">
              <Eyebrow className="text-tenue !text-[11px] sm:!text-xs">Fecha</Eyebrow>
              <span className="text-base sm:text-lg font-medium">{EVENTO.fechaTexto}</span>
            </div>
            <div className="px-8 py-4 flex flex-col gap-1 text-center border-l border-oro/25">
              <Eyebrow className="text-tenue !text-[11px] sm:!text-xs">Hora</Eyebrow>
              <span className="text-base sm:text-lg font-medium">{EVENTO.horaTexto}</span>
            </div>
            <div className="px-8 py-4 flex flex-col gap-1 text-center border-l border-oro/25">
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
            <div className="flex justify-center gap-5 sm:gap-8" aria-label="Cuenta regresiva">
              {parts.map(([label, value]) => (
                <div key={label} className="min-w-[48px] sm:min-w-[72px] flex flex-col items-center gap-1">
                  <span className="font-display font-bold text-3xl sm:text-5xl leading-none text-white tabular-nums">{String(value).padStart(2, '0')}</span>
                  <Eyebrow className="text-tenue !text-[11px] sm:!text-xs !tracking-[0.2em]">{label}</Eyebrow>
                </div>
              ))}
            </div>
          )}

          <div className="w-full sm:w-auto flex flex-col sm:flex-row justify-center gap-2.5 sm:gap-3 sm:pt-2">
            <a
              id="hero-cta"
              href="#entradas"
              className="inline-flex items-center justify-center gap-2 min-h-[56px] px-9 rounded-full bg-marca hover:bg-marca-oscuro text-white font-semibold text-base sm:text-lg"
            >
              Comprar entradas · ${precio}
              <ArrowRight className="w-5 h-5" />
            </a>
            <button
              type="button"
              onClick={onOpenLookup}
              className="inline-flex items-center justify-center min-h-[48px] sm:min-h-[56px] px-7 rounded-full border border-crema/40 hover:bg-white/10 text-crema font-medium text-base sm:text-lg cursor-pointer"
            >
              Consultar mi boleto
            </button>
          </div>
        </div>
      </section>

      {/* ---------- Entradas ---------- */}
      <section id="entradas" className="scroll-mt-20 bg-oscuro text-crema px-4 pt-6 pb-16 sm:pt-12 sm:pb-24">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-10">
          <div className="flex flex-col items-center gap-3 text-center">
            <Eyebrow className="text-oro">Entradas</Eyebrow>
            <h2 className="font-display font-bold text-3xl sm:text-5xl leading-tight">Reserva tu lugar</h2>
            <p className="text-base sm:text-lg text-tenue text-pretty">
              {ASIENTOS_NUMERADOS ? 'Elige tus asientos en el mapa.' : 'Acceso general, sin asiento asignado. Cada entrada lleva su propio código QR.'}
            </p>
          </div>

          <div className="relative isolate w-full flex flex-col md:flex-row text-[#1A1F1B] rounded-3xl overflow-hidden">
            {/* Lado del precio */}
            <div ref={bodyRef} className="relative z-10 bg-crema flex-1 min-w-0 p-6 sm:p-10 flex flex-col gap-5 border-b-2 md:border-b-0 md:border-r-2 border-dashed border-[#CFCABF]">
              {/* Muescas del ticket en los extremos de la línea perforada (del color del fondo de la sección) */}
              <span aria-hidden="true" className="absolute w-8 h-8 rounded-full bg-oscuro -left-4 -bottom-4 md:left-auto md:-right-4 md:-top-4 md:bottom-auto" />
              <span aria-hidden="true" className="absolute w-8 h-8 rounded-full bg-oscuro -right-4 -bottom-4" />

              {/* Encabezado del ticket */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#DDD7CB]">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-[11px] sm:text-xs font-semibold tracking-[0.24em] uppercase text-cafe">Tu entrada</span>
                  {INSTAGRAM_URL ? (
                    <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="font-display font-bold text-xl sm:text-2xl leading-tight text-oscuro text-balance hover:underline underline-offset-4">
                      {EVENTO.nombre}
                    </a>
                  ) : (
                    <span className="font-display font-bold text-xl sm:text-2xl leading-tight text-oscuro text-balance">{EVENTO.nombre}</span>
                  )}
                </div>
              </div>
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
                  Pago por {nombresMetodos}
                </li>
              </ul>
            </div>

            {/* Lado de la compra */}
            <div ref={stubRef} className="relative z-0 will-change-transform md:w-[340px] md:shrink-0 min-w-0 px-5 py-4 sm:p-10 flex flex-col justify-center gap-3 sm:gap-5 bg-white">
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
                    <span className="text-sm sm:text-base font-semibold">Cantidad</span>
                    <div className="inline-flex items-center gap-1 rounded-full border border-linea p-1">
                      <button
                        type="button"
                        aria-label="Una entrada menos"
                        disabled={cant <= 1}
                        onClick={() => setCantidad(Math.max(1, cant - 1))}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-crema text-marca-oscuro grid place-items-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-10 sm:w-11 text-center font-display font-bold text-xl sm:text-2xl tabular-nums" aria-live="polite">
                        {cant}
                      </span>
                      <button
                        type="button"
                        aria-label="Una entrada más"
                        disabled={cant >= maximo}
                        onClick={() => setCantidad(Math.min(maximo, cant + 1))}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-crema text-marca-oscuro grid place-items-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {disponibles <= 20 && <p className="-mt-2 text-right text-sm font-semibold text-marca">Quedan {disponibles} entradas</p>}
                  <div className="flex items-baseline justify-between pt-3 sm:pt-4 border-t border-[#ECE7DD]">
                    <span className="text-sm tracking-[0.16em] uppercase text-cafe">Total</span>
                    <span className="text-right">
                      <span className="block font-display font-bold text-3xl sm:text-4xl text-oscuro tabular-nums">${precio * cant}</span>
                      <span className="block text-sm font-medium text-cafe">Bs. {formatBs(precio * cant * bcvRate)}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => tear(() => onBuyQuantity(cant))}
                    className="min-h-[50px] sm:min-h-[56px] rounded-full bg-marca hover:bg-marca-oscuro text-white font-semibold text-base sm:text-lg inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Continuar al pago
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </>
              )}
              {/* Código de barras decorativo del talón */}
              <div aria-hidden="true" className="hidden md:block mt-1 h-10 rounded-sm opacity-80 [background:repeating-linear-gradient(90deg,#0b100d_0_2px,transparent_2px_4px,#0b100d_4px_5px,transparent_5px_9px,#0b100d_9px_12px,transparent_12px_14px)]" />
            </div>
          </div>
          <p className="-mt-4 text-center text-xs sm:text-sm text-tenue">Precio en bolívares según la tasa BCV del día ({formatBs(bcvRate)} Bs/$).</p>

          {/* Cómo comprar: pasos junto a la compra */}
          <div className="w-full pt-6 sm:pt-8 border-t border-oro/15 flex flex-col gap-6">
            <h3 className="text-center font-display font-bold text-2xl sm:text-3xl">Cómo comprar</h3>
            <ol className="grid gap-5 sm:gap-8 sm:grid-cols-3">
              {pasos.map(([titulo, texto], i) => (
                <li key={titulo} className="flex gap-4">
                  <span className="shrink-0 w-11 h-11 rounded-full border border-oro/40 grid place-items-center font-display font-bold text-xl text-oro" aria-hidden="true">
                    {i + 1}
                  </span>
                  <div className="flex flex-col gap-1">
                    <span className="text-base sm:text-lg font-semibold">{titulo}</span>
                    <span className="text-[15px] leading-relaxed text-tenue">{texto}</span>
                  </div>
                </li>
              ))}
            </ol>
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
              {conEnlace('Interpretadas por el elenco de Sanremo Sin Fronteras.')}
            </p>
            <div className="w-full aspect-[16/9] overflow-hidden rounded-2xl">
              <img
                src={EVENTO.fotoPortada}
                alt="Vitral y altar de la Iglesia Prados del Este"
                className="w-full h-full object-cover"
                style={{ objectPosition: '62% 30%' }}
                loading="lazy"
              />
            </div>
          </div>
          <div className="flex-[1_1_320px] min-w-0 bg-white border border-linea rounded-[20px] p-6 sm:p-7 flex flex-col gap-4">
            <span className="text-marca" aria-hidden="true"><MapPin className="w-8 h-8" strokeWidth={1.6} /></span>
            <div className="flex flex-col gap-1">
              <span className="text-[13px] tracking-[0.16em] uppercase text-cafe">El lugar</span>
              <span className="text-xl font-semibold">{EVENTO.lugar}</span>
              <span className="text-base text-[#4A4640]">{EVENTO.ciudad}</span>
            </div>
            {EVENTO.mapaUrl && (
              <a
                href={EVENTO.mapaUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center justify-center gap-2 min-h-[48px] rounded-full border border-marca text-marca font-semibold hover:bg-marca hover:text-white"
              >
                Cómo llegar
                <ArrowRight className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ---------- Preguntas frecuentes (de los términos del evento) ---------- */}
      <section className="bg-white text-[#1A1F1B] px-4 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto flex flex-col gap-8">
          <h2 className="text-center font-display font-bold text-3xl sm:text-4xl text-oscuro">Antes de ir</h2>
          <div className="flex flex-col divide-y divide-linea border-y border-linea">
            {TERMINOS.map((t) => (
              <details key={t.titulo} className="group">
                <summary className="list-none flex items-center justify-between gap-4 min-h-[60px] py-4 cursor-pointer text-lg font-semibold [&::-webkit-details-marker]:hidden">
                  {t.titulo}
                  <ChevronDown className="w-5 h-5 shrink-0 text-marca transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
                </summary>
                <ul className="pb-5 -mt-1 flex flex-col gap-2 text-base leading-relaxed text-[#4A4640]">
                  {t.puntos.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </details>
            ))}
            <details className="group">
              <summary className="list-none flex items-center justify-between gap-4 min-h-[60px] py-4 cursor-pointer text-lg font-semibold [&::-webkit-details-marker]:hidden">
                ¿No guardaste tu entrada?
                <ChevronDown className="w-5 h-5 shrink-0 text-marca transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
              </summary>
              <div className="pb-5 -mt-1 flex flex-col gap-4 text-base leading-relaxed text-[#4A4640]">
                <p>Puedes volver a buscarla cuando quieras, mientras el pago esté aprobado.</p>
                <ol className="flex flex-col gap-3 list-decimal list-inside marker:font-bold marker:text-marca-oscuro">
                  <li>
                    Toca <strong className="text-oscuro">Consultar Mi Boleto</strong> en la barra de arriba (en el teléfono, <strong className="text-oscuro">Mi boleto</strong>).
                  </li>
                  <li>
                    Escribe tu <strong className="text-oscuro">localizador</strong> (el código que enviaste por WhatsApp) o el <strong className="text-oscuro">teléfono</strong> con el que compraste.
                  </li>
                  <li>
                    Toca tu compra y luego <strong className="text-oscuro">Guardar entrada</strong>. En el teléfono se abre el menú para guardarla en Fotos o Galería.
                  </li>
                </ol>
                <p className="text-sm text-gray-600">Si dice «Pago en revisión», la entrada aparecerá ahí en cuanto el organizador apruebe el pago.</p>
              </div>
            </details>
          </div>
        </div>
      </section>
    </>
  );
};
