import React from 'react';
import { ChevronLeft, ArrowRight } from 'lucide-react';
import { PackageType, SelectedSeat } from '../types';
import { MAPA } from '../config';
import { calcularMontos, Tasas } from '../utils/montos';
import { formatBs } from '../utils/exchangeRate';

interface SeatMapProps {
  selectedSeats: SelectedSeat[];
  activePackage: PackageType;
  onChangePackage: (pkg: PackageType) => void;
  onToggleSeat: (seatId: string, fila: string, num: number) => void;
  onProceedToCheckout: () => void;
  onBackToHome: () => void;
  blockedSeatIds: string[];
  tasas: Tasas;
}

type SeatState = 'available' | 'selected' | 'blocked';

/** Butaca de teatro en SVG: libre (contorno), seleccionada (marca) u ocupada (gris). */
export const TheaterSeat = React.memo<{ num?: number; state: SeatState }>(({ num, state }) => {
  const c =
    state === 'selected'
      ? { fill: 'var(--marca)', stroke: 'var(--marca-oscuro)', text: '#FFFFFF' }
      : state === 'blocked'
        ? { fill: '#D1D5DB', stroke: '#9CA3AF', text: '#6B7280' }
        : { fill: '#FFFFFF', stroke: 'color-mix(in oklab, var(--marca) 55%, white)', text: 'var(--marca-oscuro)' };
  return (
    <svg viewBox="0 0 32 36" className="w-full h-full" fill="none" aria-hidden="true">
      <path d="M 6 5.5 C 6 2.5 8.5 0.75 16 0.75 C 23.5 0.75 26 2.5 26 5.5 L 26 19 C 26 20 24.5 21 22 21 L 10 21 C 7.5 21 6 20 6 19 Z" fill={c.fill} stroke={c.stroke} strokeWidth="1.2" />
      <rect x="1" y="10.5" width="3.5" height="16" rx="1.75" fill={c.fill} stroke={c.stroke} strokeWidth="1" />
      <rect x="27.5" y="10.5" width="3.5" height="16" rx="1.75" fill={c.fill} stroke={c.stroke} strokeWidth="1" />
      <rect x="5" y="13" width="22" height="18" rx="4" fill={c.fill} stroke={c.stroke} strokeWidth="1.4" />
      {num !== undefined && (
        <text x="16" y="25.5" textAnchor="middle" fill={c.text} fontSize="10.5" fontWeight="800" fontFamily="Jost, sans-serif">
          {num}
        </text>
      )}
    </svg>
  );
});

export const SeatMap: React.FC<SeatMapProps> = ({
  selectedSeats,
  onToggleSeat,
  onProceedToCheckout,
  onBackToHome,
  blockedSeatIds,
  tasas,
}) => {
  const selected = React.useMemo(() => new Set(selectedSeats.map((s) => s.id)), [selectedSeats]);
  const blocked = React.useMemo(() => new Set(blockedSeatIds), [blockedSeatIds]);
  const montos = calcularMontos(selectedSeats, tasas);

  return (
    <div className="pb-36 bg-suave min-h-screen">
      <div className="max-w-5xl mx-auto px-4 pt-6 pb-4 space-y-4">
        <button type="button" onClick={onBackToHome} className="inline-flex items-center gap-1 text-sm font-semibold text-marca-oscuro cursor-pointer">
          <ChevronLeft className="w-4 h-4" />
          Volver
        </button>
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-oscuro">Elige tu asiento</h1>
          <div className="flex justify-center gap-5 text-sm font-medium text-gray-700">
            {(
              [
                ['available', 'Disponible'],
                ['selected', 'Tu selección'],
                ['blocked', 'Ocupado'],
              ] as [SeatState, string][]
            ).map(([state, label]) => (
              <span key={state} className="inline-flex items-center gap-1.5">
                <span className="w-5 h-6">
                  <TheaterSeat state={state} />
                </span>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-2 sm:px-4">
        <div className="rounded-3xl bg-white px-2 sm:px-6 py-6 sm:py-8 shadow-sm">
          <div className="mb-10 mx-auto max-w-lg rounded-xl bg-oscuro text-white text-center py-3 text-sm sm:text-base font-bold tracking-[0.2em]">{MAPA.escenario}</div>
          <div className="overflow-x-auto pb-2">
            <div className="min-w-fit mx-auto space-y-10">
              {MAPA.secciones.map((sec) => {
                const aforo = sec.filas.reduce((n, r) => n + r.c, 0);
                return (
                  <section key={sec.nombre} className="space-y-3">
                    <div className="flex items-center justify-between border-b-2 border-marca pb-1.5">
                      <h2 className="font-bold text-sm uppercase tracking-wider text-marca-oscuro">{sec.nombre}</h2>
                      <span className="text-xs font-semibold text-gray-500">{aforo} asientos</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                      {sec.filas.map((row) => (
                        <div key={row.f} className="flex items-center gap-1 sm:gap-1.5">
                          <span className="w-4 sm:w-5 text-center text-xs font-bold text-marca-oscuro">{row.f}</span>
                          <div className="flex gap-[2px] sm:gap-1">
                            {Array.from({ length: row.c }, (_, i) => {
                              const num = i + 1;
                              const id = `${row.f}-${num}`;
                              const isBlocked = blocked.has(id);
                              const isSel = selected.has(id);
                              return (
                                <button
                                  key={id}
                                  type="button"
                                  disabled={isBlocked}
                                  onClick={() => onToggleSeat(id, row.f, num)}
                                  aria-pressed={isSel}
                                  aria-label={`Asiento ${id}${isBlocked ? ', ocupado' : isSel ? ', seleccionado' : ''}`}
                                  className={`w-[21px] h-[24px] sm:w-8 sm:h-9 p-0 transition-transform ${isBlocked ? 'cursor-not-allowed' : 'cursor-pointer hover:-translate-y-0.5'} ${isSel ? '-translate-y-0.5' : ''}`}
                                >
                                  <TheaterSeat num={num} state={isBlocked ? 'blocked' : isSel ? 'selected' : 'available'} />
                                </button>
                              );
                            })}
                          </div>
                          <span className="w-4 sm:w-5 text-center text-xs font-bold text-marca-oscuro">{row.f}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Barra inferior con el resumen */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-oscuro text-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(0,0,0,0.25)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-bold leading-tight">
              {selectedSeats.length} {selectedSeats.length === 1 ? 'asiento' : 'asientos'}
              {selectedSeats.length > 0 && <span className="ml-2 tabular-nums">€{montos.eur}</span>}
            </p>
            {selectedSeats.length > 0 && <p className="text-sm font-semibold text-white/80 tabular-nums whitespace-nowrap">Bs. {formatBs(montos.bs)}{montos.usd > 0 && ` · $${montos.usd.toFixed(2)}`}</p>}
            {selectedSeats.length > 0 && <p className="text-xs text-white/70 truncate">{selectedSeats.map((s) => `${s.id} (${s.pkg})`).join(', ')}</p>}
          </div>
          <button
            type="button"
            onClick={onProceedToCheckout}
            disabled={selectedSeats.length === 0}
            className="shrink-0 min-h-[48px] px-5 sm:px-7 rounded-full bg-white text-marca-oscuro font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continuar
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
