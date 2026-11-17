import React from 'react';
import { Timer, AlertCircle } from 'lucide-react';

interface HoldingTimerProps {
  secondsLeft: number;
  totalSeconds: number;
}

export const HoldingTimerBanner: React.FC<HoldingTimerProps> = ({ secondsLeft, totalSeconds }) => {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const percentage = Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100));
  const isUrgent = secondsLeft < 180; // Under 3 minutes

  if (secondsLeft <= 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-xs flex items-center gap-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
        <span>El tiempo de reserva ha expirado. Por favor vuelve a seleccionar tus asientos para garantizar disponibilidad.</span>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border px-3.5 py-2.5 transition-colors ${
      isUrgent
        ? 'bg-amber-50 border-amber-300 text-amber-900'
        : 'bg-suave border-marca/20 text-marca'
    }`}>
      <div className="flex items-center justify-between gap-3 text-[13px] font-semibold">
        <div className="flex items-center gap-2 min-w-0">
          <Timer className={`w-4 h-4 shrink-0 ${isUrgent ? 'animate-pulse' : ''}`} />
          <span className="truncate">
            {isUrgent ? '¡Tu reserva está por expirar!' : 'Asientos apartados para ti'}
          </span>
        </div>
        <div className={`font-mono text-sm font-extrabold px-2.5 py-0.5 rounded-full shrink-0 ${
          isUrgent ? 'bg-amber-500 text-white' : 'bg-marca text-white'
        }`}>
          {formattedTime}
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="w-full bg-marca/15 rounded-full h-1 overflow-hidden mt-2">
        <div
          className={`h-full transition-all duration-1000 ${
            isUrgent ? 'bg-amber-500' : 'bg-marca'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
